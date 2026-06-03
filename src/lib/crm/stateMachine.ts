import { supabase } from "@/integrations/supabase/client";

export type EntityType = "lead" | "deal";

/** Hardcoded allowlist (mirrors status_transitions seed). Used as fallback if DB unreachable. */
export const ALLOWED_TRANSITIONS: Record<EntityType, Record<string, string[]>> = {
  lead: {
    new: ["contacted"],
    contacted: ["qualified", "unqualified"],
    qualified: ["unqualified"],
  },
  deal: {
    new_lead: ["contacted"],
    contacted: ["application_sent", "lost"],
    application_sent: ["underwriting", "lost"],
    underwriting: ["approved", "lost"],
    approved: ["clear_to_close", "lost"],
    clear_to_close: ["closed", "lost"],
  },
};

export function getAllowedNext(entity: EntityType, from: string): string[] {
  return ALLOWED_TRANSITIONS[entity][from] ?? [];
}

export async function isTransitionAllowed(
  entity: EntityType,
  from: string,
  to: string,
): Promise<boolean> {
  if (from === to) return true;
  // Try DB first; fall back to hardcoded list
  try {
    const { data, error } = await supabase
      .from("status_transitions")
      .select("id")
      .eq("entity_type", entity)
      .eq("from_status", from)
      .eq("to_status", to)
      .maybeSingle();
    if (!error && data) return true;
    if (!error && !data) return getAllowedNext(entity, from).includes(to);
  } catch {
    // ignore
  }
  return getAllowedNext(entity, from).includes(to);
}

export async function recordLeadTransition(
  leadId: string,
  from: string,
  to: string,
) {
  try {
    await supabase.from("lead_events").insert({
      lead_id: leadId,
      event_type: "status_transition",
      points: 0,
      metadata: { from_status: from, to_status: to } as any,
    });
  } catch (e) {
    console.warn("recordLeadTransition failed", e);
  }
}

export async function recordDealTransition(
  dealId: string,
  from: string,
  to: string,
  actorId?: string | null,
) {
  try {
    await (supabase as any).from("deal_events").insert({
      deal_id: dealId,
      event_type: "stage_transition",
      from_status: from,
      to_status: to,
      actor_id: actorId ?? null,
    });
  } catch (e) {
    console.warn("recordDealTransition failed", e);
  }
}