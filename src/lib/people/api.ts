import { supabase } from "@/integrations/supabase/client";

export type PersonRoleType =
  | "Contact" | "Lead" | "Borrower" | "CoBorrower"
  | "Realtor" | "ReferralPartner" | "Builder" | "Attorney" | "Vendor";

export const ALL_ROLES: PersonRoleType[] = [
  "Contact", "Lead", "Borrower", "CoBorrower",
  "Realtor", "ReferralPartner", "Builder", "Attorney", "Vendor",
];

export type Person = {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  alternate_phone: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type PersonRole = {
  id: string;
  person_id: string;
  role_type: PersonRoleType;
  created_at: string;
};

export type MatchRow = {
  person_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  city: string | null;
  zip: string | null;
  match_tier: number;
  match_reason: string;
  confidence: "High" | "Medium" | "Low";
  similarity: number;
};

export function normalizeEmail(v: string | null | undefined) {
  return (v ?? "").trim().toLowerCase() || null;
}
export function normalizePhone(v: string | null | undefined) {
  return (v ?? "").replace(/[^0-9]/g, "") || null;
}

export async function listPeople(opts?: { search?: string; role?: PersonRoleType }): Promise<Person[]> {
  let q = supabase.from("people").select("*").order("created_at", { ascending: false }).limit(500);
  if (opts?.search) {
    const s = opts.search.trim();
    q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  let rows = (data ?? []) as Person[];
  if (opts?.role) {
    const { data: roleRows } = await supabase
      .from("person_roles").select("person_id").eq("role_type", opts.role);
    const ids = new Set((roleRows ?? []).map((r: any) => r.person_id));
    rows = rows.filter((p) => ids.has(p.id));
  }
  return rows;
}

export async function getPerson(id: string): Promise<Person | null> {
  const { data, error } = await supabase.from("people").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Person | null;
}

export async function getPersonRoles(personId: string): Promise<PersonRole[]> {
  const { data, error } = await supabase
    .from("person_roles").select("*").eq("person_id", personId).order("created_at");
  if (error) throw error;
  return (data ?? []) as PersonRole[];
}

export async function addPersonRole(personId: string, role: PersonRoleType) {
  const { data: user } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("person_roles")
    .insert({ person_id: personId, role_type: role, assigned_by: user.user?.id ?? null });
  if (error && !error.message.includes("duplicate")) throw error;
  await supabase.from("person_audit_log").insert({
    person_id: personId, actor_id: user.user?.id ?? null,
    action: "role_added", details: { role },
  });
}

export async function removePersonRole(personId: string, role: PersonRoleType) {
  const { data: user } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("person_roles").delete().eq("person_id", personId).eq("role_type", role);
  if (error) throw error;
  await supabase.from("person_audit_log").insert({
    person_id: personId, actor_id: user.user?.id ?? null,
    action: "role_removed", details: { role },
  });
}

export async function findMatches(input: { email?: string; phone?: string; name?: string }): Promise<MatchRow[]> {
  const { data, error } = await supabase.rpc("find_person_matches", {
    _email: input.email ?? null,
    _phone: input.phone ?? null,
    _name: input.name ?? null,
  });
  if (error) throw error;
  return (data ?? []) as MatchRow[];
}

export async function createPerson(input: Partial<Person>, roles: PersonRoleType[] = []): Promise<Person> {
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("people")
    .insert({
      first_name: input.first_name ?? "",
      middle_name: input.middle_name ?? null,
      last_name: input.last_name ?? "",
      email: input.email ?? null,
      phone: input.phone ?? null,
      alternate_phone: input.alternate_phone ?? null,
      company: input.company ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      zip: input.zip ?? null,
      date_of_birth: input.date_of_birth ?? null,
      created_by: user.user?.id ?? null,
    })
    .select("*").single();
  if (error) throw error;
  const person = data as Person;
  for (const r of roles) await addPersonRole(person.id, r);
  await supabase.from("person_audit_log").insert({
    person_id: person.id, actor_id: user.user?.id ?? null,
    action: "person_created", details: { roles },
  });
  return person;
}

export async function updatePerson(id: string, patch: Partial<Person>): Promise<Person> {
  const { data, error } = await supabase
    .from("people").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Person;
}

export async function convertToLead(personId: string): Promise<{ lead_id: string; was_existing: boolean }> {
  const { data, error } = await supabase.rpc("convert_person_to_lead", { _person_id: personId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { lead_id: string; was_existing: boolean };
}

export async function getLinkedLeads(personId: string) {
  const { data, error } = await supabase
    .from("leads").select("id, status, source, created_at, assigned_to")
    .eq("person_id", personId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getLinkedContacts(personId: string) {
  const { data, error } = await supabase
    .from("contacts").select("id, contact_type, role, created_at")
    .eq("person_id", personId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPersonAuditLog(personId: string) {
  const { data, error } = await supabase
    .from("person_audit_log").select("*").eq("person_id", personId)
    .order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
}