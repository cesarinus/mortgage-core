import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type CacheEntry = { at: number; data: any };
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 15 * 60 * 1000;

const FALLBACK = {
  trend: "unknown",
  summary: "AI analysis unavailable — check platform configuration.",
  highlights: [],
  suggestions: ["Review W-2s and pay stubs manually."],
  risk_flags: [],
};

function buildPrompt(pd: any, calc: any) {
  return `You are a mortgage underwriting assistant. Analyze the following borrower income data and provide:
1) A one-sentence summary of the income profile.
2) An income trend assessment (stable, increasing, decreasing, volatile) based on W-2 year-over-year comparison and YTD vs prior years.
3) Two to three concise highlights about the income strength or weakness.
4) Two to three actionable suggestions for the loan officer (e.g., "Request additional pay stub to verify overtime sustainability," "Large commission portion requires two-year average confirmation," etc.).
5) Any risk flags (e.g., declining W-2 wages, oversized commission/bonus, large gap between W-2 and YTD).

Data:
- Borrower type: ${pd?.borrower_type ?? "unknown"}
- W-2 Year 1: ${pd?.w2_year_1 ?? "—"} — $${pd?.w2_year_1_wages ?? 0}
- W-2 Year 2: ${pd?.w2_year_2 ?? "—"} — $${pd?.w2_year_2_wages ?? 0}
- YTD total: $${pd?.ytd_total ?? 0} (as of ${pd?.ytd_as_of_date ?? "—"})
- Pay stub ending: ${pd?.pay_stub_ending_date ?? "—"}
- Base: ${pd?.pay_stub_gross_base ?? 0}
- Overtime: ${pd?.pay_stub_overtime ?? 0}
- Bonus: ${pd?.pay_stub_bonus ?? 0}
- Commission: ${pd?.pay_stub_commission ?? 0}
- Calculated monthly income: $${calc?.monthly_income ?? 0}
- Calculated annual income: $${calc?.annual_income ?? 0}
- Years average: $${calc?.years_average ?? 0}`;
}

function tryParseJson(text: string): any | null {
  if (!text) return null;
  let t = text.trim();
  // strip ```json fences
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch {}
  const m = t.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

function normalize(data: any) {
  const trendRaw = String(data?.trend ?? "unknown").toLowerCase();
  const trend = ["stable", "increasing", "decreasing", "volatile", "unknown"].includes(trendRaw)
    ? trendRaw : "unknown";
  const arr = (x: any) => Array.isArray(x) ? x.filter((s) => typeof s === "string" && s.trim()) : [];
  return {
    trend,
    summary: String(data?.summary ?? "").trim() || FALLBACK.summary,
    highlights: arr(data?.highlights),
    suggestions: arr(data?.suggestions),
    risk_flags: arr(data?.risk_flags),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  let body: any = {};
  try { body = await req.json(); } catch {}
  const leadId: string | undefined = body?.lead_id;
  const force: boolean = !!body?.force;
  if (!leadId) return json({ error: "lead_id required" }, 400);

  // Cache
  const cached = CACHE.get(leadId);
  if (!force && cached && Date.now() - cached.at < TTL_MS) {
    return json({ ...cached.data, cached: true });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const [{ data: pd }, { data: calc }] = await Promise.all([
    supabase.from("borrower_payment_details").select("*").eq("lead_id", leadId)
      .order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("borrower_income_calculations").select("*").eq("lead_id", leadId)
      .order("calculation_date", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (!pd && !calc) {
    return json({ ...FALLBACK, summary: "No income data yet — add pay stub or W-2 details to enable analysis." });
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    const fb = { ...FALLBACK };
    CACHE.set(leadId, { at: Date.now(), data: fb });
    return json(fb);
  }

  const prompt = buildPrompt(pd, calc);

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "raw-fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Reply ONLY with a single JSON object, no prose, matching: {\"trend\":\"stable|increasing|decreasing|volatile\",\"summary\":string,\"highlights\":string[],\"suggestions\":string[],\"risk_flags\":string[]}. Lowercase all status values." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      console.error("ai gateway error", res.status, await res.text().catch(() => ""));
      return json(FALLBACK);
    }
    const out = await res.json();
    const text = out?.choices?.[0]?.message?.content ?? "";
    const parsed = tryParseJson(text);
    if (!parsed) return json(FALLBACK);
    const data = normalize(parsed);
    CACHE.set(leadId, { at: Date.now(), data });
    return json(data);
  } catch (e) {
    console.error("income-analysis error", e);
    return json(FALLBACK);
  }
});