import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Base points per event type
const EVENT_POINTS: Record<string, number> = {
  page_view: 1,
  program_view: 5,
  calculator_use: 15,
  cta_click: 10,
  identify: 0,
};

// Paths that signal high mortgage intent
const HIGH_INTENT = [
  /calculator/i, /pre-?approval/i, /fha/i, /first-time-homebuyer/i, /self-employed/i,
  /dscr/i, /refinance/i, /apply/i, /\?start=1/, /book/i, /contact/i, /mortgage-broker/i,
];
const PROGRAM = [/fha/i, /first-time-homebuyer/i, /self-employed/i, /dscr/i, /refinance/i, /pre-?approval/i, /mortgage-broker/i, /loan/i];

const SESSION_GAP_MS = 30 * 60 * 1000; // new visit after 30 min idle
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // max 1 alert per lead every 6h

const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
// Strip any query values that might carry personal data, keep only UTM/start keys
const cleanPath = (p: string) => {
  try {
    const u = new URL(p, "https://x.local");
    const keep = new URLSearchParams();
    for (const [k, v] of u.searchParams) if (/^utm_|^start$/.test(k)) keep.set(k, v.slice(0, 100));
    const q = keep.toString();
    return (u.pathname + (q ? `?${q}` : "")).slice(0, 300);
  } catch { return p.slice(0, 300); }
};
// Calculator metadata: only coarse ranges, never raw financials
const bucket = (n: unknown) => {
  const v = Number(n);
  if (!isFinite(v) || v <= 0) return undefined;
  const step = 50000;
  const lo = Math.floor(v / step) * step;
  return `$${(lo / 1000).toFixed(0)}k–$${((lo + step) / 1000).toFixed(0)}k`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    let body: any;
    try { body = JSON.parse(await req.text()); } catch { return json({ error: "Invalid JSON" }, 400); }

    const visitor_id = str(body.visitor_id, 64);
    const event_type = str(body.event_type, 40);
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(visitor_id)) return json({ error: "Invalid visitor_id" }, 400);
    if (!(event_type in EVENT_POINTS)) return json({ error: "Invalid event_type" }, 400);

    const site = str(body.site, 100) || null;
    const path = cleanPath(str(body.path, 500) || "/");
    const referrer = str(body.referrer, 300) || null;
    const utm = body.utm && typeof body.utm === "object" ? body.utm : {};
    const email = str(body.email, 255).toLowerCase();
    const device = /mobile/i.test(req.headers.get("user-agent") || "") ? "mobile" : "desktop";

    const metadata: Record<string, unknown> = {};
    if (event_type === "calculator_use" && body.metadata && typeof body.metadata === "object") {
      metadata.calculator = str(body.metadata.calculator, 50) || undefined;
      metadata.price_range = bucket(body.metadata.price);
      metadata.loan_range = bucket(body.metadata.loan_amount);
    }
    if (event_type === "cta_click") metadata.cta = str(body.metadata?.cta, 100) || undefined;
    if (body.title) metadata.title = str(body.title, 150);

    const isHigh = HIGH_INTENT.some((r) => r.test(path)) || event_type === "calculator_use";
    let points = EVENT_POINTS[event_type];
    if (event_type === "page_view" && PROGRAM.some((r) => r.test(path))) points = EVENT_POINTS.program_view;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date();

    const { data: existing } = await supabase.from("website_visitors").select("*").eq("visitor_id", visitor_id).maybeSingle();

    // Identity stitching: by existing link, else by email
    let lead_id: string | null = existing?.lead_id ?? null;
    if (!lead_id && email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      const { data: lead } = await supabase.from("leads").select("id").ilike("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();
      lead_id = lead?.id ?? null;
    }

    const isNewVisit = !existing || now.getTime() - new Date(existing.last_seen_at).getTime() > SESSION_GAP_MS;
    const justLinked = !!lead_id && !existing?.lead_id;

    if (existing) {
      await supabase.from("website_visitors").update({
        lead_id,
        last_seen_at: now.toISOString(),
        visit_count: existing.visit_count + (isNewVisit ? 1 : 0),
        pageview_count: existing.pageview_count + (event_type === "page_view" ? 1 : 0),
        intent_score: Math.min(existing.intent_score + points, 100000),
      }).eq("id", existing.id);
    } else {
      await supabase.from("website_visitors").insert({
        visitor_id, lead_id, site,
        pageview_count: event_type === "page_view" ? 1 : 0,
        intent_score: points,
        utm_source: str(utm.source, 100) || null,
        utm_medium: str(utm.medium, 100) || null,
        utm_campaign: str(utm.campaign, 100) || null,
        first_referrer: referrer, device,
      });
    }

    await supabase.from("website_events").insert({ visitor_id, lead_id, site, event_type, path, points, metadata });

    if (lead_id) {
      // Back-fill anonymous history the first time we link
      if (justLinked) {
        await supabase.from("website_events").update({ lead_id }).eq("visitor_id", visitor_id).is("lead_id", null);
      }
      if (points > 0) {
        await supabase.from("lead_events").insert({
          lead_id, event_type: `web_${event_type}`, points,
          metadata: { path, site, ...metadata },
        });
      }

      // Return-visit alert: known lead, new visit, high-intent page, cooldown respected
      const lastAlert = existing?.last_alert_at ? new Date(existing.last_alert_at).getTime() : 0;
      if (existing && isNewVisit && !justLinked && isHigh && now.getTime() - lastAlert > ALERT_COOLDOWN_MS) {
        await supabase.from("website_visitors").update({ last_alert_at: now.toISOString() }).eq("visitor_id", visitor_id);
        const { data: lead } = await supabase.from("leads")
          .select("id, first_name, last_name, email, phone, loan_purpose, property_value, lead_score, source")
          .eq("id", lead_id).maybeSingle();
        if (lead) {
          const secret = Deno.env.get("NOTIFY_INGEST_SECRET");
          supabase.functions.invoke("notify-lead-event", {
            headers: secret ? { "x-notify-secret": secret } : {},
            body: {
              event: "return_visit", lead_id: lead.id, ...lead,
              visit_path: path, visit_site: site, visit_count: (existing.visit_count ?? 0) + 1,
            },
          }).catch((e) => console.error("[TRACK] alert failed", e));
        }
      }
    }

    return json({ ok: true, linked: !!lead_id });
  } catch (err) {
    console.error("[TRACK-VISITOR] error", err);
    return json({ error: "Tracking failed" }, 500);
  }
});
