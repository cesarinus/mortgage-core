import { supabase } from "@/integrations/supabase/client";

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
  id: string; field_id: string; role: "admin" | "loan_officer" | "processor";
  can_view: boolean; can_edit: boolean;
}
export interface CrmFieldCondition {
  id: string; field_id: string;
  action: "show" | "hide" | "require" | "readonly";
  rule: { all?: ConditionClause[] };
  sort_order: number; active: boolean;
}
export interface ConditionClause {
  field_id: string;
  op: "eq" | "neq" | "in" | "gt" | "lt" | "empty" | "not_empty";
  value?: any;
}
export interface CrmLayout {
  id: string; module_id: string; role: string | null;
  name: string; is_default: boolean;
  layout: { sections: Array<{ section_id: string; hidden?: boolean; sort: number; columns?: 1 | 2; fields: Array<{ field_id: string; sort: number; width?: 1 | 2 }> }> };
}

const sb = supabase as any;

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
  if (row.id) { const { error } = await sb.from("crm_sections").update(row).eq("id", row.id); if (error) throw error; }
  else { const { error } = await sb.from("crm_sections").insert(row); if (error) throw error; }
}
export async function deleteSection(id: string) {
  const { error } = await sb.from("crm_sections").delete().eq("id", id); if (error) throw error;
}
export async function saveField(row: Partial<CrmField> & { id?: string }) {
  if (row.id) { const { error } = await sb.from("crm_fields").update(row).eq("id", row.id); if (error) throw error; }
  else { const { error } = await sb.from("crm_fields").insert(row); if (error) throw error; }
}
export async function deleteField(id: string) {
  const { error } = await sb.from("crm_fields").delete().eq("id", id); if (error) throw error;
}
export async function replaceFieldOptions(field_id: string, options: { value: string; label: string }[]) {
  await sb.from("crm_field_options").delete().eq("field_id", field_id);
  if (options.length) {
    const rows = options.map((o, i) => ({ field_id, value: o.value, label: o.label, sort_order: i * 10 }));
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
}

// ---------- Conditions ----------
export async function listFieldConditions(field_ids: string[]): Promise<CrmFieldCondition[]> {
  if (!field_ids.length) return [];
  const { data, error } = await sb.from("crm_field_conditions").select("*")
    .in("field_id", field_ids).order("sort_order");
  if (error) throw error;
  return data ?? [];
}
export async function saveFieldCondition(row: Partial<CrmFieldCondition> & { id?: string }) {
  if (row.id) { const { error } = await sb.from("crm_field_conditions").update(row).eq("id", row.id); if (error) throw error; }
  else { const { error } = await sb.from("crm_field_conditions").insert(row); if (error) throw error; }
}
export async function deleteFieldCondition(id: string) {
  const { error } = await sb.from("crm_field_conditions").delete().eq("id", id); if (error) throw error;
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
    return row.id;
  }
  const { data, error } = await sb.from("crm_layouts").insert({ ...row, is_default: true }).select("id").single();
  if (error) throw error;
  return data.id as string;
}