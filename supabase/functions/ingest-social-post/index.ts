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

const PLATFORMS = new Set(["facebook", "instagram", "linkedin", "twitter", "tiktok", "youtube"]);
const MEDIA_TYPES = new Set(["text", "image", "video", "carousel"]);
const STATUSES = new Set(["draft", "approved", "queued", "scheduled", "published"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const expected = Deno.env.get("N8N_INGEST_SECRET");
  if (!expected) {
    console.error("N8N_INGEST_SECRET not configured");
    return json({ error: "Server not configured" }, 500);
  }
  if ((req.headers.get("authorization") || "") !== `Bearer ${expected}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const platform = String(body.platform || "").trim().toLowerCase();
  if (!PLATFORMS.has(platform)) return json({ error: "Invalid platform" }, 400);

  const caption = typeof body.caption === "string" ? body.caption.trim().slice(0, 5000) : "";
  if (!caption) return json({ error: "caption required" }, 400);

  let hashtags: string[] = [];
  if (Array.isArray(body.hashtags)) {
    hashtags = body.hashtags
      .filter((h: unknown) => typeof h === "string")
      .map((h: string) => h.trim().replace(/^#+/, "").slice(0, 100))
      .filter(Boolean)
      .slice(0, 30);
  }

  const media_type = body.media_type ? String(body.media_type).toLowerCase() : "text";
  if (!MEDIA_TYPES.has(media_type)) return json({ error: "Invalid media_type" }, 400);

  const status = body.status ? String(body.status).toLowerCase() : "draft";
  if (!STATUSES.has(status)) return json({ error: "Invalid status" }, 400);

  let scheduled_for: string | null = null;
  if (body.scheduled_for) {
    const d = new Date(body.scheduled_for);
    if (isNaN(d.getTime())) return json({ error: "Invalid scheduled_for" }, 400);
    scheduled_for = d.toISOString();
  }

  const row: Record<string, unknown> = { platform, caption, hashtags, media_type, status };
  if (scheduled_for) row.scheduled_for = scheduled_for;
  if (status === "approved") row.approved_at = new Date().toISOString();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase
    .from("social_posts")
    .insert(row)
    .select("id, status")
    .single();

  if (error) {
    console.error("ingest-social-post insert error", error);
    return json({ error: "Insert failed" }, 500);
  }

  return json({ success: true, id: data.id, status: data.status }, 201);
});