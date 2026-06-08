import { supabase } from "@/integrations/supabase/client";

export type DealBorrower = {
  contactId: string | null;
  name: string;
  isPrimary: boolean;
  role?: string | null;
};

const BORROWER_ROLES = new Set(["primary_borrower", "co_borrower", "guarantor"]);
const NON_BORROWER_TYPES = new Set([
  "partner", "realtor", "attorney", "title", "escrow", "insurance",
  "appraiser", "inspector", "lender", "loan_officer", "processor",
  "referral", "vendor", "other",
]);

const isBorrowerType = (t: any) => {
  const v = String(t ?? "").toLowerCase();
  if (!v) return true; // unknown defaults to borrower
  if (v === "borrower") return true;
  return !NON_BORROWER_TYPES.has(v);
};

const fullName = (c: any, fallback = "Borrower") => {
  const name = `${c?.first_name ?? ""} ${c?.last_name ?? ""}`.trim();
  return name || fallback;
};

/**
 * Resolve deal borrowers from the canonical lead_contacts relationship, with
 * additive fallbacks for legacy contacts.lead_id, leads.co_borrower_id, and
 * pipeline primary contact references. Only borrower contacts are included
 * unless a row is explicitly marked primary.
 */
export async function fetchDealBorrowers(leadId: string, fallbackName = "Borrower"): Promise<DealBorrower[]> {
  const [{ data: linkRows }, { data: lead }, { data: opportunityRows }, { data: directContacts }] = await Promise.all([
    (supabase as any)
      .from("lead_contacts")
      .select("contact_id,is_primary,role_on_deal,role")
      .eq("lead_id", leadId),
    (supabase as any)
      .from("leads")
      .select("first_name,last_name,co_borrower_id")
      .eq("id", leadId)
      .maybeSingle(),
    (supabase as any)
      .from("pipeline_opportunities")
      .select("primary_contact_id")
      .eq("lead_id", leadId),
    (supabase as any)
      .from("contacts")
      .select("id,first_name,last_name,contact_type,lead_id")
      .eq("lead_id", leadId)
      .eq("contact_type", "borrower"),
  ]);

  const contactIds = new Set<string>();
  for (const r of linkRows ?? []) if (r.contact_id) contactIds.add(r.contact_id);
  for (const c of directContacts ?? []) if (c.id) contactIds.add(c.id);
  if (lead?.co_borrower_id) contactIds.add(lead.co_borrower_id);
  for (const o of opportunityRows ?? []) if (o.primary_contact_id) contactIds.add(o.primary_contact_id);

  const contactMap = new Map<string, any>();
  for (const c of directContacts ?? []) contactMap.set(c.id, c);
  if (contactIds.size > 0) {
    const { data: contacts } = await (supabase as any)
      .from("contacts")
      .select("id,first_name,last_name,contact_type,lead_id")
      .in("id", Array.from(contactIds));
    for (const c of contacts ?? []) contactMap.set(c.id, c);
  }

  const byId = new Map<string, DealBorrower>();
  const linkByContact = new Map<string, any>();
  for (const r of linkRows ?? []) if (r.contact_id) linkByContact.set(r.contact_id, r);

  const primaryIds = new Set<string>();
  for (const r of linkRows ?? []) if (r.is_primary && r.contact_id) primaryIds.add(r.contact_id);
  for (const o of opportunityRows ?? []) if (o.primary_contact_id) primaryIds.add(o.primary_contact_id);

  const addBorrower = (contactId: string, forcedPrimary = false) => {
    const c = contactMap.get(contactId);
    const link = linkByContact.get(contactId);
    const role = link?.role_on_deal ?? link?.role ?? null;
    // Hard-exclude explicitly non-borrower contact types (partner, realtor, etc.)
    // even if a stale lead_contacts row marks them as primary_borrower.
    if (c && !isBorrowerType(c.contact_type)) return;
    const isBorrowerContact = c?.contact_type === "borrower" || !c?.contact_type;
    const isPrimary = forcedPrimary || !!link?.is_primary || primaryIds.has(contactId);
    const isBorrowerRole = role ? BORROWER_ROLES.has(String(role)) : false;

    if (!isBorrowerContact && !isPrimary && !isBorrowerRole) return;

    const current = byId.get(contactId);
    byId.set(contactId, {
      contactId,
      name: fullName(c),
      isPrimary: current?.isPrimary || isPrimary,
      role: current?.role ?? role,
    });
  };

  for (const r of linkRows ?? []) if (r.contact_id) addBorrower(r.contact_id, !!r.is_primary);
  for (const c of directContacts ?? []) if (c.id) addBorrower(c.id, false);
  if (lead?.co_borrower_id) addBorrower(lead.co_borrower_id, false);
  for (const o of opportunityRows ?? []) if (o.primary_contact_id) addBorrower(o.primary_contact_id, true);

  let borrowers = Array.from(byId.values()).sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return Number(b.isPrimary) - Number(a.isPrimary);
    return a.name.localeCompare(b.name);
  });

  // If no borrower is primary (e.g. the previously-flagged primary was a partner
  // and got excluded), promote the first borrower to primary.
  if (borrowers.length > 0 && !borrowers.some((b) => b.isPrimary)) {
    borrowers = borrowers.map((b, i) => (i === 0 ? { ...b, isPrimary: true } : b));
  }

  if (borrowers.length > 0) return borrowers;

  // No explicit borrower contacts on this deal. Do NOT synthesize a borrower
  // from the lead's own first/last name — the lead record may be the deal
  // owner / referrer (e.g. a partner) rather than an actual borrower. Callers
  // should handle the empty state.
  return [];
}