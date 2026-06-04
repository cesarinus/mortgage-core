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
const PLATFORM_ALIASES: Record<string, string> = {
  fb: "facebook", ig: "instagram", li: "linkedin", x: "twitter", tw: "twitter", yt: "youtube", tt: "tiktok",
};

// Parse Discord message content. Supports either:
//   "platform: facebook\ncaption text here #tag1 #tag2"
// or just free text (defaults to facebook).
function parseContent(raw: string) {
  const text = (raw || "").trim();
  let platform = "facebook";
  let body = text;

  const m = text.match(/^\s*(?:platform\s*[:=]\s*)?([a-z]{2,12})\s*[\n:|-]\s*([\s\S]+)$/i);
  if (m) {
    const candidate = m[1].toLowerCase();
    const resolved = PLATFORM_ALIASES[candidate] || candidate;
    if (PLATFORMS.has(resolved)) {
      platform = resolved;
      body = m[2].trim();
    }
  }

  const hashtags = Array.from(new Set(
    (body.match(/#[\w-]+/g) || []).map((h) => h.slice(1).toLowerCase()).filter(Boolean),
  )).slice(0, 30);

  const caption = body.replace(/#[\w-]+/g, "").replace(/\s+/g, " ").trim().slice(0, 5000);
  return { platform, caption, hashtags };
}

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
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const message_id = String(body.message_id || body.id || "").trim();
  if (!message_id) return json({ error: "message_id required" }, 400);

  const rawContent = typeof body.content === "string" ? body.content : "";
  const parsed = parseContent(rawContent);

  // explicit fields override parsed
  let platform = String(body.platform || parsed.platform).trim().toLowerCase();
  platform = PLATFORM_ALIASES[platform] || platform;
  if (!PLATFORMS.has(platform)) return json({ error: "Invalid platform" }, 400);

  const caption = (typeof body.caption === "string" ? body.caption : parsed.caption).trim().slice(0, 5000);
  if (!caption) return json({ error: "caption/content required" }, 400);

  let hashtags = parsed.hashtags;
  if (Array.isArray(body.hashtags)) {
    hashtags = body.hashtags
      .filter((h: unknown) => typeof h === "string")
      .map((h: string) => h.trim().replace(/^#+/, "").toLowerCase().slice(0, 100))
      .filter(Boolean)
      .slice(0, 30);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const row = {
    discord_message_id: message_id,
    platform,
    caption,
    hashtags,
    media_type: "text",
    status: "approved",
    approved_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("social_posts")
    .upsert(row, { onConflict: "discord_message_id", ignoreDuplicates: false })
    .select("id, status")
    .single();

  if (error) {
    console.error("social-approval-queue upsert error", error);
    return json({ error: "Upsert failed" }, 500);
  }

  return json({ success: true, id: data.id, status: data.status, deduped: true }, 200);
});