import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
    if (authErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.claims.sub)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const postId = typeof body.postId === "string" ? body.postId : null;
    let payload: Record<string, unknown> = {};

    if (postId) {
      const { data: post, error: postErr } = await admin
        .from("blog_posts")
        .select("id, slug, title, excerpt, meta_description, content_html, featured_image, tags, category, status")
        .eq("id", postId)
        .maybeSingle();
      if (postErr || !post) return json({ error: "Post not found" }, 404);
      payload = {
        url: `https://ngcapital.net/blog/${post.slug}`,
        type: body.type === "create" ? "create" : "update",
        title: post.title,
        excerpt: post.excerpt || post.meta_description || "",
        image: post.featured_image,
        content: post.content_html,
        changedFields: ["title", "content", "excerpt"],
        postId: post.id,
        tags: post.tags || [],
        category: post.category,
      };
    } else if (typeof body.url === "string") {
      payload = body;
    } else {
      return json({ error: "postId or url required" }, 400);
    }

    const PING_SECRET = Deno.env.get("PING_SECRET");
    if (!PING_SECRET) return json({ error: "PING_SECRET not configured" }, 500);

    const r = await fetch(`${supabaseUrl}/functions/v1/content-ping`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PING_SECRET}`,
        "x-trigger-source": "admin-button",
      },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    return json(data, r.status);
  } catch (e) {
    console.error("admin-trigger-ping error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});