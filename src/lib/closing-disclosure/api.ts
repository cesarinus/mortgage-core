import { supabase } from "@/integrations/supabase/client";
import type { ClosingDisclosureForm } from "./types";
import { createEmptyForm } from "./types";
import { computeTotals } from "./calc";

export const FORM_TYPE = "CFPB_H25A_6PG";
export const DEAL_TYPE = "Closing Disclosure";

const draftKey = (id: string) => `cd_draft_${id}`;

/** The CRM-ready payload emitted on submit. */
export function buildCrmPayload(form: ClosingDisclosureForm) {
  const totals = computeTotals(form);
  return {
    transactionInfo: {
      ...form.transactionInfo,
      closingInformation: form.closingInfo,
      property: form.property,
      loanInformation: form.loanInformation,
    },
    loanTerms: form.loanTerms,
    projectedPayments: form.projectedPayments,
    loanCosts: { ...form.loanCosts, otherCosts: form.otherCosts },
    cashToClose: { ...form.cashToClose, summary: form.closingCostsSummary },
    loanDisclosures: form.loanDisclosures,
    contactInfo: form.contactInfo,
    signatures: { ...form.signatures, otherDisclosures: form.otherDisclosures },
    loanCalculations: { ...form.loanCalculations, closingDetails: form.closingDetails },
    calculatedTotals: totals,
  };
}

export function saveLocalDraft(id: string, form: ClosingDisclosureForm) {
  try {
    localStorage.setItem(draftKey(id), JSON.stringify({ savedAt: new Date().toISOString(), form }));
  } catch {
    /* storage full / disabled — backend draft is the source of truth */
  }
}

export function readLocalDraft(id: string): ClosingDisclosureForm | null {
  try {
    const raw = localStorage.getItem(draftKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.form ? mergeForm(parsed.form) : null;
  } catch {
    return null;
  }
}

export function clearLocalDraft(id: string) {
  try {
    localStorage.removeItem(draftKey(id));
  } catch {
    /* noop */
  }
}

/** Deep-merge a stored payload onto the current schema so new fields never break old drafts. */
export function mergeForm(stored: unknown): ClosingDisclosureForm {
  const base = createEmptyForm() as unknown as Record<string, unknown>;
  const merge = (target: unknown, src: unknown): unknown => {
    if (Array.isArray(target)) return Array.isArray(src) ? src : target;
    if (target && typeof target === "object" && src && typeof src === "object") {
      const out: Record<string, unknown> = { ...(target as Record<string, unknown>) };
      for (const [k, v] of Object.entries(src as Record<string, unknown>)) {
        out[k] = k in out ? merge(out[k], v) : v;
      }
      return out;
    }
    return src === undefined ? target : src;
  };
  return merge(base, stored ?? {}) as ClosingDisclosureForm;
}

/** Rehydrate a form object from a stored crm_payload. */
export function formFromPayload(payload: Record<string, unknown> | null): ClosingDisclosureForm {
  if (!payload) return createEmptyForm();
  const t = (payload.transactionInfo ?? {}) as Record<string, unknown>;
  const lc = (payload.loanCosts ?? {}) as Record<string, unknown>;
  const ctc = (payload.cashToClose ?? {}) as Record<string, unknown>;
  const sig = (payload.signatures ?? {}) as Record<string, unknown>;
  const calcs = (payload.loanCalculations ?? {}) as Record<string, unknown>;
  const { closingInformation, property, loanInformation, ...transactionInfo } = t;
  const { otherCosts, ...loanCosts } = lc;
  const { summary, ...cashToClose } = ctc;
  const { otherDisclosures, ...signatures } = sig;
  const { closingDetails, ...loanCalculations } = calcs;

  return mergeForm({
    transactionInfo,
    closingInfo: closingInformation,
    property,
    loanInformation,
    loanTerms: payload.loanTerms,
    closingCostsSummary: summary,
    projectedPayments: payload.projectedPayments,
    loanCosts,
    otherCosts,
    cashToClose,
    loanDisclosures: payload.loanDisclosures,
    contactInfo: payload.contactInfo,
    otherDisclosures,
    signatures,
    loanCalculations,
    closingDetails,
  });
}

export interface DisclosureRecord {
  id: string;
  status: string;
  opportunity_id: string | null;
  lead_id: string | null;
  crm_payload: Record<string, unknown>;
  updated_at: string;
}

export async function fetchDisclosure(id: string): Promise<DisclosureRecord | null> {
  const { data, error } = await supabase
    .from("closing_disclosures")
    .select("id, status, opportunity_id, lead_id, crm_payload, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as DisclosureRecord | null) ?? null;
}

export async function fetchDisclosureForOpportunity(opportunityId: string) {
  const { data, error } = await supabase
    .from("closing_disclosures")
    .select("id, status, opportunity_id, lead_id, crm_payload, updated_at")
    .eq("opportunity_id", opportunityId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as DisclosureRecord | null) ?? null;
}

interface PersistArgs {
  id?: string | null;
  form: ClosingDisclosureForm;
  status: "draft" | "submitted";
  opportunityId?: string | null;
  leadId?: string | null;
}

/** Create or update the disclosure record. Returns the row id. */
export async function persistDisclosure({
  id,
  form,
  status,
  opportunityId,
  leadId,
}: PersistArgs): Promise<string> {
  const payload = {
    deal_type: DEAL_TYPE,
    form_type: FORM_TYPE,
    status,
    crm_payload: buildCrmPayload(form) as never,
    opportunity_id: opportunityId ?? null,
    lead_id: leadId ?? null,
    submitted_at: status === "submitted" ? new Date().toISOString() : null,
  };

  if (id) {
    const { error } = await supabase.from("closing_disclosures").update(payload).eq("id", id);
    if (error) throw error;
    return id;
  }

  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("closing_disclosures")
    .insert({ ...payload, created_by: userData?.user?.id })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function emailDisclosure(args: {
  id: string;
  to: string;
  subject: string;
  body: string;
  pdfBase64: string;
  filename: string;
  leadId?: string | null;
  opportunityId?: string | null;
}) {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: {
      to: args.to,
      subject: args.subject,
      html: args.body,
      lead_id: args.leadId ?? null,
      opportunity_id: args.opportunityId ?? null,
      attachments: [
        { filename: args.filename, content: args.pdfBase64, encoding: "base64", contentType: "application/pdf" },
      ],
    },
  });
  if (error) throw error;
  return data;
}
