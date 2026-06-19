import { supabase } from "@/integrations/supabase/client";
import {
  translateLienPosition,
  translateLoanPurpose,
  translateOccupancy,
} from "./enums";

/**
 * Canonical lead context — the single source of truth consumed by every
 * outbound integration (LOS payload builder, Send-to-LOS, Zapier, Arive,
 * future LOS connectors).
 *
 * Keys are the canonical CRM field names referenced by
 * `los_field_mappings.crm_field`. Downstream mappers must NOT re-join tables.
 */
export interface LeadContext extends Record<string, any> {
  // identity
  id: string;
  person_id: string | null;
  assigned_to: string | null;

  // borrower
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;

  // property / loan
  property_address: string | null;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;
  property_type: string | null;
  property_value: number | null;
  loan_amount: number | null;
  loan_purpose: string | null;
  occupancy_type: string | null;
  lien_position: string | null;
  loan_program: string | null;

  // assignee
  loan_officer_id: string | null;
  loan_officer_name: string | null;
  loan_officer_email: string | null;
}

/** Resolve canonical context for a lead by id. */
export async function buildLeadContext(leadId: string): Promise<LeadContext | null> {
  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();
  if (error || !lead) return null;

  // Parallel joins — each is by indexed FK.
  const [mpRes, scnRes, profileRes, personRes] = await Promise.all([
    (supabase as any)
      .from("mortgage_profiles")
      .select("*")
      .eq("lead_id", leadId)
      .maybeSingle(),
    (supabase as any)
      .from("loan_scenarios")
      .select("*")
      .eq("lead_id", leadId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    lead.assigned_to
      ? (supabase as any)
          .from("profiles")
          .select("id, email, first_name, last_name")
          .eq("id", lead.assigned_to)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    lead.person_id
      ? (supabase as any)
          .from("people")
          .select("id, full_name, email, phone")
          .eq("id", lead.person_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const mp = mpRes?.data ?? null;
  const scn = scnRes?.data ?? null;
  const profile = profileRes?.data ?? null;
  const person = personRes?.data ?? null;

  const loanOfficerName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || null
    : null;

  const ctx: LeadContext = {
    ...lead,
    id: lead.id,
    person_id: lead.person_id ?? null,
    assigned_to: lead.assigned_to ?? null,

    first_name: lead.first_name ?? null,
    last_name: lead.last_name ?? null,
    email: lead.email ?? person?.email ?? null,
    phone: lead.phone ?? person?.phone ?? null,

    property_address: lead.property_address ?? scn?.property_address ?? null,
    property_city: lead.property_city ?? null,
    property_state: lead.property_state ?? null,
    property_zip: lead.property_zip ?? null,
    property_type: lead.property_type ?? mp?.property_type ?? null,
    property_value: lead.property_value ?? scn?.purchase_price ?? null,
    loan_amount: lead.loan_amount ?? scn?.loan_amount ?? null,

    loan_purpose: translateLoanPurpose(lead.loan_purpose) ?? lead.loan_purpose ?? null,
    occupancy_type:
      translateOccupancy(mp?.occupancy_type) ?? mp?.occupancy_type ?? null,
    lien_position: translateLienPosition(scn?.lien_position),
    loan_program: mp?.loan_program ?? scn?.mortgage_type ?? null,

    loan_officer_id: lead.assigned_to ?? null,
    loan_officer_name: loanOfficerName,
    loan_officer_email: profile?.email ?? null,

    // Compatibility aliases so older mappers that still reference these names
    // (e.g. an outdated los_field_mappings row) keep working.
    transaction_type: translateLoanPurpose(lead.loan_purpose) ?? lead.loan_purpose ?? null,
    mortgage_profile: mp,
    loan_scenario: scn,
    assignee_profile: profile,
  };

  return ctx;
}