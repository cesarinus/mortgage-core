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
  borrowers: [] as any[],
  combined: null as any,
};

const BORROWER_ROLES = new Set(["primary_borrower", "co_borrower", "guarantor"]);

function fullName(c: any, fallback = "Borrower") {
  const name = `${c?.first_name ?? ""} ${c?.last_name ?? ""}`.trim();
  return name || fallback;
}

function borrowerBlock(b: any, idx: number) {
  const role = idx === 0 ? "Primary" : `Co-Borrower ${idx}`;
  return `Borrower ${idx + 1} (${role}) — ${b.borrower_name ?? "Unnamed"}:
- Type: ${b.pd?.borrower_type ?? b.calc?.borrower_type ?? "unknown"}
- W-2 Year 1: ${b.pd?.w2_year_1 ?? "—"} — $${b.pd?.w2_year_1_wages ?? 0}
- W-2 Year 2: ${b.pd?.w2_year_2 ?? "—"} — $${b.pd?.w2_year_2_wages ?? 0}
- YTD total: $${b.pd?.ytd_total ?? 0} (as of ${b.pd?.ytd_as_of_date ?? "—"})
- Pay stub ending: ${b.pd?.pay_stub_ending_date ?? "—"}
- Base: ${b.pd?.pay_stub_gross_base ?? 0}, Overtime: ${b.pd?.pay_stub_overtime ?? 0}, Bonus: ${b.pd?.pay_stub_bonus ?? 0}, Commission: ${b.pd?.pay_stub_commission ?? 0}
- Monthly: $${b.calc?.monthly_income ?? 0}, Annual: $${b.calc?.annual_income ?? 0}, Years avg: $${b.calc?.years_average ?? 0}`;
}

function buildMultiPrompt(borrowers: any[], totalMonthly: number, totalAnnual: number) {
  return `You are a mortgage underwriting assistant. Analyze income for this loan application with ${borrowers.length === 1 ? "one borrower" : "multiple borrowers"}.

${borrowers.map((b, i) => borrowerBlock(b, i)).join("\n\n")}

Combined monthly qualifying income: $${totalMonthly}
Combined annual qualifying income: $${totalAnnual}

Provide JSON ONLY with this shape:
{
  "summary": "one sentence on combined income profile",
  "trend": "stable|increasing|decreasing|volatile",
  "highlights": ["..."],
  "suggestions": ["..."],
  "risk_flags": ["deal-level risk", "..."],
  "borrowers": [
    {
      "label": "Primary",
      "name": "...",
      "trend": "stable|increasing|decreasing|volatile",
      "summary": "one sentence per borrower",
      "highlights": ["..."],
      "risk_flags": ["..."]
    }
  ],
  "combined": {
    "monthly": ${totalMonthly},
    "annual": ${totalAnnual},
    "assessment": "one-line combined assessment"
  }
}
Lowercase all trend values.`;
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
  const borrowers = Array.isArray(data?.borrowers) ? data.borrowers.map((b: any) => ({
    label: String(b?.label ?? "Borrower"),
    name: String(b?.name ?? ""),
    trend: (() => {
      const t = String(b?.trend ?? "unknown").toLowerCase();
      return ["stable", "increasing", "decreasing", "volatile", "unknown"].includes(t) ? t : "unknown";
    })(),
    summary: String(b?.summary ?? "").trim(),
    highlights: arr(b?.highlights),
    risk_flags: arr(b?.risk_flags),
  })) : [];
  const combined = data?.combined && typeof data.combined === "object" ? {
    monthly: Number(data.combined.monthly ?? 0),
    annual: Number(data.combined.annual ?? 0),
    assessment: String(data.combined.assessment ?? "").trim(),
  } : null;
  return {
    trend,
    summary: String(data?.summary ?? "").trim() || FALLBACK.summary,
    highlights: arr(data?.highlights),
    suggestions: arr(data?.suggestions),
    risk_flags: arr(data?.risk_flags),
    borrowers,
    combined,
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
  const filterContactId: string | null = typeof body?.contact_id === "string" ? body.contact_id : null;
  const force: boolean = !!body?.force;
  if (!leadId) return json({ error: "lead_id required" }, 400);

  // Cache
  const cacheKey = `${leadId}::${filterContactId ?? "all"}`;
  const cached = CACHE.get(cacheKey);
  if (!force && cached && Date.now() - cached.at < TTL_MS) {
    return json({ ...cached.data, cached: true });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  // Fetch all borrowers' rows for this lead, then group by contact_id
  const [{ data: pdRows }, { data: calcRows }, { data: linkRows }, { data: lead }, { data: opportunities }, { data: directContacts }] = await Promise.all([
    supabase.from("borrower_payment_details").select("*").eq("lead_id", leadId)
      .order("updated_at", { ascending: false }),
    supabase.from("borrower_income_calculations").select("*").eq("lead_id", leadId)
      .order("calculation_date", { ascending: false }),
    supabase.from("lead_contacts").select("contact_id,is_primary,role_on_deal,role").eq("lead_id", leadId),
    supabase.from("leads").select("first_name,last_name,co_borrower_id").eq("id", leadId).maybeSingle(),
    supabase.from("pipeline_opportunities").select("primary_contact_id").eq("lead_id", leadId),
    supabase.from("contacts").select("id,first_name,last_name,contact_type,lead_id").eq("lead_id", leadId).eq("contact_type", "borrower"),
  ]);

  if ((!pdRows || pdRows.length === 0) && (!calcRows || calcRows.length === 0)) {
    return json({ ...FALLBACK, summary: "No income data yet — add pay stub or W-2 details to enable analysis." });
  }

  // Index latest pd and calc by contact_id key
  const latest = <T extends { contact_id?: string | null }>(rows: T[]) => {
    const m = new Map<string, T>();
    for (const r of (rows ?? [])) {
      const k = (r as any).contact_id ?? "__primary__";
      if (!m.has(k)) m.set(k, r);
    }
    return m;
  };
  const pdMap = latest<any>(pdRows ?? []);
  const calcMap = latest<any>(calcRows ?? []);
  const contactIds = new Set<string>();
  for (const r of linkRows ?? []) if ((r as any).contact_id) contactIds.add((r as any).contact_id);
  for (const c of directContacts ?? []) if ((c as any).id) contactIds.add((c as any).id);
  if ((lead as any)?.co_borrower_id) contactIds.add((lead as any).co_borrower_id);
  for (const o of opportunities ?? []) if ((o as any).primary_contact_id) contactIds.add((o as any).primary_contact_id);
  for (const key of [...pdMap.keys(), ...calcMap.keys()]) if (key !== "__primary__") contactIds.add(key);

  const contactMap = new Map<string, any>();
  for (const c of directContacts ?? []) contactMap.set((c as any).id, c);
  if (contactIds.size > 0) {
    const { data: allContacts } = await supabase
      .from("contacts")
      .select("id,first_name,last_name,contact_type,lead_id")
      .in("id", Array.from(contactIds));
    for (const c of allContacts ?? []) contactMap.set((c as any).id, c);
  }

  const linkByContact = new Map<string, any>();
  for (const r of linkRows ?? []) if ((r as any).contact_id) linkByContact.set((r as any).contact_id, r);
  const primaryIds = new Set<string>();
  for (const r of linkRows ?? []) if ((r as any).is_primary && (r as any).contact_id) primaryIds.add((r as any).contact_id);
  for (const o of opportunities ?? []) if ((o as any).primary_contact_id) primaryIds.add((o as any).primary_contact_id);

  const borrowerKeys = new Map<string, { key: string; name: string; is_primary: boolean }>();
  const addBorrower = (key: string, forcedPrimary = false) => {
    if (key === "__primary__") {
      borrowerKeys.set(key, { key, name: fullName(lead, "Primary Borrower"), is_primary: true });
      return;
    }
    const c = contactMap.get(key);
    const link = linkByContact.get(key);
    const role = link?.role_on_deal ?? link?.role ?? null;
    const isPrimary = forcedPrimary || !!link?.is_primary || primaryIds.has(key);
    const isBorrowerContact = c?.contact_type === "borrower";
    const isBorrowerRole = role ? BORROWER_ROLES.has(String(role)) : false;
    if (!isBorrowerContact && !isPrimary && !isBorrowerRole) return;
    if (!isBorrowerContact && !isPrimary) return;
    const current = borrowerKeys.get(key);
    borrowerKeys.set(key, { key, name: fullName(c), is_primary: current?.is_primary || isPrimary });
  };

  for (const r of linkRows ?? []) if ((r as any).contact_id) addBorrower((r as any).contact_id, !!(r as any).is_primary);
  for (const c of directContacts ?? []) if ((c as any).id) addBorrower((c as any).id);
  if ((lead as any)?.co_borrower_id) addBorrower((lead as any).co_borrower_id);
  for (const o of opportunities ?? []) if ((o as any).primary_contact_id) addBorrower((o as any).primary_contact_id, true);
  for (const key of [...pdMap.keys(), ...calcMap.keys()]) addBorrower(key);

  let borrowers = Array.from(borrowerKeys.values()).map((meta) => ({
    key: meta.key,
    borrower_name: (calcMap.get(meta.key)?.borrower_name as string | undefined) || meta.name,
    is_primary: meta.is_primary,
    pd: pdMap.get(meta.key) ?? null,
    calc: calcMap.get(meta.key) ?? null,
  })).sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.borrower_name.localeCompare(b.borrower_name));

  if (filterContactId) {
    borrowers = borrowers.filter((b) => b.key === filterContactId);
    if (borrowers.length === 0) {
      return json({ ...FALLBACK, summary: "No income data yet for your record." });
    }
  }

  const totalMonthly = borrowers.reduce((s, b) => s + Number(b.calc?.monthly_income ?? 0), 0);
  const totalAnnual = borrowers.reduce((s, b) => s + Number(b.calc?.annual_income ?? 0), 0);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    const fb = { ...FALLBACK };
    CACHE.set(cacheKey, { at: Date.now(), data: fb });
    return json(fb);
  }

  const prompt = buildMultiPrompt(borrowers, totalMonthly, totalAnnual);

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
          { role: "system", content: "Reply ONLY with a single JSON object matching the schema in the user prompt. Lowercase all trend values." },
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
    // Ensure combined numbers reflect our authoritative totals
    if (data.combined) {
      data.combined.monthly = totalMonthly;
      data.combined.annual = totalAnnual;
    } else {
      data.combined = { monthly: totalMonthly, annual: totalAnnual, assessment: "" };
    }
    CACHE.set(cacheKey, { at: Date.now(), data });
    return json(data);
  } catch (e) {
    console.error("income-analysis error", e);
    return json(FALLBACK);
  }
});