import { supabase } from "@/integrations/supabase/client";

export type PaymentDetails = {
  id?: string;
  lead_id: string;
  contact_id?: string | null;
  borrower_type: "employed" | "self_employed";
  pay_period_type: string;
  pay_stub_ending_date: string | null;
  pay_stub_period_days: number | null;
  pay_stub_gross_base: number;
  pay_stub_overtime: number;
  pay_stub_bonus: number;
  pay_stub_commission: number;
  w2_year_1: number | null;
  w2_year_1_wages: number;
  w2_year_2: number | null;
  w2_year_2_wages: number;
  ytd_total: number;
  ytd_as_of_date: string | null;
  se_avg_monthly_net: number;
};

export async function fetchPaymentDetails(
  leadId: string,
  contactId?: string | null,
): Promise<PaymentDetails | null> {
  let q = (supabase as any)
    .from("borrower_payment_details")
    .select("*")
    .eq("lead_id", leadId);
  if (contactId) q = q.eq("contact_id", contactId);
  else q = q.is("contact_id", null);
  const { data, error } = await q
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as PaymentDetails) ?? null;
}

export async function savePaymentDetails(input: PaymentDetails) {
  // upsert by (lead_id, contact_id) — latest row replaces snapshot per borrower
  const existing = await fetchPaymentDetails(input.lead_id, input.contact_id ?? null).catch(() => null);
  if (existing?.id) {
    const { data, error } = await (supabase as any)
      .from("borrower_payment_details")
      .update({ ...input })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as PaymentDetails;
  }
  const { data, error } = await (supabase as any)
    .from("borrower_payment_details")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as PaymentDetails;
}

export async function calculateIncomeFromInputs(leadId: string, contactId?: string | null, borrowerName?: string | null) {
  const { data, error } = await supabase.functions.invoke("calculate-income", {
    body: { lead_id: leadId, contact_id: contactId ?? null, borrower_name: borrowerName ?? null, mode: "calculate" },
  });
  if (error) throw error;
  return data as { calculation: any; income_conditions: any[] };
}