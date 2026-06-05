import { supabase } from "@/integrations/supabase/client";

export type EntityType = "lead" | "deal";

/**
 * Hardcoded allowlist. Authoritative for client-side dropdown enablement.
 * Keys and values are always lowercase. Lead values mirror the `lead_status`
 * enum; deal values mirror the deal stage pipeline.
 *
 * `lost` / `unqualified` are reachable from any non-terminal lead stage, and
 * `lost` can be reopened back to `new`.
 */
export const ALLOWED_TRANSITIONS: Record<EntityType, Record<string, string[]>> = {
  lead: {
    new_lead: ["contacted", "lost"],
    contacted: ["prequalified", "lost"],
    prequalified: ["qualified", "lost"],
    qualified: ["application_sent", "lost"],
    application_sent: ["underwriting", "lost"],
    underwriting: ["approved", "lost"],
    approved: ["clear_to_close", "lost"],
    clear_to_close: ["closed", "lost"],
    closed: [],
    lost: ["new_lead"],
  },
  deal: {
    new_lead: ["contacted"],
    contacted: ["application_sent", "lost"],
    application_sent: ["underwriting", "lost"],
    underwriting: ["approved", "lost"],
    approved: ["clear_to_close", "lost"],
    clear_to_close: ["closed", "lost"],
    closed: [],
    lost: ["new_lead"],
  },
};

/** Normalize a status string to lowercase. Empty/null → bootstrap value. */
export function normalizeStatus(s: string | null | undefined, bootstrap = "new_lead"): string {
  const v = (s ?? "").toString().trim().toLowerCase();
  // Map legacy values to unified stage names so all UI/logic agrees.
  const ALIAS: Record<string, string> = {
    "": bootstrap,
    new: "new_lead",
    pre_qualified: "prequalified",
    application_started: "application_sent",
    unqualified: "lost",
    converted: "closed",
  };
  return ALIAS[v] ?? v;
}

export function getAllowedNext(entity: EntityType, from: string): string[] {
  const key = normalizeStatus(from, "new_lead");
  return ALLOWED_TRANSITIONS[entity][key] ?? [];
}

/** Synchronous check against the hardcoded map. */
export function isTransitionAllowedSync(entity: EntityType, from: string, to: string): boolean {
  const f = normalizeStatus(from, "new_lead");
  const t = normalizeStatus(to);
  if (f === t) return true;
  return getAllowedNext(entity, f).includes(t);
}

export async function isTransitionAllowed(
  entity: EntityType,
  from: string,
  to: string,
): Promise<boolean> {
  const f = normalizeStatus(from, "new_lead");
  const t = normalizeStatus(to);
  if (f === t) return true;
  // Hardcoded map is authoritative; DB table is a (currently incomplete) seed.
  if (isTransitionAllowedSync(entity, f, t)) return true;
  // Try DB first; fall back to hardcoded list
  try {
    const { data, error } = await supabase
      .from("status_transitions")
      .select("id")
      .eq("entity_type", entity)
      .eq("from_status", f)
      .eq("to_status", t)
      .maybeSingle();
    if (!error && data) return true;
  } catch {
    // ignore
  }
  return false;
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