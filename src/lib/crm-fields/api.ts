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