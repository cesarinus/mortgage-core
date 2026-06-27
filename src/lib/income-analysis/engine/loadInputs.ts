/**
 * Loads a CaseInputs payload from Supabase by hydrating the case's businesses
 * and the current extraction rows. The engine then evaluates against this
 * payload; nothing in the engine itself touches the network.
 */
import { supabase } from "@/integrations/supabase/client";
import type { BusinessEntity, CaseInputs, LineInput } from "./types";

const ENTITY_BY_DB: Record<string, BusinessEntity> = {
  sole_prop: "sole_prop",
  single_member_llc: "single_member_llc",
  partnership: "partnership",
  s_corp: "s_corp",
  c_corp: "c_corp",
  schedule_e_rental: "schedule_e_rental",
  schedule_f_farm: "schedule_f_farm",
};

export async function loadCaseInputs(caseId: string): Promise<CaseInputs> {
  const { data: caseRow, error: caseErr } = await supabase
    .from("income_analysis_cases")
    .select("id, tax_years")
    .eq("id", caseId)
    .maybeSingle();
  if (caseErr) throw caseErr;
  if (!caseRow) throw new Error(`Income analysis case ${caseId} not found`);

  const years = (caseRow.tax_years ?? [2024, 2025]) as number[];
  const year_1 = Math.max(...years);
  const year_2 = years.find((y) => y !== year_1) ?? year_1 - 1;

  const { data: businesses, error: bizErr } = await supabase
    .from("income_analysis_businesses")
    .select("id, business_name, entity_type, ownership_pct")
    .eq("case_id", caseId);
  if (bizErr) throw bizErr;

  const { data: extractions, error: extErr } = await supabase
    .from("income_analysis_extractions")
    .select("business_id, tax_year, line_code, value_numeric, is_current")
    .eq("case_id", caseId)
    .eq("is_current", true);
  if (extErr) throw extErr;

  const lineByBiz = new Map<string, Map<string, LineInput>>();
  for (const e of extractions ?? []) {
    const key = e.business_id ?? "_personal";
    const lines = lineByBiz.get(key) ?? new Map<string, LineInput>();
    const line = lines.get(e.line_code) ?? { line_number: e.line_code, year_1: null, year_2: null };
    if (e.tax_year === year_1) line.year_1 = e.value_numeric ?? null;
    if (e.tax_year === year_2) line.year_2 = e.value_numeric ?? null;
    lines.set(e.line_code, line);
    lineByBiz.set(key, lines);
  }

  return {
    case_id: caseId,
    tax_years: { year_1, year_2 },
    personal_lines: Array.from(lineByBiz.get("_personal")?.values() ?? []),
    businesses: (businesses ?? []).map((b) => ({
      business_id: b.id,
      business_name: b.business_name,
      entity: ENTITY_BY_DB[b.entity_type as string] ?? "sole_prop",
      ownership_pct: b.ownership_pct ?? null,
      lines: Array.from(lineByBiz.get(b.id)?.values() ?? []),
    })),
  };
}