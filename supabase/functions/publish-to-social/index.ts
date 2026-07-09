import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * STUB: Publishes to Facebook, Instagram, LinkedIn.
 * Real publishing requires the following secrets to be configured:
 *   - META_ACCESS_TOKEN, META_PAGE_ID, IG_BUSINESS_ACCOUNT_ID
 *   - LINKEDIN_ACCESS_TOKEN, LINKEDIN_ORG_URN
 * When any secret is missing, the function returns a clear "not configured" error
 * for that platform but will not throw — letting the UI show partial results.
 */

async function publishFacebook(post: any): Promise<{ success: boolean; id?: string; error?: string }> {
  const token = Deno.env.get("META_ACCESS_TOKEN");
  const pageId = Deno.env.get("META_PAGE_ID");
  if (!token || !pageId) {
    return { success: false, error: "Facebook credentials not configured (META_ACCESS_TOKEN, META_PAGE_ID)" };
  }
  try {
    const fullText = `${post.post_text}\n\n${(post.hashtags || []).map((h: string) => h.startsWith("#") ? h : "#" + h).join(" ")}`;
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
    const data = await resp.json();
    if (!resp.ok) return { success: false, error: data?.error?.message || `HTTP ${resp.status}` };
    return { success: true, id: data.post_id || data.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

async function publishInstagram(post: any): Promise<{ success: boolean; id?: string; error?: string }> {
  const token = Deno.env.get("META_ACCESS_TOKEN");
  const igId = Deno.env.get("IG_BUSINESS_ACCOUNT_ID");
  if (!token || !igId) {
    return { success: false, error: "Instagram credentials not configured (META_ACCESS_TOKEN, IG_BUSINESS_ACCOUNT_ID)" };
  }
  if (!post.image_url) {
    return { success: false, error: "Instagram requires an image_url" };
  }
  try {
    const caption = `${post.post_text}\n\n${(post.hashtags || []).map((h: string) => h.startsWith("#") ? h : "#" + h).join(" ")}`;
    const create = await fetch(`https://graph.facebook.com/v20.0/${igId}/media`, {
      method: "POST",
      body: new URLSearchParams({ image_url: post.image_url, caption, access_token: token }),
    });
    const createData = await create.json();
    if (!create.ok) return { success: false, error: createData?.error?.message || `HTTP ${create.status}` };

    const publish = await fetch(`https://graph.facebook.com/v20.0/${igId}/media_publish`, {
      method: "POST",
      body: new URLSearchParams({ creation_id: createData.id, access_token: token }),
    });
    const pubData = await publish.json();
    if (!publish.ok) return { success: false, error: pubData?.error?.message || `HTTP ${publish.status}` };
    return { success: true, id: pubData.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

async function publishLinkedIn(post: any): Promise<{ success: boolean; id?: string; error?: string }> {
  const token = Deno.env.get("LINKEDIN_ACCESS_TOKEN");
  const orgUrn = Deno.env.get("LINKEDIN_ORG_URN");
  if (!token || !orgUrn) {
    return { success: false, error: "LinkedIn credentials not configured (LINKEDIN_ACCESS_TOKEN, LINKEDIN_ORG_URN)" };
  }
  try {
    const fullText = `${post.post_text}\n\n${(post.hashtags || []).map((h: string) => h.startsWith("#") ? h : "#" + h).join(" ")}`;
    const body = {
      author: orgUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: fullText },
          shareMediaCategory: post.image_url ? "IMAGE" : "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };
    const resp = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
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

    const targets: string[] = forcePlatform
      ? [forcePlatform]
      : post.platform === "all"
        ? ["facebook", "instagram", "linkedin"]
        : [post.platform];

    const results: Record<string, { success: boolean; id?: string; error?: string }> = {};
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