import { supabase } from "@/integrations/supabase/client";
import type { PaymentDetails } from "@/lib/crm/paymentDetails";

export type IncomeExtraction = {
  id: string;
  attachment_id: string;
  lead_id: string | null;
  contact_id: string | null;
  doc_type: "pay_stub" | "w2" | "form_1099" | "form_1040" | "business_return" | "unknown";
  tax_year: number | null;
  period_ending_date: string | null;
  extracted: any;
  confidence: number | null;
  status: "pending" | "applied" | "dismissed" | "failed";
  error: string | null;
  model: string | null;
  created_at: string;
  // joined fields:
  attachment?: { file_name: string; category_slug: string | null } | null;
};

export async function fetchPendingExtractions(leadId: string, contactId?: string | null): Promise<IncomeExtraction[]> {
  let q = (supabase as any)
    .from("income_document_extractions")
    .select("*, attachment:crm_attachments(file_name, category_slug)")
    .eq("lead_id", leadId)
    .in("status", ["pending", "failed"]);
  if (contactId) q = q.or(`contact_id.eq.${contactId},contact_id.is.null`);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as IncomeExtraction[];
}

export async function dismissExtraction(id: string) {
  const { error } = await (supabase as any)
    .from("income_document_extractions")
    .update({ status: "dismissed" })
    .eq("id", id);
  if (error) throw error;
}

export async function markApplied(id: string) {
  const { error } = await (supabase as any)
    .from("income_document_extractions")
    .update({ status: "applied", applied_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Merge extracted values from one extraction into the payment-details form state. */
export function mergeIntoPaymentDetails(form: PaymentDetails, ext: IncomeExtraction): PaymentDetails {
  const e = ext.extracted ?? {};
  const next: PaymentDetails = { ...form };

  if (ext.doc_type === "pay_stub" && e.pay_stub) {
    const p = e.pay_stub;
    if (typeof p.gross_base_ytd === "number") next.pay_stub_gross_base = p.gross_base_ytd;
    if (typeof p.overtime_ytd === "number") next.pay_stub_overtime = p.overtime_ytd;
    if (typeof p.bonus_ytd === "number") next.pay_stub_bonus = p.bonus_ytd;
    if (typeof p.commission_ytd === "number") next.pay_stub_commission = p.commission_ytd;
    if (ext.period_ending_date) next.pay_stub_ending_date = ext.period_ending_date;
    if (p.pay_frequency) next.pay_period_type = p.pay_frequency;
  }

  if (ext.doc_type === "w2" && e.w2) {
    const wages = typeof e.w2.box1_wages === "number" ? e.w2.box1_wages : null;
    if (wages == null) return next;
    const year = ext.tax_year;
    const y1 = form.w2_year_1;
    const y2 = form.w2_year_2;
    // Place by year if known; otherwise fill the most-recent empty slot
    if (year != null) {
      if (y1 === year || !form.w2_year_1_wages) {
        next.w2_year_1 = year; next.w2_year_1_wages = wages;
      } else if (y2 === year || !form.w2_year_2_wages) {
        next.w2_year_2 = year; next.w2_year_2_wages = wages;
      }
    } else if (!form.w2_year_1_wages) {
      next.w2_year_1_wages = wages;
    } else if (!form.w2_year_2_wages) {
      next.w2_year_2_wages = wages;
    }
  }

  // 1099 / 1040 / business returns inform self-employed flow; we mirror totals into ytd_total as a starting point
  if (ext.doc_type === "form_1099" && e.form_1099) {
    const v = (e.form_1099.nonemployee_compensation ?? 0) + (e.form_1099.other_income ?? 0);
    if (v) next.ytd_total = (next.ytd_total ?? 0) + v;
  }

  return next;
}

export async function extractAttachment(attachmentId: string) {
  const { data, error } = await supabase.functions.invoke("extract-income-document", {
    body: { attachment_id: attachmentId },
  });
  if (error) throw error;
  return data;
}