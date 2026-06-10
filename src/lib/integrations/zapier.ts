import { supabase } from "@/integrations/supabase/client";

export type ZapierEvent =
  | "lead.created"
  | "lead.status_changed"
  | "lead.sent_to_los"
  | "deal.stage_changed"
  | "deal.closed"
  | "document.uploaded"
  | "test.ping";

export interface ZapierPayload {
  event: ZapierEvent;
  timestamp: string;
  source: "ngcapital-crm";
  data: Record<string, unknown>;
}

/**
 * Fire-and-forget Zapier webhook call.
 * Reads the current user's webhook config; no-op if missing/disabled/event not selected.
 * Always swallows errors so CRM flows never break.
 */
export async function fireZapier(event: ZapierEvent, data: Record<string, unknown>): Promise<void> {
  let logId: string | null = null;
  let userId: string | null = null;
  try {
    const { data: userRes } = await supabase.auth.getUser();
    userId = userRes.user?.id ?? null;
    if (!userId) return;

    const { data: hook } = await supabase
      .from("integration_webhooks")
      .select("url, enabled, events")
      .eq("user_id", userId)
      .eq("provider", "zapier")
      .maybeSingle();

    if (!hook || !hook.enabled || !hook.url) return;
    if (event !== "test.ping" && !(hook.events ?? []).includes(event)) return;

    const payload: ZapierPayload = {
      event,
      timestamp: new Date().toISOString(),
      source: "ngcapital-crm",
      data,
    };

    // Phase 7 — write a pending integration log row before firing.
    const leadId = (data as any)?.crm_reference_id ?? (data as any)?.lead_id ?? null;
    const { data: logRow } = await supabase
      .from("los_integration_logs")
      .insert({
        lead_id: leadId,
        user_id: userId,
        event,
        direction: "outbound",
        payload: payload as any,
        status: "pending",
      })
      .select("id")
      .maybeSingle();
    logId = logRow?.id ?? null;

    // no-cors: response is opaque, success verified in Zapier history
    await fetch(hook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      mode: "no-cors",
      body: JSON.stringify(payload),
    });

    // Best-effort diagnostics
    await supabase
      .from("integration_webhooks")
      .update({ last_fired_at: new Date().toISOString(), last_status: "sent" })
      .eq("user_id", userId)
      .eq("provider", "zapier");

    if (logId) {
      await supabase
        .from("los_integration_logs")
        .update({ status: "sent" })
        .eq("id", logId);
    }
  } catch (err) {
    console.warn("[zapier] fire failed", err);
    if (logId) {
      await supabase
        .from("los_integration_logs")
        .update({ status: "failed", error: String((err as any)?.message ?? err) })
        .eq("id", logId);
    }
  }
}