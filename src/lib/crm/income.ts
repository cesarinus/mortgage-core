import { supabase } from "@/integrations/supabase/client";

export type IncomeCalc = {
  id: string;
  lead_id: string;
  contact_id?: string | null;
  borrower_name?: string | null;
  borrower_type: "employed" | "self_employed" | string;
  calculation_date: string;
  monthly_income: number | null;
  annual_income: number | null;
  base_income: number | null;
  overtime: number | null;
  bonus: number | null;
  commission: number | null;
  self_employment_income: number | null;
  other_income: number | null;
  years_average?: number | null;
  income_breakdown: any;
  source: "manual" | "ocr" | string;
  calculated_by: string;
  created_at: string;
};

export async function fetchLatestIncome(leadId: string, contactId?: string | null): Promise<IncomeCalc | null> {
  let q = (supabase as any)
    .from("borrower_income_calculations")
    .select("*")
    .eq("lead_id", leadId);
  if (contactId) q = q.eq("contact_id", contactId);
  else q = q.is("contact_id", null);
  const { data, error } = await q
    .order("calculation_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as IncomeCalc) ?? null;
}

/** Latest income calculation per contact_id for a lead. */
export async function fetchAllLatestIncome(leadId: string): Promise<IncomeCalc[]> {
  const { data, error } = await (supabase as any)
    .from("borrower_income_calculations")
    .select("*")
    .eq("lead_id", leadId)
    .order("calculation_date", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as IncomeCalc[];
  const byContact = new Map<string, IncomeCalc>();
  for (const r of rows) {
    const key = r.contact_id ?? "__primary__";
    if (!byContact.has(key)) byContact.set(key, r);
  }
  return Array.from(byContact.values());
}

export type IncomeInput = {
  lead_id: string;
  borrower_type: "employed" | "self_employed";
  base_income?: number;
  overtime?: number;
  bonus?: number;
  commission?: number;
  self_employment_income?: number;
  other_income?: number;
};

export function computeMonthly(input: IncomeInput): number {
  return (
    (input.base_income ?? 0) +
    (input.overtime ?? 0) +
    (input.bonus ?? 0) +
    (input.commission ?? 0) +
    (input.self_employment_income ?? 0) +
    (input.other_income ?? 0)
  );
}

export async function saveIncome(input: IncomeInput, calculatedBy = "manual") {
  const monthly = computeMonthly(input);
  const annual = monthly * 12;
  const row = {
    lead_id: input.lead_id,
    borrower_type: input.borrower_type,
    base_income: input.base_income ?? 0,
    overtime: input.overtime ?? 0,
    bonus: input.bonus ?? 0,
    commission: input.commission ?? 0,
    self_employment_income: input.self_employment_income ?? 0,
    other_income: input.other_income ?? 0,
    monthly_income: monthly,
    annual_income: annual,
    source: "manual",
    calculated_by: calculatedBy,
    income_breakdown: {
      base_income: input.base_income ?? 0,
      overtime: input.overtime ?? 0,
      bonus: input.bonus ?? 0,
      commission: input.commission ?? 0,
      self_employment_income: input.self_employment_income ?? 0,
      other_income: input.other_income ?? 0,
    },
  };
  const { data, error } = await (supabase as any)
    .from("borrower_income_calculations")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data as IncomeCalc;
}

export async function recalcIncome(leadId: string): Promise<IncomeCalc | null> {
  const { data, error } = await supabase.functions.invoke("calculate-income", {
    body: { lead_id: leadId, mode: "calculate" },
  });
  if (error) {
    // Graceful: missing payment details means we just have nothing to compute yet.
    return null;
  }
  return (data as any)?.calculation ?? null;
}