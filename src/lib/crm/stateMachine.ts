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
/**
 * Two independent transition maps.
 * - "lead" only walks the 4 Lead statuses (Move-to-Pipeline is a conversion, not a transition).
 * - "deal" / "opportunity" walks the 6 Pipeline stages.
 */
export const ALLOWED_TRANSITIONS: Record<EntityType, Record<string, string[]>> = {
  lead: {
    // Lead statuses are operator-controlled funnel labels. Pipeline movement is
    // the guarded conversion step; the status dropdown itself must not lock a
    // lead into a dead-end state during data cleanup or borrower recovery.
    new_lead: ["contacted", "qualified", "unqualified"],
    contacted: ["new_lead", "qualified", "unqualified"],
    qualified: ["new_lead", "contacted", "unqualified"],
    unqualified: ["new_lead", "contacted", "qualified"],
  },
  deal: {
    application_sent: ["underwriting", "lost"],
    underwriting: ["approved", "lost"],
    approved: ["clear_to_close", "lost"],
    clear_to_close: ["closed", "lost"],
    closed: [],
    lost: ["application_sent"],
  },
};

/** Normalize a status string to lowercase. Empty/null → bootstrap value. */
export function normalizeStatus(s: string | null | undefined, bootstrap = "new_lead"): string {
  const v = (s ?? "").toString().trim().toLowerCase();
  const ALIAS: Record<string, string> = {
    "": bootstrap,
    new: "new_lead",
    pre_qualified: "qualified",
    prequalified: "qualified",
    converted: "unqualified",
    lost: "unqualified",
    application_started: "application_sent",
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