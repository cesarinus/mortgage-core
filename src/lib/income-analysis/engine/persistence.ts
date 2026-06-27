/**
 * Persists a CaseCalculationResult into Supabase:
 *   - marks prior rows for this case as not-current
 *   - inserts a row per section into income_analysis_calculations
 *   - inserts/updates per-business income_analysis_summaries
 *   - updates qualifying_income_monthly/annual on the case
 *   - appends an audit log entry
 */
import { supabase } from "@/integrations/supabase/client";
import type { CaseCalculationResult } from "./types";

export async function persistCalculation(result: CaseCalculationResult): Promise<void> {
  const { case_id, formula_version } = result;

  // 1. Retire previous current rows.
  const { error: retireErr } = await supabase
    .from("income_analysis_calculations")
    .update({ is_current: false })
    .eq("case_id", case_id)
    .eq("is_current", true);
  if (retireErr) throw retireErr;

  // 2. Insert one row per section per year (subtotal lives in `subtotal`,
  //    inputs in `inputs`, full result in `outputs`).
  const calcRows = result.sections.flatMap((s) => [
    {
      case_id,
      business_id: s.business_id,
      tax_year: result.tax_years.year_1,
      section_code: s.section_code,
      formula_version,
      inputs: s.inputs_snapshot as unknown as Record<string, unknown>,
      outputs: {
        section_label: s.section_label,
        spec_row: s.spec_row,
        subtotal_formula: s.subtotal_formula,
        final_formula: s.final_formula,
        ownership_pct: s.ownership_pct,
        subtotal: s.year_1_subtotal,
        after_ownership: s.year_1_after_ownership,
      },
      subtotal: s.year_1_after_ownership ?? s.year_1_subtotal,
      is_current: true,
    },
    {
      case_id,
      business_id: s.business_id,
      tax_year: result.tax_years.year_2,
      section_code: s.section_code,
      formula_version,
      inputs: s.inputs_snapshot as unknown as Record<string, unknown>,
      outputs: {
        section_label: s.section_label,
        spec_row: s.spec_row,
        subtotal_formula: s.subtotal_formula,
        final_formula: s.final_formula,
        ownership_pct: s.ownership_pct,
        subtotal: s.year_2_subtotal,
        after_ownership: s.year_2_after_ownership,
      },
      subtotal: s.year_2_after_ownership ?? s.year_2_subtotal,
      is_current: true,
    },
  ]);

  if (calcRows.length > 0) {
    const { error: insErr } = await supabase
      .from("income_analysis_calculations")
      .insert(calcRows);
    if (insErr) throw insErr;
  }

  // 3. Replace summaries for this case.
  const { error: delSumErr } = await supabase
    .from("income_analysis_summaries")
    .delete()
    .eq("case_id", case_id);
  if (delSumErr) throw delSumErr;

  if (result.summaries.length > 0) {
    const summaryRows = result.summaries.map((s) => ({
      case_id,
      business_id: s.business_id,
      business_name_snapshot: s.business_name,
      entity_type_snapshot: s.entity as never,
      ownership_pct_snapshot: s.ownership_pct,
      year_1: s.year_1,
      year_2: s.year_2,
      year_1_income: s.year_1_income,
      year_2_income: s.year_2_income,
      average_annual_income: s.average_annual_income,
      average_monthly_income: s.average_monthly_income,
      trend: s.trend,
      formula_version,
    }));
    const { error: sumErr } = await supabase
      .from("income_analysis_summaries")
      .insert(summaryRows);
    if (sumErr) throw sumErr;
  }

  // 4. Update the case's qualifying income totals and status.
  const { error: caseErr } = await supabase
    .from("income_analysis_cases")
    .update({
      qualifying_income_annual: result.totals.average_annual_income,
      qualifying_income_monthly: result.totals.average_monthly_income,
      status: "calculated",
    })
    .eq("id", case_id);
  if (caseErr) throw caseErr;

  // 5. Audit.
  await supabase.from("income_analysis_audit_log").insert({
    case_id,
    action: "engine.calculated",
    entity: "case",
    entity_id: case_id,
    payload: {
      formula_version,
      tax_years: result.tax_years,
      section_count: result.sections.length,
      totals: result.totals,
    },
  });
}
