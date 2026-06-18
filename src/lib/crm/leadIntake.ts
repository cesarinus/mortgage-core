import { supabase } from "@/integrations/supabase/client";
import { calcLoanAmount } from "@/lib/loan/calcLoanAmount";
import { getCurrentMortgageRate } from "@/lib/mortgage/rateService";
import { estimatePayment, computeDtis } from "@/lib/mortgage/estimatePayment";

export type LoanPurpose = "purchase" | "refinance";
export type RefinanceType = "NoCashOut" | "LimitedCashOut" | "CashOut";
export type CashOutPurpose =
  | "DebtConsolidation"
  | "Education"
  | "HomeImprovement"
  | "InterestRateReduction"
  | "Other";
export type PropertyTypeOpt = "single_family" | "condo" | "townhome" | "multi_unit" | "mobile";
export type Occupancy = "primary" | "secondary" | "investment";
export type TimelineOpt = "immediately" | "1_3_months" | "3_6_months" | "just_browsing";
export type CreditRange = "excellent" | "good" | "fair" | "needs_work";
export type ContactTime = "morning" | "afternoon" | "evening";
export type ReferralSource = "realtor" | "zillow" | "paid_ads" | "social" | "repeat" | "other";
export type LoanTypeOpt = "conventional" | "fha" | "usda" | "va";

export interface IntakeData {
  // Basics
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  source_id?: string | null;
  preferred_contact_time?: ContactTime | "";
  referral_source?: ReferralSource | "";
  // Relationship lookups (Twenty-style)
  primary_borrower_id?: string | null;
  co_borrower_id?: string | null;
  company_id?: string | null;
  /** When the lead was created from / linked to an existing People record. */
  person_id?: string | null;
  // Intent
  loan_purpose?: LoanPurpose | "";
  loan_type?: LoanTypeOpt | "";
  refinance_type?: RefinanceType | "";
  cash_out_purpose?: CashOutPurpose | "";
  property_type?: PropertyTypeOpt | "";
  occupancy?: Occupancy | "";
  timeline?: TimelineOpt | "";
  property_value?: number | null;
  down_payment?: number | null;
  credit_range?: CreditRange | "";
  // Subject property
  property_address?: string;
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
  primary_borrower_id: null, co_borrower_id: null, company_id: null,
  person_id: null,
  loan_purpose: "", loan_type: "", refinance_type: "", cash_out_purpose: "",
  property_type: "", occupancy: "", timeline: "",
  property_value: null, down_payment: null, credit_range: "",
  property_address: "",
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

export async function estimateMonthlyPayment(d: IntakeData): Promise<number> {
  const price = Number(d.property_value ?? 0);
  if (price <= 0) return 0;
  const annualRate = await getCurrentMortgageRate();
  const res = estimatePayment({
    price,
    downPayment: Number(d.down_payment ?? 0),
    annualRatePct: annualRate,
    loanType: d.loan_type || null,
  });
  return res.totalMonthly;
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

export interface SaveResult {
  leadId: string;
  score: number;
  temperature: "hot" | "warm" | "cold";
  dti: number;
  monthly: number;
  signals: Signals;
  sentimentRow: any;
  mortgageRow: any;
  leadPatch: Record<string, any>;
}

export async function saveLeadIntake(
  userId: string,
  existingLeadId: string | null,
  data: IntakeData,
): Promise<SaveResult> {
  const score = computeScore(data);
  const temp = computeTemperature(score);
  const signals = deriveSignals(data);
  const dti = computeDti(data);
  const monthly = await estimateMonthlyPayment(data);

  const computedLoanAmount = calcLoanAmount({
    loan_type: data.loan_type || null,
    purchase_price: data.property_value ?? null,
    down_payment: data.down_payment ?? null,
  });

  const normalizedRefinanceType =
    data.loan_purpose === "refinance" ? (data.refinance_type || null) : null;
  const normalizedCashOutPurpose =
    data.loan_purpose === "refinance" && normalizedRefinanceType === "CashOut"
      ? (data.cash_out_purpose || null)
      : null;

  const leadRow: any = {
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email || null,
    phone: data.phone || null,
    source_id: data.source_id || null,
    source: data.referral_source || undefined,
    loan_purpose: data.loan_purpose || null,
    refinance_type: normalizedRefinanceType,
    cash_out_purpose: normalizedCashOutPurpose,
    property_type: data.property_type || null,
    property_value: data.property_value ?? null,
    loan_amount: computedLoanAmount ?? null,
    property_address: (data.property_address ?? "").trim() || null,
    credit_range: data.credit_range || null,
    employment_type: data.employment_type || (data.self_employed ? "self_employed" : null),
    annual_income: data.annual_income ?? null,
    timeline: data.timeline || null,
    lead_score: score,
    notes: data.notes || null,
    company_id: data.company_id || null,
    co_borrower_id: data.co_borrower_id || null,
    person_id: data.person_id || null,
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

  // Ensure a primary lead_contacts row exists for this lead.
  // If the user picked one, link it; otherwise auto-create a contact from intake basics.
  try {
    let primaryContactId: string | null = data.primary_borrower_id || null;
    if (!primaryContactId) {
      const { data: existingLink } = await supabase
        .from("lead_contacts")
        .select("contact_id")
        .eq("lead_id", leadId!)
        .eq("is_primary", true)
        .maybeSingle();
      if (existingLink?.contact_id) {
        primaryContactId = existingLink.contact_id as string;
      } else if (data.first_name || data.last_name) {
        const { data: createdContact, error: ccErr } = await supabase
          .from("contacts")
          .insert({
            first_name: data.first_name || "Unknown",
            last_name: data.last_name || "",
            email: data.email || null,
            phone: data.phone || null,
            contact_type: "borrower",
            role: "borrower",
            company_id: data.company_id || null,
            created_by: userId,
          } as any)
          .select("id")
          .maybeSingle();
        if (!ccErr) primaryContactId = createdContact?.id ?? null;
      }
    }
    if (primaryContactId) {
      // Unset existing primaries on this lead before promoting the new one
      await supabase
        .from("lead_contacts")
        .update({ is_primary: false })
        .eq("lead_id", leadId!)
        .neq("contact_id", primaryContactId);
      await supabase.from("lead_contacts").upsert(
        {
          lead_id: leadId!,
          contact_id: primaryContactId,
          role_on_deal: "primary_borrower" as any,
          is_primary: true,
          company_id: data.company_id || null,
          created_by: userId,
        } as any,
        { onConflict: "lead_id,contact_id" } as any,
      );
    }
    if (data.co_borrower_id) {
      await supabase.from("lead_contacts").upsert(
        {
          lead_id: leadId!,
          contact_id: data.co_borrower_id,
          role_on_deal: "co_borrower" as any,
          is_primary: false,
          created_by: userId,
        } as any,
        { onConflict: "lead_id,contact_id" } as any,
      );
    }
  } catch (linkErr) {
    console.warn("primary/co-borrower link failed:", (linkErr as any)?.message);
  }

  // mortgage_profiles upsert (lead_id unique)
  const mpNotes = JSON.stringify({
    monthly_debts: data.monthly_debts ?? null,
    self_employed: !!data.self_employed,
    preferred_contact_time: data.preferred_contact_time || null,
    referral_source: data.referral_source || null,
    loan_type: data.loan_type || null,
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
    const { error: mpErr } = await supabase.from("mortgage_profiles").update(mpRow).eq("id", existingMp.id);
    if (mpErr) throw mpErr;
  } else {
    const { error: mpErr } = await supabase.from("mortgage_profiles").insert(mpRow);
    if (mpErr) throw mpErr;
  }

  // lead_sentiment upsert
  const sentimentRow = {
    lead_id: leadId,
    temperature: temp,
    summary: signals.summary,
    positives: signals.positives as any,
    challenges: signals.challenges as any,
    recommendations: signals.recommendations as any,
    generated_at: new Date().toISOString(),
  };
  const { error: sErr } = await supabase
    .from("lead_sentiment")
    .upsert(sentimentRow as any, { onConflict: "lead_id" });
  if (sErr) throw sErr;

  // lead_events (non-fatal)
  const { error: evErr } = await supabase.from("lead_events").insert({
    lead_id: leadId,
    event_type: "intake_completed",
    points: 5,
    metadata: { score, temperature: temp, dti } as any,
  });
  if (evErr) console.warn("intake_completed event insert failed:", evErr.message);

  return {
    leadId: leadId!,
    score,
    temperature: temp,
    dti,
    monthly,
    signals,
    sentimentRow,
    mortgageRow: { ...mpRow },
    leadPatch: leadRow,
  };
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
    primary_borrower_id: null,
    co_borrower_id: lead?.co_borrower_id ?? null,
    company_id: lead?.company_id ?? null,
    preferred_contact_time: mpExtras.preferred_contact_time ?? "",
    referral_source: (mpExtras.referral_source ?? lead?.source) ?? "",
    loan_purpose: lead?.loan_purpose ?? "",
    loan_type: mpExtras.loan_type ?? "",
    refinance_type: lead?.refinance_type ?? "",
    cash_out_purpose: lead?.cash_out_purpose ?? "",
    property_type: lead?.property_type ?? mp?.property_type ?? "",
    occupancy: mp?.occupancy_type ?? "",
    timeline: lead?.timeline ?? "",
    property_value: lead?.property_value ?? mp?.purchase_price ?? null,
    property_address: lead?.property_address ?? "",
    down_payment: mp?.down_payment ?? null,
    credit_range: lead?.credit_range ?? "",
    annual_income: lead?.annual_income ?? mp?.est_income ?? null,
    monthly_debts: mpExtras.monthly_debts ?? null,
    employment_type: lead?.employment_type ?? (mpExtras.self_employed ? "self_employed" : ""),
    self_employed: !!mpExtras.self_employed || lead?.employment_type === "self_employed",
    notes: lead?.notes ?? "",
  };
}