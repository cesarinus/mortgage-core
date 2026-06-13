import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/crm-fields/api";

const sb = supabase as any;

export interface LeadSource {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  default_lead_score: number;
  is_active: boolean;
  is_archived: boolean;
  sort: number;
  owner_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface LeadSourceRule {
  id: string;
  source_id: string;
  name: string;
  conditions: Record<string, any>;
  actions: Array<Record<string, any>>;
  is_active: boolean;
  sort: number;
}

export async function listLeadSources(opts: { includeArchived?: boolean } = {}): Promise<LeadSource[]> {
  let q = sb.from("lead_sources").select("*").order("sort", { ascending: true }).order("name");
  if (!opts.includeArchived) q = q.eq("is_archived", false);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function saveLeadSource(row: Partial<LeadSource> & { id?: string }) {
  if (row.id) {
    const { data: prev } = await sb.from("lead_sources").select("*").eq("id", row.id).maybeSingle();
    const { error } = await sb.from("lead_sources").update(row).eq("id", row.id);
    if (error) throw error;
    await logAudit({ entity_type: "lead_source", entity_id: row.id, entity_label: row.name ?? prev?.name, action: "updated", before: prev, after: { ...prev, ...row } });
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await sb.from("lead_sources").insert({ ...row, created_by: user?.id }).select().single();
    if (error) throw error;
    await logAudit({ entity_type: "lead_source", entity_id: data.id, entity_label: data.name, action: "created", after: data });
    return data as LeadSource;
  }
}

export async function archiveLeadSource(id: string, archived = true) {
  const { error } = await sb.from("lead_sources").update({ is_archived: archived, is_active: !archived }).eq("id", id);
  if (error) throw error;
  await logAudit({ entity_type: "lead_source", entity_id: id, action: archived ? "archived" : "restored" });
}

export async function deleteLeadSource(id: string) {
  const { data: prev } = await sb.from("lead_sources").select("*").eq("id", id).maybeSingle();
  const { error } = await sb.from("lead_sources").delete().eq("id", id);
  if (error) throw error;
  await logAudit({ entity_type: "lead_source", entity_id: id, entity_label: prev?.name, action: "deleted", before: prev });
}

export async function reorderLeadSources(ids: string[]) {
  await Promise.all(ids.map((id, i) => sb.from("lead_sources").update({ sort: i + 1 }).eq("id", id)));
  await logAudit({ entity_type: "lead_source", action: "reordered", after: { ids } });
}

export async function listLeadSourceRules(source_id: string): Promise<LeadSourceRule[]> {
  const { data, error } = await sb.from("lead_source_rules").select("*").eq("source_id", source_id).order("sort");
  if (error) throw error;
  return data ?? [];
}

export async function saveLeadSourceRule(row: Partial<LeadSourceRule> & { id?: string }) {
  if (row.id) {
    const { error } = await sb.from("lead_source_rules").update(row).eq("id", row.id);
    if (error) throw error;
    await logAudit({ entity_type: "lead_source_rule", entity_id: row.id, entity_label: row.name, action: "updated", after: row });
  } else {
    const { data, error } = await sb.from("lead_source_rules").insert(row).select().single();
    if (error) throw error;
    await logAudit({ entity_type: "lead_source_rule", entity_id: data.id, entity_label: data.name, action: "created", after: data });
    return data;
  }
}

export async function deleteLeadSourceRule(id: string) {
  const { error } = await sb.from("lead_source_rules").delete().eq("id", id);
  if (error) throw error;
  await logAudit({ entity_type: "lead_source_rule", entity_id: id, action: "deleted" });
}

/**
 * Apply lead source automation rules to a freshly-created lead.
 * Mutates the lead row (assignment, score) and may insert tasks/tags.
 */
export async function applyLeadSourceRules(leadId: string, sourceId: string | null | undefined) {
  if (!sourceId) return;
  const [{ data: source }, { data: rules }] = await Promise.all([
    sb.from("lead_sources").select("*").eq("id", sourceId).maybeSingle(),
    sb.from("lead_source_rules").select("*").eq("source_id", sourceId).eq("is_active", true).order("sort"),
  ]);
  if (!source) return;
  const patch: Record<string, any> = {};
  if (source.default_lead_score) patch.lead_score = source.default_lead_score;
  for (const r of rules ?? []) {
    for (const a of (r.actions ?? []) as any[]) {
      if (a.type === "assign" && a.user_id) patch.assigned_to = a.user_id;
      if (a.type === "set_score" && typeof a.value === "number") patch.lead_score = a.value;
      if (a.type === "add_tag" && a.tag) {
        await sb.from("lead_tags").insert({ lead_id: leadId, tag: a.tag }).then(() => {}, () => {});
      }
      if (a.type === "create_task" && a.title) {
        await sb.from("crm_tasks").insert({ lead_id: leadId, title: a.title, description: a.description ?? null }).then(() => {}, () => {});
      }
    }
  }
  if (Object.keys(patch).length) {
    await sb.from("leads").update(patch).eq("id", leadId);
  }
}