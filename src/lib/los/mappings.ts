import { supabase } from "@/integrations/supabase/client";

export interface LosFieldMapping {
  id: string;
  integration: string;
  crm_field: string;
  external_field: string;
  required: boolean;
  default_value: string | null;
  data_type: string;
  transform: string | null;
  sort_order: number;
  active: boolean;
  notes: string | null;
}

export async function loadMappings(integration = "arive"): Promise<LosFieldMapping[]> {
  const { data, error } = await (supabase as any)
    .from("los_field_mappings")
    .select("*")
    .eq("integration", integration)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as LosFieldMapping[];
}

export async function saveMapping(row: Partial<LosFieldMapping> & { id?: string }) {
  if (row.id) {
    const { error } = await (supabase as any)
      .from("los_field_mappings")
      .update(row)
      .eq("id", row.id);
    if (error) throw error;
  } else {
    const { error } = await (supabase as any).from("los_field_mappings").insert(row);
    if (error) throw error;
  }
}

export async function deleteMapping(id: string) {
  const { error } = await (supabase as any).from("los_field_mappings").delete().eq("id", id);
  if (error) throw error;
}