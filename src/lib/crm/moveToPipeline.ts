import { supabase } from "@/integrations/supabase/client";
import { enqueueLosSync } from "@/lib/crm/stages";
import { normalizeStatus, recordLeadTransition } from "@/lib/crm/stateMachine";

export interface MoveToPipelineResult {
  ok: boolean;
  opportunityId?: string;
  error?: string;
  code?: "no_address" | "no_contact" | "wrong_status" | "duplicate" | "db_error";
}

/**
 * Promote a qualified lead into a pipeline_opportunities row.
 * Extracted from src/pages/Leads.tsx handleConvertToPipeline so the same
 * flow can be triggered from the Lead Workspace.
 */
export async function moveLeadToPipeline(
  lead: any,
  userId: string | undefined,
): Promise<MoveToPipelineResult> {
  const propertyAddress: string | null =
    (lead?.property_address ?? "").toString().trim() || null;

  if (!propertyAddress) {
    return { ok: false, code: "no_address", error: "Property address is required." };
  }

  const { data: linkedContacts } = await supabase
    .from("lead_contacts")
    .select("contact_id, is_primary")
    .eq("lead_id", lead.id);

  if (!linkedContacts || linkedContacts.length === 0) {
    return { ok: false, code: "no_contact", error: "Link at least one contact first." };
  }

  const from = normalizeStatus(lead.status);
  if (from !== "qualified") {
    return {
      ok: false,
      code: "wrong_status",
      error: "Only qualified leads can be moved to Pipeline.",
    };
  }

  // Duplicate guard: same lead + same normalized address already in pipeline.
  const norm = (s: string | null | undefined) =>
    (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const { data: existing } = await supabase
    .from("pipeline_opportunities")
    .select("id, property_address")
    .eq("lead_id", lead.id);
  if (existing?.some((o: any) => norm(o.property_address) === norm(propertyAddress))) {
    return {
      ok: false,
      code: "duplicate",
      error: "This lead already has a Pipeline deal for this address.",
    };
  }

  const primary =
    linkedContacts.find((c: any) => c.is_primary)?.contact_id ?? linkedContacts[0].contact_id;

  const { data: opp, error: oppErr } = await supabase
    .from("pipeline_opportunities")
    .insert({
      lead_id: lead.id,
      stage: "application_sent",
      loan_amount: lead.loan_amount ?? lead.property_value ?? null,
      property_address: propertyAddress,
      primary_contact_id: primary,
      created_by: userId,
    })
    .select("id")
    .single();

  if (oppErr) {
    return { ok: false, code: "db_error", error: oppErr.message };
  }

  await supabase.from("leads").update({ status: "unqualified" as any }).eq("id", lead.id);
  await recordLeadTransition(lead.id, from, "unqualified");
  await supabase.from("lead_events").insert({
    lead_id: lead.id,
    event_type: "moved_to_pipeline",
    points: 0,
    metadata: { opportunity_id: opp?.id, stage: "application_sent" } as any,
  });

  if (opp?.id) {
    try {
      await enqueueLosSync(opp.id);
    } catch (e) {
      console.warn("LOS enqueue failed", e);
    }
  }

  return { ok: true, opportunityId: opp?.id };
}