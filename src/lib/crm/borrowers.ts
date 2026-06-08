import { supabase } from "@/integrations/supabase/client";

export type DealBorrower = {
  contactId: string | null;
  name: string;
  isPrimary: boolean;
  role?: string | null;
  borrowerType?: "employee" | "self_employed" | string | null;
};

const BORROWER_ROLES = new Set(["primary_borrower", "co_borrower", "guarantor"]);
const NON_BORROWER_TYPES = new Set([
  "partner", "realtor", "attorney", "title", "escrow", "insurance",
  "appraiser", "inspector", "lender", "loan_officer", "processor",
  "referral", "vendor", "other",
]);

const isBorrowerType = (t: any) => {
  const v = String(t ?? "").toLowerCase();
  if (!v) return true;
  if (v === "borrower") return true;
  return !NON_BORROWER_TYPES.has(v);
};

const fullName = (c: any, fallback = "Borrower") => {
  const name = `${c?.first_name ?? ""} ${c?.last_name ?? ""}`.trim();
  return name || fallback;
};

/**
 * Resolve deal borrowers.
 *
 * Canonical rule: the LEAD record itself is always the primary borrower —
 * that is the person shown in the left rail of the deal workspace (above
 * the pipeline-stage selector). Contacts linked through lead_contacts
 * with contact_type = "borrower" are added as co-borrowers. Partners,
 * realtors, title agents, etc. are hard-excluded regardless of any stale
 * `is_primary` / `role_on_deal` flag.
 */
export async function fetchDealBorrowers(leadId: string, fallbackName = "Borrower"): Promise<DealBorrower[]> {
  const [{ data: linkRows }, { data: lead }, { data: directContacts }] = await Promise.all([
    (supabase as any)
      .from("lead_contacts")
      .select("contact_id,is_primary,role_on_deal,role")
      .eq("lead_id", leadId),
    (supabase as any)
      .from("leads")
      .select("first_name,last_name,co_borrower_id,email")
      .eq("id", leadId)
      .maybeSingle(),
    (supabase as any)
      .from("contacts")
      .select("id,first_name,last_name,contact_type,lead_id,email,borrower_type")
      .eq("lead_id", leadId)
      .eq("contact_type", "borrower"),
  ]);

  const contactIds = new Set<string>();
  for (const r of linkRows ?? []) if (r.contact_id) contactIds.add(r.contact_id);
  for (const c of directContacts ?? []) if (c.id) contactIds.add(c.id);
  if (lead?.co_borrower_id) contactIds.add(lead.co_borrower_id);

  const contactMap = new Map<string, any>();
  for (const c of directContacts ?? []) contactMap.set(c.id, c);
  if (contactIds.size > 0) {
    const { data: contacts } = await (supabase as any)
      .from("contacts")
      .select("id,first_name,last_name,contact_type,lead_id,email,borrower_type")
      .in("id", Array.from(contactIds));
    for (const c of contacts ?? []) contactMap.set(c.id, c);
  }

  const linkByContact = new Map<string, any>();
  for (const r of linkRows ?? []) if (r.contact_id) linkByContact.set(r.contact_id, r);

  const leadEmailLc = String((lead as any)?.email ?? "").trim().toLowerCase();
  const isLeadDuplicate = (c: any) => {
    if (!c) return false;
    const ce = String(c.email ?? "").trim().toLowerCase();
    if (leadEmailLc && ce && ce === leadEmailLc) return true;
    return false;
  };

  const byId = new Map<string, DealBorrower>();
  const addCoBorrower = (contactId: string) => {
    const c = contactMap.get(contactId);
    const link = linkByContact.get(contactId);
    const role = link?.role_on_deal ?? link?.role ?? null;
    if (c && !isBorrowerType(c.contact_type)) return;
    if (isLeadDuplicate(c)) return;
    const isBorrowerContact = c?.contact_type === "borrower" || !c?.contact_type;
    const isBorrowerRole = role ? BORROWER_ROLES.has(String(role)) : false;
    if (!isBorrowerContact && !isBorrowerRole) return;
    const existing = byId.get(contactId);
    byId.set(contactId, {
      contactId,
      name: fullName(c),
      isPrimary: false,
      role: existing?.role ?? role,
      borrowerType: existing?.borrowerType ?? (c?.borrower_type ?? null),
    });
  };

  for (const r of linkRows ?? []) if (r.contact_id) addCoBorrower(r.contact_id);
  for (const c of directContacts ?? []) if (c.id) addCoBorrower(c.id);
  if (lead?.co_borrower_id) addCoBorrower(lead.co_borrower_id);

  const coBorrowers = Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));

  const primaryName = `${(lead as any)?.first_name ?? ""} ${(lead as any)?.last_name ?? ""}`.trim() || fallbackName;
  const primary: DealBorrower = {
    contactId: null,
    name: primaryName,
    isPrimary: true,
    role: "primary_borrower",
    borrowerType: null,
  };

  return [primary, ...coBorrowers];
}
