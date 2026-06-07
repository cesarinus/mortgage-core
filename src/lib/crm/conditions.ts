import { supabase } from "@/integrations/supabase/client";

export type LoanCondition = {
  id: string;
  lead_id: string;
  pipeline_opportunity_id: string | null;
  condition_type: string;
  category: string;
  title: string;
  description: string | null;
  required: boolean;
  status: "pending" | "received" | "waived";
  received_at: string | null;
  received_via: string | null;
  document_url: string | null;
  document_name: string | null;
  notes: string | null;
  source: string;
  ocr_status: string;
  created_at: string;
  updated_at: string;
};

export const CONDITION_CATEGORIES: { key: string; label: string }[] = [
  { key: "income", label: "Income" },
  { key: "asset", label: "Assets" },
  { key: "id", label: "ID" },
  { key: "liability", label: "Liabilities" },
  { key: "other", label: "Other" },
];

export async function fetchConditions(leadId: string): Promise<LoanCondition[]> {
  const { data, error } = await (supabase as any)
    .from("loan_conditions")
    .select("*")
    .eq("lead_id", leadId)
    .order("category", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as LoanCondition[];
}

export async function updateConditionStatus(
  id: string,
  status: "pending" | "received" | "waived",
) {
  const patch: any = { status };
  if (status !== "received") {
    patch.received_at = null;
    patch.received_via = null;
  }
  const { error } = await (supabase as any)
    .from("loan_conditions")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

export async function markConditionReceived(
  id: string,
  payload: {
    received_at: string;
    received_via: string;
    notes?: string | null;
    document_url?: string | null;
    document_name?: string | null;
  },
) {
  const { error } = await (supabase as any)
    .from("loan_conditions")
    .update({
      status: "received",
      source: "manual",
      ...payload,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function uploadConditionFile(
  leadId: string,
  conditionId: string,
  file: File,
): Promise<{ path: string; name: string }> {
  const path = `conditions/${leadId}/${conditionId}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage
    .from("crm-documents")
    .upload(path, file, { upsert: false });
  if (error) throw error;
  return { path, name: file.name };
}