import { supabase } from "@/integrations/supabase/client";

export type RecordKind = "lead" | "contact";

export async function fetchLead(id: string) {
  const { data, error } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchContact(id: string) {
  const { data, error } = await supabase.from("contacts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchActivities(opts: { leadId?: string; contactId?: string }) {
  let q = supabase.from("crm_activities").select("*").order("created_at", { ascending: false }).limit(200);
  if (opts.leadId) q = q.eq("lead_id", opts.leadId);
  if (opts.contactId) q = q.eq("contact_id", opts.contactId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchMortgageProfile(leadId: string) {
  const { data } = await supabase.from("mortgage_profiles").select("*").eq("lead_id", leadId).maybeSingle();
  return data;
}

export async function fetchSentiment(leadId: string) {
  const { data } = await supabase.from("lead_sentiment").select("*").eq("lead_id", leadId).maybeSingle();
  return data;
}

export async function fetchTags(leadId: string) {
  const { data } = await supabase.from("lead_tags").select("*").eq("lead_id", leadId);
  return data ?? [];
}

export async function fetchEmailLogs(leadId: string) {
  const { data } = await supabase
    .from("email_logs").select("*").eq("lead_id", leadId)
    .order("sent_at", { ascending: false }).limit(50);
  return data ?? [];
}

export async function fetchAttachments(leadId: string) {
  const { data } = await supabase
    .from("crm_attachments").select("*").eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchDocCategories() {
  const { data } = await supabase.from("crm_document_categories").select("*").order("sort_order");
  return data ?? [];
}

export async function fetchDeals(contactId?: string) {
  if (!contactId) return [];
  const { data } = await supabase.from("deals").select("*").eq("contact_id", contactId);
  return data ?? [];
}

export async function fetchCompanies(leadId?: string, contactId?: string) {
  let q = supabase
    .from("crm_contact_companies")
    .select("*, company:crm_companies(*)");
  if (leadId) q = q.eq("lead_id", leadId);
  else if (contactId) q = q.eq("contact_id", contactId);
  else return [];
  const { data } = await q;
  return data ?? [];
}