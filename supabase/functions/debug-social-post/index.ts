import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function hasMetaToken(): boolean {
  return !!(Deno.env.get("META_PAGE_ACCESS_TOKEN") || Deno.env.get("META_ACCESS_TOKEN"));
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error } = await supabase.auth.getClaims(token);
    if (error || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { postId } = await req.json();
    if (!postId) {
      return new Response(JSON.stringify({ error: "postId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const steps: any[] = [];
    const log = (step: string, status: string, message?: string) =>
      steps.push({ step, status, message, timestamp: new Date().toISOString() });

    const { data: post, error: postErr } = await supabase
      .from("social_media_posts")
      .select("*")
      .eq("id", postId)
      .single();
    if (postErr || !post) {
      log("FETCH_POST", "fail", postErr?.message || "Post not found");
      return new Response(JSON.stringify({ steps }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log("FETCH_POST", "success", `Found post: ${post.post_type} on ${post.platform}`);

    if (!post.post_text || post.post_text.includes("[") || post.post_text.includes("{{")) {
      log("VALIDATE_TEMPLATE", "fail", "Unresolved placeholders or empty text");
    } else {
      log("VALIDATE_TEMPLATE", "success", `${post.post_text.length} chars`);
    }

    if (post.image_url) {
      try {
        const head = await fetch(post.image_url, { method: "HEAD" });
        log("IMAGE_REACHABLE", head.ok ? "success" : "fail", `HTTP ${head.status}`);
      } catch (e) {
        log("IMAGE_REACHABLE", "fail", e instanceof Error ? e.message : "fetch failed");
      }
    } else {
      log("IMAGE_REACHABLE", "skipped", "No image_url");
    }

    const targets = post.platform === "all" ? ["facebook", "instagram", "linkedin"] : [post.platform];
    for (const t of targets) {
      if (t === "facebook") {
        const ok = hasMetaToken() && !!Deno.env.get("META_PAGE_ID");
        log("FB_CREDENTIALS", ok ? "success" : "fail", ok ? "configured" : "missing META_PAGE_ACCESS_TOKEN or META_ACCESS_TOKEN, and META_PAGE_ID");
      } else if (t === "instagram") {
        const ok = hasMetaToken() && !!Deno.env.get("IG_BUSINESS_ACCOUNT_ID");
        log("IG_CREDENTIALS", ok ? "success" : "fail", ok ? "configured" : "missing META_PAGE_ACCESS_TOKEN or META_ACCESS_TOKEN, and IG_BUSINESS_ACCOUNT_ID");
      } else if (t === "linkedin") {
        const hasLinkedInAuth = !!(Deno.env.get("LINKEDIN_API_KEY") || Deno.env.get("LINKEDIN_ACCESS_TOKEN"));
        const ok = hasLinkedInAuth && !!Deno.env.get("LINKEDIN_ORG_URN");
        log("LI_CREDENTIALS", ok ? "success" : "fail", ok ? "configured" : "missing LinkedIn connector or LINKEDIN_ACCESS_TOKEN, and LINKEDIN_ORG_URN");
      }
    }

    return new Response(JSON.stringify({ post, steps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});