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
    .select("*");
  if (leadId) q = q.eq("lead_id", leadId);
  else if (contactId) q = q.eq("contact_id", contactId);
  else return [];
  const { data } = await q;
  const rows = data ?? [];
  const companyIds = Array.from(new Set(rows.map((r: any) => r.company_id).filter(Boolean)));
  if (companyIds.length === 0) return rows;
  const { data: companies } = await supabase
    .from("crm_companies")
    .select("*")
    .in("id", companyIds);
  const byId = new Map((companies ?? []).map((c: any) => [c.id, c]));
  return rows.map((r: any) => ({ ...r, company: byId.get(r.company_id) ?? null }));
}

export async function fetchLeadContacts(leadId: string) {
  const { data } = await supabase
    .from("lead_contacts")
    .select("id, role, contact_id, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  const contactIds = Array.from(new Set(rows.map((r: any) => r.contact_id).filter(Boolean)));
  if (contactIds.length === 0) return rows;
  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .in("id", contactIds);
  const byId = new Map((contacts ?? []).map((c: any) => [c.id, c]));
  return rows.map((r: any) => ({ ...r, contact: byId.get(r.contact_id) ?? null }));
}

export async function fetchAllContacts() {
  const { data } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, contact_type")
    .order("first_name", { ascending: true });
  return data ?? [];
}

export async function fetchAllCompanies() {
  const { data } = await supabase
    .from("crm_companies")
    .select("id, name, industry, is_self_employed")
    .order("name", { ascending: true });
  return data ?? [];
}