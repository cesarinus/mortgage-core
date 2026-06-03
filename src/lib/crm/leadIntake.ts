import { supabase } from "@/integrations/supabase/client";

export type LoanPurpose = "purchase" | "refinance" | "cash_out_refi" | "heloc";
export type PropertyTypeOpt = "single_family" | "condo" | "townhome" | "multi_unit" | "mobile";
export type Occupancy = "primary" | "secondary" | "investment";
export type TimelineOpt = "immediately" | "1_3_months" | "3_6_months" | "just_browsing";
export type CreditRange = "excellent" | "good" | "fair" | "needs_work";
export type ContactTime = "morning" | "afternoon" | "evening";
export type ReferralSource = "realtor" | "zillow" | "paid_ads" | "social" | "repeat" | "other";

export interface IntakeData {
  // Basics
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  source_id?: string | null;
  preferred_contact_time?: ContactTime | "";
  referral_source?: ReferralSource | "";
  // Intent
  loan_purpose?: LoanPurpose | "";
  property_type?: PropertyTypeOpt | "";
  occupancy?: Occupancy | "";
  timeline?: TimelineOpt | "";
  property_value?: number | null;
  down_payment?: number | null;
  credit_range?: CreditRange | "";
  // Financial
  annual_income?: number | null;
  monthly_debts?: number | null;
  employment_type?: string | "";
  self_employed?: boolean;
  // Notes
  notes?: string;
}

export const EMPTY_INTAKE: IntakeData = {
  first_name: "", last_name: "", email: "", phone: "",
  source_id: null, preferred_contact_time: "", referral_source: "",
  loan_purpose: "", property_type: "", occupancy: "", timeline: "",
  property_value: null, down_payment: null, credit_range: "",
  annual_income: null, monthly_debts: null, employment_type: "",
  self_employed: false, notes: "",
};

const FIELDS_FOR_SCORE: (keyof IntakeData)[] = [
  "first_name","last_name","email","phone","loan_purpose","property_type",
  "occupancy","timeline","property_value","down_payment","credit_range",
  "annual_income","monthly_debts","employment_type",
];

export function computeScore(d: IntakeData): number {
  let filled = 0;
  for (const k of FIELDS_FOR_SCORE) {
    const v: any = (d as any)[k];
    if (v !== null && v !== undefined && v !== "" && !(typeof v === "number" && Number.isNaN(v))) filled++;
  }
  return Math.round((filled / FIELDS_FOR_SCORE.length) * 100);
}

export function computeTemperature(score: number): "hot" | "warm" | "cold" {
  if (score >= 60) return "hot";
  if (score >= 30) return "warm";
  return "cold";
}

export function computeDti(d: IntakeData): number {
  const inc = Number(d.annual_income ?? 0);
  const debts = Number(d.monthly_debts ?? 0);
  if (inc <= 0) return 0;
  const monthlyIncome = inc / 12;
  if (monthlyIncome <= 0) return 0;
  return Math.round((debts / monthlyIncome) * 100);
}

export function estimateMonthlyPayment(d: IntakeData): number {
  const price = Number(d.property_value ?? 0);
  const down = Number(d.down_payment ?? 0);
  const principal = Math.max(price - down, 0);
  if (principal <= 0) return 0;
  // Rough P&I @ 6.75% / 30yr + 0.35% tax + ins escrow approximation
  const rate = 0.0675 / 12;
  const n = 360;
  const pi = (principal * rate) / (1 - Math.pow(1 + rate, -n));
  const escrow = (price * 0.015) / 12;
  return Math.round(pi + escrow);
}

export interface Signals {
  positives: string[];
  challenges: string[];
  recommendations: string[];
  summary: string;
}

export function deriveSignals(d: IntakeData): Signals {
  const positives: string[] = [];
  const challenges: string[] = [];
  const recommendations: string[] = [];
  const price = Number(d.property_value ?? 0);
  const down = Number(d.down_payment ?? 0);
  const downPct = price > 0 ? (down / price) * 100 : 0;
  const dti = computeDti(d);

  if (d.credit_range === "needs_work") {
    positives.push("Pre-qualification possible with credit guidance");
    challenges.push("Credit score below conventional threshold");
    recommendations.push("Schedule credit consultation");
  }
  if (d.credit_range === "excellent") positives.push("Strong credit profile (740+)");
  if (price > 0 && downPct < 5) {
    positives.push("May qualify for FHA/VA");
    challenges.push("Limited down payment funds");
  }
  if (d.self_employed) {
    challenges.push("Additional documentation required");
    recommendations.push("Request 2 years tax returns");
  }
  if (d.timeline === "immediately") recommendations.push("Fast-track pre-approval");
  if (d.loan_purpose === "purchase" && d.property_type === "condo") {
    challenges.push("Condo questionnaire may be required");
  }
  if (dti > 43) {
    challenges.push("DTI may exceed conforming limits");
    recommendations.push("Consider larger down payment or different loan program");
  }
  if ((d.annual_income ?? 0) > 150000 && dti < 35) positives.push("Strong income with healthy DTI");

  const name = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Borrower";
  const score = computeScore(d);
  const temp = computeTemperature(score);
  const summary = `${name} is ${temp}. Purpose: ${d.loan_purpose || "n/a"}, timeline: ${d.timeline || "n/a"}, est. DTI ${dti}%. Score ${score}.`;
  return { positives, challenges, recommendations, summary };
}

export interface SaveResult { leadId: string }

export async function saveLeadIntake(
  userId: string,
  existingLeadId: string | null,
  data: IntakeData,
): Promise<SaveResult> {
  const score = computeScore(data);
  const temp = computeTemperature(score);
  const signals = deriveSignals(data);
  const dti = computeDti(data);
  const monthly = estimateMonthlyPayment(data);

  const leadRow: any = {
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email || null,
    phone: data.phone || null,
    source_id: data.source_id || null,
    source: data.referral_source || undefined,
    loan_purpose: data.loan_purpose || null,
    property_type: data.property_type || null,
    property_value: data.property_value ?? null,
    credit_range: data.credit_range || null,
    employment_type: data.self_employed ? "self_employed" : (data.employment_type || null),
    annual_income: data.annual_income ?? null,
    timeline: data.timeline || null,
    lead_score: score,
    notes: data.notes || null,
  };

  let leadId = existingLeadId;
  if (!leadId) {
    const { data: created, error } = await supabase
      .from("leads")
      .insert({ ...leadRow, created_by: userId })
      .select("id")
      .single();
    if (error) throw error;
    leadId = created!.id as string;
  } else {
    const { error } = await supabase.from("leads").update(leadRow).eq("id", leadId);
    if (error) throw error;
  }

  // mortgage_profiles upsert (lead_id unique)
  const mpNotes = JSON.stringify({
    monthly_debts: data.monthly_debts ?? null,
    self_employed: !!data.self_employed,
    preferred_contact_time: data.preferred_contact_time || null,
    referral_source: data.referral_source || null,
  });
  const { data: existingMp } = await supabase
    .from("mortgage_profiles").select("id").eq("lead_id", leadId).maybeSingle();
  const mpRow: any = {
    lead_id: leadId,
    property_type: data.property_type || null,
    occupancy_type: data.occupancy || null,
    purchase_price: data.property_value ?? null,
    down_payment: data.down_payment ?? null,
    est_income: data.annual_income ?? null,
    est_dti: dti || null,
    est_monthly_payment: monthly || null,
    notes: mpNotes,
  };
  if (existingMp?.id) {
    await supabase.from("mortgage_profiles").update(mpRow).eq("id", existingMp.id);
  } else {
    await supabase.from("mortgage_profiles").insert(mpRow);
  }

  // lead_sentiment upsert
  await supabase.from("lead_sentiment").upsert({
    lead_id: leadId,
    temperature: temp,
    summary: signals.summary,
    positives: signals.positives as any,
    challenges: signals.challenges as any,
    recommendations: signals.recommendations as any,
    generated_at: new Date().toISOString(),
  } as any, { onConflict: "lead_id" });

  // lead_events
  await supabase.from("lead_events").insert({
    lead_id: leadId,
    event_type: "intake_completed",
    points: 5,
    metadata: { score, temperature: temp, dti } as any,
  });

  return { leadId: leadId! };
}

export function intakeFromLead(lead: any, mp: any | null): IntakeData {
  let mpExtras: any = {};
  try { mpExtras = mp?.notes ? JSON.parse(mp.notes) : {}; } catch { mpExtras = {}; }
  return {
    first_name: lead?.first_name ?? "",
    last_name: lead?.last_name ?? "",
    email: lead?.email ?? "",
    phone: lead?.phone ?? "",
    source_id: lead?.source_id ?? null,
    preferred_contact_time: mpExtras.preferred_contact_time ?? "",
    referral_source: (mpExtras.referral_source ?? lead?.source) ?? "",
    loan_purpose: lead?.loan_purpose ?? "",
    property_type: lead?.property_type ?? mp?.property_type ?? "",
    occupancy: mp?.occupancy_type ?? "",
    timeline: lead?.timeline ?? "",
    property_value: lead?.property_value ?? mp?.purchase_price ?? null,
    down_payment: mp?.down_payment ?? null,
    credit_range: lead?.credit_range ?? "",
    annual_income: lead?.annual_income ?? mp?.est_income ?? null,
    monthly_debts: mpExtras.monthly_debts ?? null,
    employment_type: lead?.employment_type === "self_employed" ? "" : (lead?.employment_type ?? ""),
    self_employed: !!mpExtras.self_employed || lead?.employment_type === "self_employed",
    notes: lead?.notes ?? "",
  };
}