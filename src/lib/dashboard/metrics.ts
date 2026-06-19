import { supabase } from "@/integrations/supabase/client";

const COMMISSION_RATE = 0.0125;

export type KpiCard = {
  key: "pipeline" | "expected_revenue" | "closing_month" | "funded_month";
  label: string;
  value: number;
  display: string;
  delta: number | null;
};

const fmtMoney = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `$${(n / 1_000).toFixed(1)}K`
  : `$${Math.round(n).toLocaleString()}`;

function monthRange(offset = 0) {
  const start = new Date();
  start.setDate(1); start.setHours(0, 0, 0, 0);
  start.setMonth(start.getMonth() + offset);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

function pct(curr: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

export async function getKpiCards(): Promise<KpiCard[]> {
  const { data: opps } = await supabase
    .from("pipeline_opportunities")
    .select("stage,loan_amount,close_date,created_at")
    .limit(2000);

  const rows = opps ?? [];
  const open = rows.filter((o: any) => o.stage !== "closed" && o.stage !== "lost");
  const pipelineValue = open.reduce((s, o: any) => s + Number(o.loan_amount || 0), 0);
  const expectedRevenue = pipelineValue * COMMISSION_RATE;

  const cur = monthRange(0);
  const prev = monthRange(-1);
  const inMonth = (o: any, r: { start: Date; end: Date }) =>
    o.close_date && new Date(o.close_date) >= r.start && new Date(o.close_date) < r.end;

  const closingCur = open.filter((o: any) => inMonth(o, cur)).length;
  const closingPrev = open.filter((o: any) => inMonth(o, prev)).length;
  const fundedCur = rows.filter((o: any) => o.stage === "closed" && inMonth(o, cur));
  const fundedPrev = rows.filter((o: any) => o.stage === "closed" && inMonth(o, prev));
  const fundedCurAmt = fundedCur.reduce((s, o: any) => s + Number(o.loan_amount || 0), 0);
  const fundedPrevAmt = fundedPrev.reduce((s, o: any) => s + Number(o.loan_amount || 0), 0);

  // Pipeline delta: created this month vs last month
  const createdCur = rows.filter((o: any) => o.created_at && new Date(o.created_at) >= cur.start)
    .reduce((s, o: any) => s + Number(o.loan_amount || 0), 0);
  const createdPrev = rows
    .filter((o: any) => o.created_at && new Date(o.created_at) >= prev.start && new Date(o.created_at) < cur.start)
    .reduce((s, o: any) => s + Number(o.loan_amount || 0), 0);

  return [
    { key: "pipeline", label: "Pipeline Value", value: pipelineValue, display: fmtMoney(pipelineValue), delta: pct(createdCur, createdPrev) },
    { key: "expected_revenue", label: "Expected Revenue", value: expectedRevenue, display: fmtMoney(expectedRevenue), delta: pct(createdCur, createdPrev) },
    { key: "closing_month", label: "Closing This Month", value: closingCur, display: String(closingCur), delta: pct(closingCur, closingPrev) },
    { key: "funded_month", label: "Funded This Month", value: fundedCurAmt, display: fmtMoney(fundedCurAmt), delta: pct(fundedCurAmt, fundedPrevAmt) },
  ];
}

export type RateRow = { label: string; value: number; delta: number };

export async function getRateMonitor(): Promise<RateRow[]> {
  const { data } = await supabase
    .from("mortgage_market_rates")
    .select("rate_30yr,adjusted_rate,fetched_at,active")
    .eq("active", true)
    .order("fetched_at", { ascending: false })
    .limit(2);
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const curr = Number(rows[0].rate_30yr || 0);
  const prev = rows[1] ? Number(rows[1].rate_30yr || 0) : curr;
  const adj = Number(rows[0].adjusted_rate || 0);
  return [
    { label: "30Y Market Rate", value: curr, delta: Math.round((curr - prev) * 1000) / 1000 },
    { label: "30Y Par Rate (adj.)", value: adj, delta: 0 },
  ];
}

export type ReferralPartner = { id: string; name: string; company: string | null; loans: number; volume: number };

export async function getReferralPartners(limit = 5): Promise<ReferralPartner[]> {
  const { data: roles } = await supabase
    .from("person_roles")
    .select("person_id")
    .eq("role_type", "ReferralPartner");
  const ids = (roles ?? []).map((r: any) => r.person_id);
  if (ids.length === 0) return [];
  const { data: people } = await supabase
    .from("people")
    .select("id,full_name,company")
    .in("id", ids);
  const { data: leads } = await supabase
    .from("leads")
    .select("id,referral_partner_id")
    .in("referral_partner_id", ids);
  const leadIds = (leads ?? []).map((l: any) => l.id);
  const partnerByLead = new Map<string, string>((leads ?? []).map((l: any) => [l.id, l.referral_partner_id]));
  let opps: any[] = [];
  if (leadIds.length) {
    const { data } = await supabase
      .from("pipeline_opportunities")
      .select("lead_id,loan_amount,stage")
      .in("lead_id", leadIds);
    opps = data ?? [];
  }
  const agg = new Map<string, { loans: number; volume: number }>();
  opps.forEach((o) => {
    const pid = partnerByLead.get(o.lead_id);
    if (!pid) return;
    const cur = agg.get(pid) ?? { loans: 0, volume: 0 };
    cur.loans += 1;
    cur.volume += Number(o.loan_amount || 0);
    agg.set(pid, cur);
  });
  return (people ?? [])
    .map((p: any) => ({
      id: p.id, name: p.full_name, company: p.company,
      loans: agg.get(p.id)?.loans ?? 0, volume: agg.get(p.id)?.volume ?? 0,
    }))
    .filter((p) => p.loans > 0)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit);
}

export type ScorecardRow = { label: string; value: number; target: number };

export async function getScorecard(userId: string): Promise<ScorecardRow[]> {
  const { start } = monthRange(0);
  const startIso = start.toISOString();

  const [callsR, oppsR, targetsR] = await Promise.all([
    supabase.from("crm_calls").select("id", { count: "exact", head: true }).gte("created_at", startIso).eq("created_by", userId),
    supabase.from("pipeline_opportunities").select("id,stage,close_date,loan_officer_id,created_at").or(`loan_officer_id.eq.${userId},created_by.eq.${userId}`),
    supabase.from("user_targets").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  const opps = oppsR.data ?? [];
  const apps = opps.filter((o: any) => new Date(o.created_at) >= start).length;
  const preApprovals = opps.filter((o: any) => ["approved", "clear_to_close"].includes(o.stage)).length;
  const funded = opps.filter((o: any) => o.stage === "closed" && o.close_date && new Date(o.close_date) >= start).length;
  const t = targetsR.data || { calls_target: 0, applications_target: 0, preapprovals_target: 0, funded_target: 0 };

  return [
    { label: "Calls Made", value: callsR.count ?? 0, target: t.calls_target },
    { label: "Applications", value: apps, target: t.applications_target },
    { label: "Pre-Approvals", value: preApprovals, target: t.preapprovals_target },
    { label: "Loans Funded", value: funded, target: t.funded_target },
  ];
}

export type AiOpportunity = { key: string; label: string; count: number; revenue: number };

export async function getAiOpportunities(): Promise<AiOpportunity[]> {
  const [scnR, rateR] = await Promise.all([
    supabase.from("loan_scenarios").select("lead_id,interest_rate,loan_amount,ltv,mortgage_type"),
    supabase.from("mortgage_market_rates").select("rate_30yr").eq("active", true).order("fetched_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const market = Number(rateR.data?.rate_30yr || 0);
  const scns = scnR.data ?? [];
  if (scns.length === 0 || market === 0) return [];

  const refi = scns.filter((s: any) => s.interest_rate && Number(s.interest_rate) - market >= 0.5);
  const heloc = scns.filter((s: any) => s.ltv && Number(s.ltv) <= 80);
  const fhaStream = scns.filter((s: any) => (s.mortgage_type || "").toLowerCase().includes("fha") && s.interest_rate && Number(s.interest_rate) - market >= 0.25);

  const sumRev = (rows: any[]) => rows.reduce((s, r) => s + Number(r.loan_amount || 0) * COMMISSION_RATE, 0);
  const out: AiOpportunity[] = [];
  if (refi.length) out.push({ key: "refi", label: "Refinance opportunities", count: refi.length, revenue: sumRev(refi) });
  if (heloc.length) out.push({ key: "heloc", label: "HELOC opportunities", count: heloc.length, revenue: sumRev(heloc) });
  if (fhaStream.length) out.push({ key: "fha", label: "FHA streamline opportunities", count: fhaStream.length, revenue: sumRev(fhaStream) });
  return out;
}

export type ForecastPoint = { m: string; revenue: number };

export async function getRevenueForecast(months = 6): Promise<ForecastPoint[]> {
  const { data } = await supabase
    .from("pipeline_opportunities")
    .select("loan_amount,close_date,stage")
    .not("close_date", "is", null)
    .neq("stage", "lost");
  const rows = data ?? [];
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
  const buckets: ForecastPoint[] = [];
  for (let i = 0; i < months; i++) {
    const s = new Date(start); s.setMonth(s.getMonth() + i);
    const e = new Date(s); e.setMonth(e.getMonth() + 1);
    const rev = rows
      .filter((o: any) => new Date(o.close_date) >= s && new Date(o.close_date) < e)
      .reduce((sum, o: any) => sum + Number(o.loan_amount || 0) * COMMISSION_RATE, 0);
    buckets.push({ m: s.toLocaleString(undefined, { month: "short" }), revenue: Math.round(rev) });
  }
  return buckets;
}

export type AlertRow = { id: string; sev: "high" | "med" | "low"; title: string; subject: string };

export async function getAlerts(limit = 6): Promise<AlertRow[]> {
  const [condR, stuckR] = await Promise.all([
    supabase
      .from("loan_conditions")
      .select("id,title,lead_id,status,required,leads(first_name,last_name)")
      .eq("status", "pending")
      .eq("required", true)
      .limit(20),
    supabase
      .from("leads")
      .select("id,first_name,last_name,is_stuck")
      .eq("is_stuck", true)
      .limit(20),
  ]);
  const out: AlertRow[] = [];
  (condR.data ?? []).forEach((c: any) => {
    const name = `${c.leads?.first_name ?? ""} ${c.leads?.last_name ?? ""}`.trim() || "Borrower";
    out.push({ id: c.id, sev: "high", title: c.title, subject: name });
  });
  (stuckR.data ?? []).forEach((l: any) => {
    out.push({ id: l.id, sev: "med", title: "Stuck > 72h", subject: `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim() || "Lead" });
  });
  return out.slice(0, limit);
}

export type CopilotItem = { id: string; title: string; subtitle: string; tone: "rose" | "amber" | "emerald" | "sky" };

export async function getCopilotPriorities(): Promise<CopilotItem[]> {
  const [stuckR, hotR, condR] = await Promise.all([
    supabase.from("leads").select("id,first_name,last_name").eq("is_stuck", true).limit(2),
    supabase.from("leads").select("id,first_name,last_name,lead_score").gte("lead_score", 70).order("lead_score", { ascending: false }).limit(2),
    supabase.from("loan_conditions").select("id,title,leads(first_name,last_name)").eq("status", "pending").eq("category", "income").limit(2),
  ]);
  const out: CopilotItem[] = [];
  (stuckR.data ?? []).forEach((l: any) =>
    out.push({ id: `stuck-${l.id}`, title: `Follow up: ${l.first_name ?? ""} ${l.last_name ?? ""}`.trim(), subtitle: "Stuck > 72h", tone: "rose" })
  );
  (condR.data ?? []).forEach((c: any) => {
    const name = `${c.leads?.first_name ?? ""} ${c.leads?.last_name ?? ""}`.trim() || "borrower";
    out.push({ id: `cond-${c.id}`, title: `Request ${c.title}`, subtitle: `Missing for ${name}`, tone: "amber" });
  });
  (hotR.data ?? []).forEach((l: any) =>
    out.push({ id: `hot-${l.id}`, title: `High intent: ${l.first_name ?? ""} ${l.last_name ?? ""}`.trim(), subtitle: `Score ${l.lead_score}`, tone: "sky" })
  );
  return out.slice(0, 4);
}
