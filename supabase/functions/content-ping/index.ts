import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trigger-source",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const mask = (s: string | undefined) =>
  !s ? "(missing)" : `${s.slice(0, 4)}…(${s.length})`;

const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6h per URL

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); })
     .catch((e) => { clearTimeout(t); reject(e); });
  });
}

async function pingomatic(url: string, title: string) {
  const xml = `<?xml version="1.0"?><methodCall><methodName>weblogUpdates.extendedPing</methodName><params><param><value><string>${escapeXml(title || "NexGen Capital")}</string></value></param><param><value><string>https://ngcapital.net</string></value></param><param><value><string>${escapeXml(url)}</string></value></param><param><value><string>${escapeXml(url)}</string></value></param></params></methodCall>`;
  const r = await withTimeout(fetch("https://rpc.pingomatic.com/", {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body: xml,
  }), 8000);
  return { ok: r.ok, status: r.status };
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

async function notifyWebhook(payload: Record<string, unknown>) {
  const url = Deno.env.get("AUTOMATION_WEBHOOK_URL");
  if (!url) return { skipped: true };
  const attempt = async () =>
    withTimeout(
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      8000,
    );
  try {
    const r = await attempt();
    if (r.ok) return { ok: true, status: r.status };
    // single retry
    const r2 = await attempt();
    return { ok: r2.ok, status: r2.status, retried: true };
  } catch (e) {
    try {
      const r2 = await attempt();
      return { ok: r2.ok, status: r2.status, retried: true };
    } catch (e2) {
      return { ok: false, error: e2 instanceof Error ? e2.message : String(e2) };
    }
  }
}

function buildSocialDraft(p: {
  title: string; excerpt: string; url: string; image?: string | null; tags?: string[] | null; category?: string | null;
}) {
  const tags = (p.tags || []).slice(0, 5).map((t) => "#" + t.replace(/[^a-z0-9]/gi, ""));
  const baseTags = ["#NexGenCapital", "#SWFL", "#Mortgage"];
  const hashtags = Array.from(new Set([...baseTags, ...tags])).join(" ");
  const text = `${p.title}\n\n${(p.excerpt || "").slice(0, 200)}\n\nRead more: ${p.url}\n\n${hashtags}`.slice(0, 2200);
  return { text, hashtags };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expected = Deno.env.get("PING_SECRET");
  if (!expected) {
    console.error("PING_SECRET not configured");
    return json({ error: "Server misconfigured" }, 500);
  }
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${expected}`) {
    console.warn("ping unauthorized; expected starts", mask(expected));
    return json({ error: "Unauthorized" }, 401);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const type = body.type === "update" || body.type === "delete" ? body.type : "create";
  const title = (typeof body.title === "string" ? body.title : "").slice(0, 300);
  const excerpt = (typeof body.excerpt === "string" ? body.excerpt : "").slice(0, 600);
  const image = typeof body.image === "string" ? body.image : null;
  const content = typeof body.content === "string" ? body.content : "";
  const changedFields: string[] = Array.isArray(body.changedFields) ? body.changedFields.slice(0, 20) : [];
  const postId = typeof body.postId === "string" ? body.postId : null;
  const tags = Array.isArray(body.tags) ? body.tags.slice(0, 20) : [];
  const category = typeof body.category === "string" ? body.category : null;

  if (!/^https?:\/\//.test(url)) return json({ error: "Invalid url" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Hash + cooldown / dedup
  const newHash = await sha256(`${title}\n${excerpt}\n${content}`);
  const { data: existing } = await supabase
    .from("content_change_log")
    .select("id, content_hash, last_triggered_at, trigger_count")
    .eq("url", url)
    .maybeSingle();

  const now = Date.now();
  if (existing) {
    const lastAt = existing.last_triggered_at ? new Date(existing.last_triggered_at).getTime() : 0;
    const sameContent = existing.content_hash === newHash;
    if (sameContent) {
      return json({ skipped: true, reason: "no_content_change", url });
    }
    if (lastAt && now - lastAt < COOLDOWN_MS && type !== "create") {
      return json({ skipped: true, reason: "cooldown_active", retryAfterMs: COOLDOWN_MS - (now - lastAt) });
    }
  }

  const significantUpdate =
    type === "create" ||
    changedFields.includes("title") ||
    changedFields.includes("content") ||
    changedFields.includes("excerpt");

  // Run integrations in parallel
  const tasks: Record<string, Promise<unknown>> = {
    pingomatic: pingomatic(url, title).catch((e) => ({ ok: false, error: String(e) })),
    webhook: notifyWebhook({
      event: "content_updated",
      url, type, title, excerpt,
      image, changedFields, tags, category,
      timestamp: new Date().toISOString(),
    }),
  };

  // Queue social DRAFT (admin approval flow) — only for blog posts on create or significant update
  let socialDraftId: string | null = null;
  if (postId && significantUpdate && /\/blog\//.test(url)) {
    try {
      const draft = buildSocialDraft({ title, excerpt, url, image, tags, category });
      const today = new Date().toISOString().slice(0, 10);
      const { data: post, error: postErr } = await supabase
        .from("social_media_posts")
        .insert({
          platform: "all",
          post_type: "featured_business",
          post_text: draft.text,
          hashtags: draft.hashtags.split(" ").filter(Boolean),
          image_url: image,
          cta_link: url,
          scheduled_date: today,
          status: "draft",
        })
        .select("id")
        .single();
      if (postErr) {
        console.error("social draft insert error", postErr);
      } else {
        socialDraftId = post.id;
      }
    } catch (e) {
      console.error("social draft error", e);
    }
  }

  const settled = await Promise.allSettled(Object.values(tasks));
  const keys = Object.keys(tasks);
  const results: Record<string, unknown> = {};
  settled.forEach((r, i) => {
    results[keys[i]] = r.status === "fulfilled" ? r.value : { ok: false, error: String(r.reason) };
  });
  if (socialDraftId) results.socialDraft = { ok: true, id: socialDraftId, status: "draft" };
  else if (significantUpdate && /\/blog\//.test(url)) results.socialDraft = { skipped: true, reason: "no_post_id_or_insert_failed" };
  else results.socialDraft = { skipped: true, reason: "not_significant_or_not_blog" };

  // Persist log
  const upsertPayload = {
    url,
    content_hash: newHash,
    last_title: title,
    last_excerpt: excerpt,
    last_type: type,
    last_triggered_at: new Date().toISOString(),
    trigger_count: (existing?.trigger_count || 0) + 1,
    last_payload: { title, excerpt, image, changedFields, tags, category, postId },
    last_result: results,
  };
  const { error: logErr } = await supabase
    .from("content_change_log")
    .upsert(upsertPayload, { onConflict: "url" });
  if (logErr) console.error("log upsert error", logErr);

  return json({ ok: true, url, type, significantUpdate, results });
});