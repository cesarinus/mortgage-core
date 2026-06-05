import { supabase } from "@/integrations/supabase/client";

/**
 * Single unified pipeline stage list shared by Leads and Opportunities/Pipeline.
 * Order is meaningful — used as Kanban column order and progression order.
 */
export const UNIFIED_STAGES = [
  "new_lead",
  "contacted",
  "prequalified",
  "qualified",
  "application_sent",
  "underwriting",
  "approved",
  "clear_to_close",
  "closed",
  "lost",
] as const;

export type UnifiedStage = (typeof UNIFIED_STAGES)[number];

export const STAGE_LABELS: Record<string, string> = {
  new_lead: "New",
  contacted: "Contacted",
  prequalified: "Prequalified",
  qualified: "Qualified",
  application_sent: "Application Sent",
  underwriting: "Underwriting",
  approved: "Approved",
  clear_to_close: "Clear to Close",
  closed: "Closed",
  lost: "Lost",
  // legacy fallbacks
  new: "New",
  pre_qualified: "Prequalified",
  application_started: "Application Sent",
  unqualified: "Lost",
  converted: "Closed",
};

export const STAGE_BADGE: Record<string, string> = {
  new_lead: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
  contacted: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20",
  prequalified: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  qualified: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  application_sent: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  underwriting: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20",
  approved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  clear_to_close: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  closed: "bg-muted text-muted-foreground border-border",
  lost: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

/** Helpers for the LOS sync staging queue (no live calls — staged only). */
export async function enqueueLosSync(opportunityId: string) {
  const { data: existing } = await (supabase as any)
    .from("los_sync_queue")
    .select("id")
    .eq("opportunity_id", opportunityId)
    .eq("sync_status", "pending")
    .maybeSingle();
  if (existing?.id) return existing.id as string;
  const { data, error } = await (supabase as any)
    .from("los_sync_queue")
    .insert({ opportunity_id: opportunityId, sync_status: "pending" })
    .select("id")
    .single();
  if (error) throw error;
  await (supabase as any)
    .from("leads")
    .update({ los_sync_status: "pending" })
    .eq("id", opportunityId);
  return data?.id as string;
}

export async function listPendingLosSync() {
  const { data, error } = await (supabase as any)
    .from("los_sync_queue")
    .select("*")
    .eq("sync_status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}