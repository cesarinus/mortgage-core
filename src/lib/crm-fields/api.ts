import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "loan_officer" | "processor" | "assistant" | "realtor";
export const APP_ROLES: AppRole[] = ["admin", "loan_officer", "processor", "assistant", "realtor"];
export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  loan_officer: "Loan Officer",
  processor: "Processor",
  assistant: "Assistant",
  realtor: "Realtor",
};

export interface CrmModule {
  id: string; slug: string; label: string; icon: string | null;
  description: string | null; sort_order: number; active: boolean;
}
export interface CrmSection {
  id: string; module_id: string; slug: string; label: string;
  description: string | null; sort_order: number; hidden: boolean; is_system: boolean;
}
export interface CrmField {
  id: string; module_id: string; section_id: string | null;
  internal_name: string; label: string; description: string | null;
  field_type: string; required: boolean; hidden: boolean; read_only: boolean;
  is_system: boolean; default_value: string | null; placeholder: string | null;
  validation: Record<string, any>; sort_order: number; active: boolean;
}
export interface CrmFieldOption {
  id: string; field_id: string; value: string; label: string; sort_order: number;
}
export interface CrmFieldPermission {
  id: string; field_id: string; role: AppRole;
  can_view: boolean; can_edit: boolean;
}
export interface CrmSectionPermission {
  id: string; section_id: string; role: AppRole;
  can_view: boolean; can_edit: boolean; can_delete: boolean;
}
export interface CrmFieldCondition {
  id: string; field_id: string;
  action: "show" | "hide" | "require" | "readonly";
  rule: { all?: ConditionClause[]; any?: ConditionClause[] };
  target_kind?: "field" | "section";
  target_id?: string | null;
  sort_order: number; active: boolean;
}
export interface ConditionClause {
  field_id: string;
  op: "eq" | "neq" | "in" | "contains" | "gt" | "lt" | "empty" | "not_empty";
  value?: any;
}

export type SectionWidth = "full" | "half" | "third";
export type MobileVisibility = "show" | "hide" | "desktop_only";
export interface SectionLayoutEntry {
  section_id: string;
  sort: number;
  hidden?: boolean;
  columns?: 1 | 2;
  width?: SectionWidth;
  default_collapsed?: boolean;
  mobile?: MobileVisibility;
  role_visibility?: Partial<Record<AppRole, boolean>>;
  role_permissions?: Partial<Record<AppRole, { view: boolean; edit: boolean; delete: boolean }>>;
  fields: Array<{ field_id: string; sort: number; width?: 1 | 2 }>;
}
export interface CrmLayout {
  id: string; module_id: string; role: string | null;
  name: string; is_default: boolean;
  layout: { sections: SectionLayoutEntry[] };
}
export interface CrmLayoutTemplate {
  id: string; module_id: string; name: string; description: string | null;
  layout: { sections: SectionLayoutEntry[] };
  created_by: string | null; created_at: string; updated_at: string;
}
export interface CrmAuditLog {
  id: string; module_id: string | null; actor_id: string | null;
  entity_type: string; entity_id: string | null; entity_label: string | null;
  action: string; before: any; after: any; created_at: string;
}

const sb = supabase as any;

// ---------- Audit helper ----------
export async function logAudit(entry: {
  module_id?: string | null;
  entity_type: string;
  entity_id?: string | null;
  entity_label?: string | null;
  action: string;
  before?: any;
  after?: any;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await sb.from("crm_audit_logs").insert({
      module_id: entry.module_id ?? null,
      actor_id: user.id,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      entity_label: entry.entity_label ?? null,
      action: entry.action,
      before: entry.before ?? null,
      after: entry.after ?? null,
    });
  } catch (e) {
    // never throw — audit failure should not break user action
    console.warn("audit log failed", e);
  }
}

export async function listModules(): Promise<CrmModule[]> {
  const { data, error } = await sb.from("crm_modules").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}
export async function listSections(module_id: string): Promise<CrmSection[]> {
  const { data, error } = await sb.from("crm_sections").select("*")
    .eq("module_id", module_id).order("sort_order");
  if (error) throw error;
  return data ?? [];
}
export async function listFields(module_id: string): Promise<CrmField[]> {
  const { data, error } = await sb.from("crm_fields").select("*")
    .eq("module_id", module_id).order("sort_order");
  if (error) throw error;
  return data ?? [];
}
export async function listFieldOptions(field_ids: string[]): Promise<CrmFieldOption[]> {
  if (!field_ids.length) return [];
  const { data, error } = await sb.from("crm_field_options").select("*")
    .in("field_id", field_ids).order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function saveSection(row: Partial<CrmSection> & { id?: string }) {
  if (row.id) {
    const { data: prev } = await sb.from("crm_sections").select("*").eq("id", row.id).maybeSingle();
    const { error } = await sb.from("crm_sections").update(row).eq("id", row.id);
    if (error) throw error;
    await logAudit({ module_id: row.module_id ?? prev?.module_id, entity_type: "section", entity_id: row.id, entity_label: row.label ?? prev?.label, action: prev?.label !== row.label ? "renamed" : "updated", before: prev, after: { ...prev, ...row } });
  } else {
    const { data, error } = await sb.from("crm_sections").insert(row).select().single();
    if (error) throw error;
    await logAudit({ module_id: row.module_id, entity_type: "section", entity_id: data?.id, entity_label: row.label, action: "created", after: data });
  }
}
export async function deleteSection(id: string) {
  const { data: prev } = await sb.from("crm_sections").select("*").eq("id", id).maybeSingle();
  const { error } = await sb.from("crm_sections").delete().eq("id", id); if (error) throw error;
  await logAudit({ module_id: prev?.module_id, entity_type: "section", entity_id: id, entity_label: prev?.label, action: "deleted", before: prev });
}
export async function saveField(row: Partial<CrmField> & { id?: string }) {
  if (row.id) {
    const { data: prev } = await sb.from("crm_fields").select("*").eq("id", row.id).maybeSingle();
    const { error } = await sb.from("crm_fields").update(row).eq("id", row.id);
    if (error) throw error;
    await logAudit({ module_id: row.module_id ?? prev?.module_id, entity_type: "field", entity_id: row.id, entity_label: row.label ?? prev?.label, action: "updated", before: prev, after: { ...prev, ...row } });
  } else {
    const { data, error } = await sb.from("crm_fields").insert(row).select().single();
    if (error) throw error;
    await logAudit({ module_id: row.module_id, entity_type: "field", entity_id: data?.id, entity_label: row.label, action: "created", after: data });
  }
}
export async function deleteField(id: string) {
  const { data: prev } = await sb.from("crm_fields").select("*").eq("id", id).maybeSingle();
  const { error } = await sb.from("crm_fields").delete().eq("id", id); if (error) throw error;
  await logAudit({ module_id: prev?.module_id, entity_type: "field", entity_id: id, entity_label: prev?.label, action: "deleted", before: prev });
}
export async function replaceFieldOptions(field_id: string, options: { value: string; label: string }[]) {
  await sb.from("crm_field_options").delete().eq("field_id", field_id);
  if (options.length) {
    const { formatOptionLabel } = await import("@/lib/format/labels");
    const rows = options.map((o, i) => ({
      field_id,
      value: o.value,
      label: formatOptionLabel(o.label),
      sort_order: i * 10,
    }));
    const { error } = await sb.from("crm_field_options").insert(rows);
    if (error) throw error;
  }
}

export async function getRecordValues(record_type: string, record_id: string) {
  const { data, error } = await sb.from("crm_field_values").select("*")
    .eq("record_type", record_type).eq("record_id", record_id);
  if (error) throw error;
  const map: Record<string, any> = {};
  (data ?? []).forEach((r: any) => { map[r.field_id] = r.value; });
  return map;
}
export async function upsertRecordValue(field_id: string, record_type: string, record_id: string, value: any) {
  const { error } = await sb.from("crm_field_values").upsert(
    { field_id, record_type, record_id, value }, { onConflict: "field_id,record_type,record_id" }
  );
  if (error) throw error;
}

// ---------- Permissions ----------
export async function listFieldPermissions(field_ids: string[]): Promise<CrmFieldPermission[]> {
  if (!field_ids.length) return [];
  const { data, error } = await sb.from("crm_field_permissions").select("*").in("field_id", field_ids);
  if (error) throw error;
  return data ?? [];
}
export async function upsertFieldPermission(row: Partial<CrmFieldPermission>) {
  const { error } = await sb.from("crm_field_permissions").upsert(row, { onConflict: "field_id,role" });
  if (error) throw error;
  await logAudit({ entity_type: "permission", entity_id: row.field_id ?? null, entity_label: `field perm · ${row.role}`, action: "updated", after: row });
}

// ---------- Section Permissions ----------
export async function listSectionPermissions(section_ids: string[]): Promise<CrmSectionPermission[]> {
  if (!section_ids.length) return [];
  const { data, error } = await sb.from("crm_section_permissions").select("*").in("section_id", section_ids);
  if (error) throw error;
  return data ?? [];
}
export async function upsertSectionPermission(row: Partial<CrmSectionPermission>) {
  const { error } = await sb.from("crm_section_permissions").upsert(row, { onConflict: "section_id,role" });
  if (error) throw error;
  await logAudit({ entity_type: "permission", entity_id: row.section_id ?? null, entity_label: `section perm · ${row.role}`, action: "updated", after: row });
}

// ---------- Conditions ----------
export async function listFieldConditions(field_ids: string[]): Promise<CrmFieldCondition[]> {
  if (!field_ids.length) return [];
  const { data, error } = await sb.from("crm_field_conditions").select("*")
    .in("field_id", field_ids).order("sort_order");
  if (error) throw error;
  return data ?? [];
}
export async function listAllConditionsForModule(module_id: string): Promise<CrmFieldCondition[]> {
  // include rules that target sections (field_id may still point at any field in module, since rule.all references source fields)
  const { data: fld } = await sb.from("crm_fields").select("id").eq("module_id", module_id);
  const ids = (fld ?? []).map((x: any) => x.id);
  if (!ids.length) return [];
  const { data, error } = await sb.from("crm_field_conditions").select("*").in("field_id", ids).order("sort_order");
  if (error) throw error;
  return data ?? [];
}
export async function saveFieldCondition(row: Partial<CrmFieldCondition> & { id?: string }) {
  if (row.id) {
    const { data: prev } = await sb.from("crm_field_conditions").select("*").eq("id", row.id).maybeSingle();
    const { error } = await sb.from("crm_field_conditions").update(row).eq("id", row.id);
    if (error) throw error;
    await logAudit({ entity_type: "condition", entity_id: row.id, action: "updated", before: prev, after: { ...prev, ...row } });
  } else {
    const { data, error } = await sb.from("crm_field_conditions").insert(row).select().single();
    if (error) throw error;
    await logAudit({ entity_type: "condition", entity_id: data?.id, action: "created", after: data });
  }
}
export async function deleteFieldCondition(id: string) {
  const { data: prev } = await sb.from("crm_field_conditions").select("*").eq("id", id).maybeSingle();
  const { error } = await sb.from("crm_field_conditions").delete().eq("id", id); if (error) throw error;
  await logAudit({ entity_type: "condition", entity_id: id, action: "deleted", before: prev });
}

// ---------- Layouts ----------
export async function getDefaultLayout(module_id: string): Promise<CrmLayout | null> {
  const { data, error } = await sb.from("crm_layouts").select("*")
    .eq("module_id", module_id).eq("is_default", true).maybeSingle();
  if (error) throw error;
  return data ?? null;
}
export async function saveLayout(row: Partial<CrmLayout> & { id?: string }) {
  if (row.id) {
    // snapshot prior version
    const { data: prev } = await sb.from("crm_layouts").select("layout").eq("id", row.id).maybeSingle();
    if (prev) {
      const { data: versions } = await sb.from("crm_layout_versions").select("version").eq("layout_id", row.id).order("version", { ascending: false }).limit(1);
      const next = ((versions?.[0]?.version as number) ?? 0) + 1;
      await sb.from("crm_layout_versions").insert({ layout_id: row.id, version: next, layout: prev.layout });
    }
    const { error } = await sb.from("crm_layouts").update(row).eq("id", row.id);
    if (error) throw error;
    await logAudit({ module_id: row.module_id, entity_type: "layout", entity_id: row.id, action: "updated", before: prev?.layout, after: row.layout });
    return row.id;
  }
  const { data, error } = await sb.from("crm_layouts").insert({ ...row, is_default: true }).select("id").single();
  if (error) throw error;
  await logAudit({ module_id: row.module_id, entity_type: "layout", entity_id: data?.id, action: "created", after: row.layout });
  return data.id as string;
}

// ---------- Layout Templates ----------
export async function listLayoutTemplates(module_id: string): Promise<CrmLayoutTemplate[]> {
  const { data, error } = await sb.from("crm_layout_templates").select("*")
    .eq("module_id", module_id).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function saveLayoutTemplate(row: Partial<CrmLayoutTemplate> & { id?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (row.id) {
    const { error } = await sb.from("crm_layout_templates").update(row).eq("id", row.id);
    if (error) throw error;
    return row.id;
  }
  const { data, error } = await sb.from("crm_layout_templates").insert({ ...row, created_by: user?.id ?? null }).select("id").single();
  if (error) throw error;
  return data.id as string;
}
export async function deleteLayoutTemplate(id: string) {
  const { error } = await sb.from("crm_layout_templates").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Audit Logs ----------
export async function listAuditLogs(filters: { module_id?: string; actor_id?: string; from?: string; to?: string; limit?: number }): Promise<CrmAuditLog[]> {
  let q = sb.from("crm_audit_logs").select("*").order("created_at", { ascending: false }).limit(filters.limit ?? 200);
  if (filters.module_id) q = q.eq("module_id", filters.module_id);
  if (filters.actor_id) q = q.eq("actor_id", filters.actor_id);
  if (filters.from) q = q.gte("created_at", filters.from);
  if (filters.to) q = q.lte("created_at", filters.to);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}