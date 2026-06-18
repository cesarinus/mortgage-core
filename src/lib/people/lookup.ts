import { supabase } from "@/integrations/supabase/client";
import { findMatches, normalizeEmail, normalizePhone, type Person } from "./api";

export type LookupSource = "person" | "lead" | "portal";

export interface LookupResult {
  source: LookupSource;
  /** Person id when source === "person" or a person can be resolved. */
  personId: string | null;
  /** Lead id when source === "lead". */
  leadId: string | null;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  city: string | null;
  zip: string | null;
  confidence: "High" | "Medium" | "Low";
  matchReason: string;
  /** Sub-line shown in the dropdown (e.g. "Borrower Portal · Application Started"). */
  badge: string;
  /** Extra metadata to display (portal status, last login, etc). */
  meta?: Record<string, any>;
}

/** Split a full name into best-effort first/last halves. */
function splitName(full: string): { first: string; last: string } {
  const parts = (full ?? "").trim().split(/\s+/);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

/**
 * Real-time borrower search across People, Leads, and Borrower Portal.
 * Results are deduplicated by personId/email/phone and ranked People > Portal > Lead.
 */
export async function searchBorrowers(input: {
  name?: string;
  email?: string;
  phone?: string;
}): Promise<LookupResult[]> {
  const name = (input.name ?? "").trim();
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  if (!name && !email && !phone) return [];

  const out: LookupResult[] = [];
  const seen = new Set<string>();
  const dedupeKey = (r: LookupResult) =>
    r.personId ? `p:${r.personId}` :
    r.leadId ? `l:${r.leadId}` :
    `e:${r.email ?? ""}|ph:${r.phone ?? ""}|n:${r.fullName.toLowerCase()}`;

  // 1. People matches (highest signal — RPC handles email/phone/name fuzzy)
  try {
    const matches = await findMatches({ email: email ?? undefined, phone: phone ?? undefined, name: name || undefined });
    for (const m of matches) {
      const split = splitName(m.full_name);
      const r: LookupResult = {
        source: "person",
        personId: m.person_id,
        leadId: null,
        fullName: m.full_name,
        firstName: split.first,
        lastName: split.last,
        email: m.email,
        phone: m.phone,
        company: m.company,
        city: m.city,
        zip: m.zip,
        confidence: m.confidence,
        matchReason: m.match_reason,
        badge: "People Record",
      };
      const key = dedupeKey(r);
      if (!seen.has(key)) { seen.add(key); out.push(r); }
    }
  } catch {/* ignore */}

  // 2. Leads (exact email/phone, then name ilike)
  try {
    let q = supabase
      .from("leads")
      .select("id, first_name, last_name, email, phone, status, created_at, person_id")
      .limit(8);
    const ors: string[] = [];
    if (email) ors.push(`email.ilike.${email}`);
    if (phone) ors.push(`phone.ilike.%${phone.slice(-7)}%`);
    if (name) ors.push(`first_name.ilike.%${name}%`, `last_name.ilike.%${name}%`);
    if (ors.length === 0) throw new Error("skip");
    q = q.or(ors.join(","));
    const { data: rows } = await q;
    for (const l of rows ?? []) {
      const full = `${(l as any).first_name ?? ""} ${(l as any).last_name ?? ""}`.trim();
      const r: LookupResult = {
        source: "lead",
        personId: (l as any).person_id ?? null,
        leadId: (l as any).id,
        fullName: full || "(no name)",
        firstName: (l as any).first_name ?? "",
        lastName: (l as any).last_name ?? "",
        email: (l as any).email ?? null,
        phone: (l as any).phone ?? null,
        company: null,
        city: null,
        zip: null,
        confidence: email && (l as any).email?.toLowerCase() === email ? "High" : "Medium",
        matchReason: "lead",
        badge: `Lead · ${(l as any).status ?? "active"}`,
        meta: { created_at: (l as any).created_at },
      };
      const key = dedupeKey(r);
      if (!seen.has(key)) { seen.add(key); out.push(r); }
    }
  } catch {/* ignore */}

  // 3. Borrower Portal users — join via lead.email/phone since portal_users keys to deals/leads
  try {
    if (email || phone) {
      let lq = supabase.from("leads").select("id, first_name, last_name, email, phone").limit(8);
      const ors: string[] = [];
      if (email) ors.push(`email.ilike.${email}`);
      if (phone) ors.push(`phone.ilike.%${phone.slice(-7)}%`);
      if (ors.length) lq = lq.or(ors.join(","));
      const { data: leadRows } = await lq;
      const leadIds = (leadRows ?? []).map((l: any) => l.id);
      if (leadIds.length > 0) {
        const { data: pus } = await supabase
          .from("portal_users")
          .select("user_id, deal_id, lead_id, created_at")
          .in("lead_id", leadIds);
        for (const pu of pus ?? []) {
          const lead = (leadRows ?? []).find((l: any) => l.id === (pu as any).lead_id);
          if (!lead) continue;
          const full = `${(lead as any).first_name ?? ""} ${(lead as any).last_name ?? ""}`.trim();
          const r: LookupResult = {
            source: "portal",
            personId: null,
            leadId: (lead as any).id,
            fullName: full || "(portal user)",
            firstName: (lead as any).first_name ?? "",
            lastName: (lead as any).last_name ?? "",
            email: (lead as any).email ?? null,
            phone: (lead as any).phone ?? null,
            company: null,
            city: null,
            zip: null,
            confidence: "High",
            matchReason: "portal_user",
            badge: "Borrower Portal",
            meta: {
              deal_id: (pu as any).deal_id,
              portal_user_id: (pu as any).user_id,
              joined_at: (pu as any).created_at,
            },
          };
          const key = dedupeKey(r);
          if (!seen.has(key)) { seen.add(key); out.push(r); }
        }
      }
    }
  } catch {/* ignore */}

  // Rank: people first, then portal, then lead. Within source, confidence High > Medium.
  const srcRank: Record<LookupSource, number> = { person: 0, portal: 1, lead: 2 };
  const confRank: Record<LookupResult["confidence"], number> = { High: 0, Medium: 1, Low: 2 };
  out.sort((a, b) => (srcRank[a.source] - srcRank[b.source]) || (confRank[a.confidence] - confRank[b.confidence]));
  return out.slice(0, 8);
}

/** Resolve a lookup result to a fully populated Person record (creating one if needed). */
export async function resolvePersonFromLookup(r: LookupResult): Promise<Person | null> {
  if (r.personId) {
    const { data } = await supabase.from("people").select("*").eq("id", r.personId).maybeSingle();
    return (data as Person) ?? null;
  }
  // Try to find an existing person by email/phone before creating
  if (r.email) {
    const en = normalizeEmail(r.email);
    if (en) {
      const { data } = await supabase.from("people").select("*").eq("email_normalized", en).maybeSingle();
      if (data) return data as Person;
    }
  }
  if (r.phone) {
    const pn = normalizePhone(r.phone);
    if (pn) {
      const { data } = await supabase.from("people").select("*").eq("phone_normalized", pn).maybeSingle();
      if (data) return data as Person;
    }
  }
  return null;
}