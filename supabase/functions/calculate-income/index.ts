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

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function currentYearFraction(d: Date) {
  const dim = daysInMonth(d);
  const day = d.getDate();
  const precedingMonths = d.getMonth(); // 0-based: Jan=0
  return { fraction: precedingMonths + day / dim, dim, day, precedingMonths };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
  if (authErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const leadId = typeof body?.lead_id === "string" ? body.lead_id : null;
  const contactId = typeof body?.contact_id === "string" ? body.contact_id : null;
  const borrowerName = typeof body?.borrower_name === "string" ? body.borrower_name : null;
  const mode = body?.mode === "calculate" ? "calculate" : "read";
  if (!leadId) return json({ error: "lead_id required" }, 400);

  const { data: conditions } = await supabase
    .from("loan_conditions")
    .select("id,condition_type,title,status,received_at,document_name,document_url,category")
    .eq("lead_id", leadId)
    .eq("category", "income")
    .eq("status", "received");

  if (mode === "read") {
    let q = supabase
      .from("borrower_income_calculations")
      .select("*")
      .eq("lead_id", leadId);
    if (contactId) q = q.eq("contact_id", contactId);
    else q = q.is("contact_id", null);
    const { data: calc, error: kErr } = await q
      .order("calculation_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (kErr) return json({ error: kErr.message }, 400);
    return json({ calculation: calc ?? null, income_conditions: conditions ?? [] });
  }

  // mode === "calculate" — load payment details and apply formulas
  let pdq = supabase
    .from("borrower_payment_details")
    .select("*")
    .eq("lead_id", leadId);
  if (contactId) pdq = pdq.eq("contact_id", contactId);
  else pdq = pdq.is("contact_id", null);
  const { data: pd, error: pErr } = await pdq
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pErr) return json({ error: pErr.message }, 400);
  if (!pd) return json({ error: "No payment details for this lead. Save inputs first." }, 400);

  const borrowerType = pd.borrower_type ?? "employed";
  let monthly = 0, annual = 0;
  let base = 0, overtime = 0, bonus = 0, commission = 0;
  let selfEmployment = 0, yearsAverage: number | null = null;
  const breakdown: Record<string, unknown> = {};

  if (borrowerType === "self_employed") {
    selfEmployment = Number(pd.se_avg_monthly_net ?? 0);
    monthly = selfEmployment;
    annual = selfEmployment * 12;
    breakdown.self_employment_monthly = selfEmployment;
  } else {
    const ending = pd.pay_stub_ending_date ? new Date(pd.pay_stub_ending_date) : new Date();
    const { fraction, dim, day, precedingMonths } = currentYearFraction(ending);
    const safeDiv = (n: number) => (fraction > 0 ? n / fraction : 0);

    base = safeDiv(Number(pd.pay_stub_gross_base ?? 0));
    overtime = safeDiv(Number(pd.pay_stub_overtime ?? 0));
    bonus = safeDiv(Number(pd.pay_stub_bonus ?? 0));
    commission = safeDiv(Number(pd.pay_stub_commission ?? 0));
    monthly = base + overtime + bonus + commission;
    annual = monthly * 12;

    const w2Total =
      Number(pd.w2_year_1_wages ?? 0) +
      Number(pd.w2_year_2_wages ?? 0) +
      Number(pd.ytd_total ?? 0);
    const denom = 24 + fraction;
    yearsAverage = denom > 0 ? w2Total / denom : null;

    breakdown.monthly_base = base;
    breakdown.monthly_overtime = overtime;
    breakdown.monthly_bonus = bonus;
    breakdown.monthly_commission = commission;
    breakdown.days_in_current_month = dim;
    breakdown.day_of_month = day;
    breakdown.preceding_months = precedingMonths;
    breakdown.current_year_fraction = fraction;
    breakdown.w2_total = w2Total;
    breakdown.denominator_months = denom;
    breakdown.years_average = yearsAverage;
  }

  const row = {
    lead_id: leadId,
    contact_id: contactId,
    borrower_name: borrowerName,
    borrower_type: borrowerType,
    monthly_income: monthly,
    annual_income: annual,
    base_income: base,
    overtime,
    bonus,
    commission,
    self_employment_income: selfEmployment,
    other_income: 0,
    years_average: yearsAverage,
    income_breakdown: breakdown,
    source: "manual",
    calculated_by: "system",
    ocr_status: "none",
  };

  const { data: inserted, error: insErr } = await supabase
    .from("borrower_income_calculations")
    .insert(row)
    .select("*")
    .single();
  if (insErr) return json({ error: insErr.message }, 400);

  return json({ calculation: inserted, income_conditions: conditions ?? [] });
});