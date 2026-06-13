import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/crm-fields/api";

const sb = supabase as any;

export interface PipelineStage {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  probability_pct: number;
  expected_days: number;
  is_active: boolean;
  is_archived: boolean;
  is_terminal: boolean;
  sort: number;
  arive_stage_id?: string | null;
}

export interface StageRequirement {
  id: string;
  stage_id: string;
  field_id?: string | null;
  field_key?: string | null;
  required: boolean;
  sort: number;
}

export interface StageRule {
  id: string;
  stage_id: string;
  name: string;
  trigger: "on_enter" | "on_exit";
  actions: Array<Record<string, any>>;
  is_active: boolean;
  sort: number;
}

export async function listPipelineStages(opts: { includeArchived?: boolean } = {}): Promise<PipelineStage[]> {
  let q = sb.from("pipeline_stages").select("*").order("sort", { ascending: true });
  if (!opts.includeArchived) q = q.eq("is_archived", false);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function savePipelineStage(row: Partial<PipelineStage> & { id?: string }) {
  if (row.id) {
    const { data: prev } = await sb.from("pipeline_stages").select("*").eq("id", row.id).maybeSingle();
    const { error } = await sb.from("pipeline_stages").update(row).eq("id", row.id);
    if (error) throw error;
    await logAudit({ entity_type: "pipeline_stage", entity_id: row.id, entity_label: row.name ?? prev?.name, action: "updated", before: prev, after: { ...prev, ...row } });
  } else {
    const { data, error } = await sb.from("pipeline_stages").insert(row).select().single();
    if (error) throw error;
    await logAudit({ entity_type: "pipeline_stage", entity_id: data.id, entity_label: data.name, action: "created", after: data });
    return data as PipelineStage;
  }
}

export async function deletePipelineStage(id: string) {
  const { data: prev } = await sb.from("pipeline_stages").select("*").eq("id", id).maybeSingle();
  const { error } = await sb.from("pipeline_stages").delete().eq("id", id);
  if (error) throw error;
  await logAudit({ entity_type: "pipeline_stage", entity_id: id, entity_label: prev?.name, action: "deleted", before: prev });
}

export async function reorderPipelineStages(ids: string[]) {
  await Promise.all(ids.map((id, i) => sb.from("pipeline_stages").update({ sort: i + 1 }).eq("id", id)));
  await logAudit({ entity_type: "pipeline_stage", action: "reordered", after: { ids } });
}

export async function listStageRequirements(stage_id: string): Promise<StageRequirement[]> {
  const { data, error } = await sb.from("pipeline_stage_requirements").select("*").eq("stage_id", stage_id).order("sort");
  if (error) throw error;
  return data ?? [];
}

export async function saveStageRequirement(row: Partial<StageRequirement> & { id?: string }) {
  if (row.id) {
    const { error } = await sb.from("pipeline_stage_requirements").update(row).eq("id", row.id);
    if (error) throw error;
  } else {
    const { error } = await sb.from("pipeline_stage_requirements").insert(row);
    if (error) throw error;
  }
  await logAudit({ entity_type: "pipeline_stage_requirement", entity_id: row.id ?? null, action: row.id ? "updated" : "created", after: row });
}

export async function deleteStageRequirement(id: string) {
  const { error } = await sb.from("pipeline_stage_requirements").delete().eq("id", id);
  if (error) throw error;
  await logAudit({ entity_type: "pipeline_stage_requirement", entity_id: id, action: "deleted" });
}

export async function listStageRules(stage_id: string): Promise<StageRule[]> {
  const { data, error } = await sb.from("pipeline_stage_rules").select("*").eq("stage_id", stage_id).order("sort");
  if (error) throw error;
  return data ?? [];
}

export async function saveStageRule(row: Partial<StageRule> & { id?: string }) {
  if (row.id) {
    const { error } = await sb.from("pipeline_stage_rules").update(row).eq("id", row.id);
    if (error) throw error;
    await logAudit({ entity_type: "pipeline_stage_rule", entity_id: row.id, entity_label: row.name, action: "updated", after: row });
  } else {
    const { data, error } = await sb.from("pipeline_stage_rules").insert(row).select().single();
    if (error) throw error;
    await logAudit({ entity_type: "pipeline_stage_rule", entity_id: data.id, entity_label: data.name, action: "created", after: data });
    return data;
  }
}

export async function deleteStageRule(id: string) {
  const { error } = await sb.from("pipeline_stage_rules").delete().eq("id", id);
  if (error) throw error;
  await logAudit({ entity_type: "pipeline_stage_rule", entity_id: id, action: "deleted" });
}

/**
 * Stage exit validation. Checks that every required field on the destination stage
 * (or on `from` if you prefer on-exit) has a non-empty value.
 * Returns { ok, missing: string[] }.
 */
export async function canEnterStage(stageKey: string, values: Record<string, any>): Promise<{ ok: boolean; missing: string[] }> {
  const { data: stage } = await sb.from("pipeline_stages").select("id").eq("key", stageKey).maybeSingle();
  if (!stage) return { ok: true, missing: [] };
  const { data: reqs } = await sb.from("pipeline_stage_requirements").select("field_key, required, field_id, crm_fields:field_id(key,label)").eq("stage_id", stage.id).eq("required", true);
  const missing: string[] = [];
  for (const r of (reqs ?? []) as any[]) {
    const key = r.field_key ?? r.crm_fields?.key;
    const label = r.crm_fields?.label ?? key ?? "field";
    if (!key) continue;
    const v = values?.[key];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) missing.push(label);
  }
  return { ok: missing.length === 0, missing };
}

export async function runStageAutomations(dealId: string, fromKey: string | null, toKey: string) {
  // best-effort fire-and-forget; failures shouldn't block transitions
  try {
    if (fromKey) {
      const { data: from } = await sb.from("pipeline_stages").select("id").eq("key", fromKey).maybeSingle();
      if (from) {
        const { data: rules } = await sb.from("pipeline_stage_rules").select("*").eq("stage_id", from.id).eq("trigger", "on_exit").eq("is_active", true);
        await executeRules(dealId, rules ?? []);
      }
    }
    const { data: to } = await sb.from("pipeline_stages").select("id").eq("key", toKey).maybeSingle();
    if (to) {
      const { data: rules } = await sb.from("pipeline_stage_rules").select("*").eq("stage_id", to.id).eq("trigger", "on_enter").eq("is_active", true);
      await executeRules(dealId, rules ?? []);
    }
  } catch (e) {
    console.warn("stage automations failed", e);
  }
}

async function executeRules(dealId: string, rules: any[]) {
  for (const rule of rules) {
    for (const a of (rule.actions ?? []) as any[]) {
      if (a.type === "create_task" && a.title) {
        await sb.from("crm_tasks").insert({ deal_id: dealId, title: a.title, description: a.description ?? null }).then(() => {}, () => {});
      }
      if (a.type === "notify" && a.user_id) {
        await sb.from("notification_events").insert({
          user_id: a.user_id,
          type: "stage_change",
          channel: "in_app",
          title: a.title ?? "Stage automation",
          body: a.body ?? null,
          payload: { deal_id: dealId, rule_id: rule.id },
        }).then(() => {}, () => {});
      }
    }
  }
}