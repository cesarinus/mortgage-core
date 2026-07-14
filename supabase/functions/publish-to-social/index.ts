import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type PublishResult = { success: boolean; id?: string; error?: string; skipped?: boolean };

type SocialSettings = {
  facebook_page_id?: string | null;
  instagram_business_id?: string | null;
  linkedin_org_urn?: string | null;
};

const META_PERMISSION_HELP =
  "Meta publishing credentials need a Page access token with pages_manage_posts, pages_read_engagement, and pages_show_list. Instagram also needs instagram_basic and instagram_content_publish. Regenerate the token without the deprecated publish_actions permission.";

async function parseProviderJson(resp: Response): Promise<any> {
  const text = await resp.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function formatMetaError(data: any, fallback: string): string {
  const err = data?.error;
  const message = err?.message || data?.error_message || data?.raw || fallback;
  const code = err?.code ? `#${err.code}` : "";
  const type = err?.type ? `${err.type}` : "";
  const prefix = [code, type].filter(Boolean).join(" ");

  if (/publish_actions/i.test(message)) {
    return `${prefix ? `${prefix}: ` : ""}${META_PERMISSION_HELP}`;
  }

  if (err?.code === 10 || /permission|permissions|not have permission/i.test(message)) {
    return `${prefix ? `${prefix}: ` : ""}${META_PERMISSION_HELP}`;
  }

  if (/media id is not available/i.test(message)) {
    return `Instagram did not create a publishable media container. Confirm the image URL is public HTTPS and the Meta token has instagram_content_publish. ${META_PERMISSION_HELP}`;
  }

  return `${prefix ? `${prefix}: ` : ""}${message}`;
}

function fullPostText(post: any): string {
  const tags = (post.hashtags || [])
    .map((h: string) => (h.startsWith("#") ? h : "#" + h))
    .join(" ");
  let body = (post.post_text || "").trim();
  const cta = post.cta_link;
  if (cta && !body.includes(cta)) {
    body = `${body}\n\n👉 Get Started: ${cta}`.trim();
  }
  return [body, tags].filter(Boolean).join("\n\n");
}

function getMetaAccessToken(): string | undefined {
  return Deno.env.get("META_PAGE_ACCESS_TOKEN") || Deno.env.get("META_ACCESS_TOKEN") || undefined;
}

function getFacebookPageId(post: any): string | undefined {
  return Deno.env.get("META_PAGE_ID") || post.social_settings?.facebook_page_id || undefined;
}

function getInstagramBusinessId(post: any): string | undefined {
  return Deno.env.get("IG_BUSINESS_ACCOUNT_ID") || post.social_settings?.instagram_business_id || undefined;
}

function getLinkedInOrgUrn(post: any): string | undefined {
  return Deno.env.get("LINKEDIN_ORG_URN") || post.social_settings?.linkedin_org_urn || undefined;
}

/**
 * Meta (Facebook/Instagram) and LinkedIn require a publicly fetchable HTTPS URL
 * for image posts. Base64 `data:` URIs are rejected with errors like
 * "url should represent a valid URL". If a post's image_url is a data URI,
 * upload the bytes to the private `social-images` bucket and swap in a signed
 * URL (7-day expiry, enough for scheduled posts + Meta re-scraping).
 */
async function ensurePublicImageUrl(
  admin: ReturnType<typeof createClient>,
  postId: string,
  imageUrl: string | null | undefined,
): Promise<string | null> {
  if (!imageUrl) return null;
  if (!imageUrl.startsWith("data:")) return imageUrl;

  const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Unsupported image_url format");
  const contentType = match[1] || "image/png";
  const b64 = match[2];
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const ext = contentType.split("/")[1]?.split("+")[0] || "png";
  const path = `posts/${postId}-${Date.now()}.${ext}`;

  const { error: upErr } = await admin.storage
    .from("social-images")
    .upload(path, bin, { contentType, upsert: true });
  if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

  const { data: signed, error: signErr } = await admin.storage
    .from("social-images")
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (signErr || !signed?.signedUrl) throw new Error(`Signed URL failed: ${signErr?.message}`);

  await admin
    .from("social_media_posts")
    .update({ image_url: signed.signedUrl, updated_at: new Date().toISOString() })
    .eq("id", postId);

  return signed.signedUrl;
}

/**
 * STUB: Publishes to Facebook, Instagram, LinkedIn.
 * Real publishing requires the following secrets to be configured:
 *   - META_PAGE_ACCESS_TOKEN (preferred) or META_ACCESS_TOKEN, META_PAGE_ID, IG_BUSINESS_ACCOUNT_ID
 *   - LinkedIn connector (preferred) or LINKEDIN_ACCESS_TOKEN, plus LINKEDIN_ORG_URN
 * When any secret is missing, the function returns a clear "not configured" error
 * for that platform but will not throw — letting the UI show partial results.
 */

async function publishFacebook(post: any): Promise<PublishResult> {
  const token = getMetaAccessToken();
  const pageId = getFacebookPageId(post);
  if (!token || !pageId) {
    return { success: false, error: "Facebook credentials not configured (META_PAGE_ACCESS_TOKEN or META_ACCESS_TOKEN, META_PAGE_ID)" };
  }
  try {
    const fullText = fullPostText(post);
    // If we have an image, post to /photos (image + caption). Otherwise post text to /feed.
    // Passing an image URL as `link` on /feed is invalid and returns "Invalid parameter".
    let endpoint: string;
    const params = new URLSearchParams({ access_token: token });
    if (post.image_url) {
      endpoint = `https://graph.facebook.com/v20.0/${pageId}/photos`;
      params.append("url", post.image_url);
      params.append("caption", fullText);
    } else {
      endpoint = `https://graph.facebook.com/v20.0/${pageId}/feed`;
      params.append("message", fullText);
      if (post.cta_link) params.append("link", post.cta_link);
    }
    const resp = await fetch(endpoint, { method: "POST", body: params });
    const data = await parseProviderJson(resp);
    if (!resp.ok || data?.error) return { success: false, error: formatMetaError(data, `HTTP ${resp.status}`) };
    return { success: true, id: data.post_id || data.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

async function publishInstagram(post: any): Promise<PublishResult> {
  const token = getMetaAccessToken();
  const igId = getInstagramBusinessId(post);
  if (!token || !igId) {
    return { success: false, error: "Instagram credentials not configured (META_PAGE_ACCESS_TOKEN or META_ACCESS_TOKEN, IG_BUSINESS_ACCOUNT_ID)" };
  }
  if (!post.image_url) {
    return { success: false, error: "Instagram requires an image_url" };
  }
  try {
    const caption = fullPostText(post);
    const create = await fetch(`https://graph.facebook.com/v20.0/${igId}/media`, {
      method: "POST",
      body: new URLSearchParams({ image_url: post.image_url, caption, access_token: token }),
    });
    const createData = await parseProviderJson(create);
    if (!create.ok || createData?.error) return { success: false, error: formatMetaError(createData, `HTTP ${create.status}`) };
    if (!createData?.id) {
      return { success: false, error: formatMetaError(createData, "Instagram did not return a media container ID") };
    }

    let mediaReady = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const statusResp = await fetch(
        `https://graph.facebook.com/v20.0/${createData.id}?fields=status_code,status&access_token=${encodeURIComponent(token)}`,
      );
      const statusData = await parseProviderJson(statusResp);
      if (!statusResp.ok || statusData?.error) {
        return { success: false, error: formatMetaError(statusData, `HTTP ${statusResp.status}`) };
      }
      if (statusData.status_code === "FINISHED") {
        mediaReady = true;
        break;
      }
      if (statusData.status_code === "ERROR" || statusData.status_code === "EXPIRED") {
        return { success: false, error: `Instagram media container failed: ${statusData.status || statusData.status_code}` };
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    if (!mediaReady) {
      return { success: false, error: "Instagram media container is still processing. Retry publishing in a few seconds." };
    }

    const publish = await fetch(`https://graph.facebook.com/v20.0/${igId}/media_publish`, {
      method: "POST",
      body: new URLSearchParams({ creation_id: createData.id, access_token: token }),
    });
    const pubData = await parseProviderJson(publish);
    if (!publish.ok || pubData?.error) return { success: false, error: formatMetaError(pubData, `HTTP ${publish.status}`) };
    return { success: true, id: pubData.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

async function publishLinkedIn(post: any): Promise<PublishResult> {
  const connectorKey = Deno.env.get("LINKEDIN_API_KEY");
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const token = Deno.env.get("LINKEDIN_ACCESS_TOKEN");
  const orgUrn = getLinkedInOrgUrn(post);
  if (!orgUrn) {
    return { success: false, skipped: true, error: "LinkedIn organization not configured (LINKEDIN_ORG_URN)" };
  }
  if (!connectorKey && !token) {
    return { success: false, skipped: true, error: "LinkedIn credentials not configured. Connect LinkedIn or add LINKEDIN_ACCESS_TOKEN." };
  }
  try {
    const fullText = fullPostText(post);
    const body = {
      author: orgUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: fullText },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };
    const useConnector = connectorKey && lovableApiKey;
    const resp = await fetch(useConnector ? "https://connector-gateway.lovable.dev/linkedin/v2/ugcPosts" : "https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: useConnector ? `Bearer ${lovableApiKey}` : `Bearer ${token}`,
        ...(useConnector ? { "X-Connection-Api-Key": connectorKey } : {}),
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      return { success: false, error: `HTTP ${resp.status}: ${txt}` };
    }
    const id = resp.headers.get("x-restli-id") || "";
    return { success: true, id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");
    const isServiceCall = token === serviceKey;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      isServiceCall ? serviceKey : Deno.env.get("SUPABASE_ANON_KEY")!,
      isServiceCall ? {} : { global: { headers: { Authorization: authHeader } } },
    );

    if (!isServiceCall) {
      const { data: userData, error } = await supabase.auth.getUser(token);
      if (error || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { postId, platform: forcePlatform } = await req.json();
    if (!postId) {
      return new Response(JSON.stringify({ error: "postId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const { data: post, error: postErr } = await adminClient
      .from("social_media_posts")
      .select("*")
      .eq("id", postId)
      .single();
    if (postErr || !post) throw new Error("Post not found");

    const { data: socialSettings } = await adminClient
      .from("social_account_settings")
      .select("facebook_page_id, instagram_business_id, linkedin_org_urn")
      .limit(1)
      .maybeSingle<SocialSettings>();
    post.social_settings = socialSettings || {};

    // Ensure image_url is a public/https URL that Meta/LinkedIn can fetch.
    if (post.image_url && post.image_url.startsWith("data:")) {
      post.image_url = await ensurePublicImageUrl(adminClient, postId, post.image_url);
    }

    const targets: string[] = forcePlatform
      ? [forcePlatform]
      : post.platform === "all"
        ? ["facebook", "instagram", "linkedin"]
        : [post.platform];

    const results: Record<string, PublishResult> = {};
    for (const t of targets) {
      if (t === "facebook") results.facebook = await publishFacebook(post);
      else if (t === "instagram") results.instagram = await publishInstagram(post);
      else if (t === "linkedin") results.linkedin = await publishLinkedIn(post);
    }

    const anySuccess = Object.values(results).some((r) => r.success);
    const updates: any = { updated_at: new Date().toISOString() };
    if (anySuccess) {
      updates.status = "published";
      updates.published_at = new Date().toISOString();
    } else {
      updates.status = "failed";
    }
    if (results.facebook?.id) updates.facebook_post_id = results.facebook.id;
    if (results.instagram?.id) updates.instagram_post_id = results.instagram.id;
    if (results.linkedin?.id) updates.linkedin_post_id = results.linkedin.id;

    await adminClient.from("social_media_posts").update(updates).eq("id", postId);

    return new Response(
      JSON.stringify({ success: anySuccess, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("publish-to-social error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});