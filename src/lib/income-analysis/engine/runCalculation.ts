/**
 * Top-level orchestrator. Given a CaseInputs (extractions already loaded),
 * walks each SAM section, populates a sparse cell map with the borrower's
 * line values + the worksheet's $I$5/$L$5 tax-year inputs, evaluates every
 * subtotal/final formula verbatim from the worksheet, and returns a
 * CaseCalculationResult.
 *
 * The persistence module writes the result into income_analysis_calculations
 * and income_analysis_summaries.
 */
import { SECTIONS, type SectionSpec, sectionsByEntity } from "../spec/sections";
import { FORMULA_VERSION } from "../spec/lookups";
import { evaluate, type CellMap } from "./formula";
import type {
  BusinessInputs,
  BusinessSummary,
  CaseCalculationResult,
  CaseInputs,
  LineInput,
  SectionResult,
} from "./types";

/** Run the engine for one case. Pure function — no DB I/O. */
export function runCaseCalculation(input: CaseInputs): CaseCalculationResult {
  const sections: SectionResult[] = [];

  // 1. Personal sections (Sch B interest/div, Sch D capital gains).
  for (const spec of SECTIONS.filter((s) => s.entity === "interest_div" || s.entity === "capital_gains")) {
    sections.push(runSection(spec, null, input.personal_lines ?? [], null, input));
  }

  // 2. Business sections — Nth business of an entity type maps to Nth spec block.
  const grouped = groupBy(input.businesses, (b) => b.entity);
  for (const [entity, list] of grouped) {
    const blocks = sectionsByEntity(entity);
    list.forEach((biz, i) => {
      const spec = blocks[i];
      if (!spec) return; // more businesses than worksheet slots — drop excess
      sections.push(runSection(spec, biz.business_id, biz.lines, biz.ownership_pct, input, biz.business_name));
    });
  }

  // 3. Per-business summaries (qualifying income).
  const summaries: BusinessSummary[] = [];
  for (const biz of input.businesses) {
    const bizSections = sections.filter((s) => s.business_id === biz.business_id);
    const y1 = sum(bizSections.map((s) => s.year_1_after_ownership ?? s.year_1_subtotal ?? 0));
    const y2 = sum(bizSections.map((s) => s.year_2_after_ownership ?? s.year_2_subtotal ?? 0));
    summaries.push(buildSummary(biz, input.tax_years, y1, y2));
  }

  // 4. Totals across all sections (personal + business).
  const t1 = sum(sections.map((s) => s.year_1_after_ownership ?? s.year_1_subtotal ?? 0));
  const t2 = sum(sections.map((s) => s.year_2_after_ownership ?? s.year_2_subtotal ?? 0));
  const avg = (t1 + t2) / 2;

  return {
    case_id: input.case_id,
    formula_version: FORMULA_VERSION,
    tax_years: input.tax_years,
    computed_at: new Date().toISOString(),
    sections,
    summaries,
    totals: {
      year_1_income: round(t1),
      year_2_income: round(t2),
      average_annual_income: round(avg),
      average_monthly_income: round(avg / 12),
      trend: classifyTrend(t1, t2),
    },
  };
}

function runSection(
  spec: SectionSpec,
  businessId: string | null,
  lines: LineInput[],
  ownershipPct: number | null,
  caseInput: CaseInputs,
  businessName?: string | null,
): SectionResult {
  const cells: CellMap = new Map();
  // The worksheet's tax-year inputs live at $I$5 (Year 1) and $L$5 (Year 2).
  cells.set("I5", caseInput.tax_years.year_1);
  cells.set("L5", caseInput.tax_years.year_2);

  // Index inputs by SAM line number for this section.
  const byLineNumber = new Map(lines.map((l) => [String(l.line_number).toLowerCase(), l]));

  // Populate manual input cells.
  for (const il of spec.input_lines) {
    if (il.is_computed) continue; // mileage depreciation rate row — evaluated below
    const m = byLineNumber.get(String(il.line_number).toLowerCase());
    if (m?.year_1 != null) cells.set(il.input_cell_I, m.year_1);
    if (m?.year_2 != null) cells.set(il.input_cell_L, m.year_2);
  }

  // Evaluate computed input rows (e.g. mileage depreciation = miles × rate).
  for (const il of spec.input_lines) {
    if (!il.is_computed) continue;
    if (il.formula_I) {
      const v = evaluate(il.formula_I, cells);
      if (v != null) cells.set(il.input_cell_I, v);
    }
    if (il.formula_L) {
      const v = evaluate(il.formula_L, cells);
      if (v != null) cells.set(il.input_cell_L, v);
    }
  }

  // Ownership multiplier row (partnerships / S-corps). Stored as a fraction
  // in the worksheet (1 = 100%); accept either 0–1 or 0–100 from callers.
  let ownerFrac: number | null = null;
  if (spec.ownership && ownershipPct != null) {
    ownerFrac = ownershipPct > 1 ? ownershipPct / 100 : ownershipPct;
    cells.set(spec.ownership.input_cell_I, ownerFrac);
    cells.set(spec.ownership.input_cell_L, ownerFrac);
  }

  const sub1 = spec.subtotal ? evaluate(spec.subtotal.formula_I, cells) : null;
  const sub2 = spec.subtotal?.formula_L ? evaluate(spec.subtotal.formula_L, cells) : null;
  if (sub1 != null && spec.subtotal) cells.set(spec.subtotal.cell_I, sub1);
  if (sub2 != null && spec.subtotal) cells.set(spec.subtotal.cell_L, sub2);

  const final1 = spec.final ? evaluate(spec.final.formula_I, cells) : null;
  const final2 = spec.final?.formula_L ? evaluate(spec.final.formula_L, cells) : null;

  const snapshot: Record<string, unknown> = {};
  for (const il of spec.input_lines) {
    snapshot[`line_${il.line_number}`] = {
      year_1: cells.get(il.input_cell_I) ?? null,
      year_2: cells.get(il.input_cell_L) ?? null,
    };
  }

  return {
    section_code: spec.form_code,
    section_label: businessName ? `${spec.label} — ${businessName}` : spec.label,
    spec_row: spec.row,
    business_id: businessId,
    year_1_subtotal: sub1 != null ? round(sub1) : null,
    year_2_subtotal: sub2 != null ? round(sub2) : null,
    year_1_after_ownership: final1 != null ? round(final1) : sub1 != null ? round(sub1) : null,
    year_2_after_ownership: final2 != null ? round(final2) : sub2 != null ? round(sub2) : null,
    ownership_pct: ownerFrac != null ? round(ownerFrac * 100, 3) : null,
    inputs_snapshot: snapshot,
    subtotal_formula: spec.subtotal?.formula_I ?? null,
    final_formula: spec.final?.formula_I ?? null,
  };
}

function buildSummary(
  biz: BusinessInputs,
  years: { year_1: number; year_2: number },
  y1: number,
  y2: number,
): BusinessSummary {
  const avg = (y1 + y2) / 2;
  return {
    business_id: biz.business_id,
    business_name: biz.business_name ?? null,
    entity: biz.entity,
    ownership_pct: biz.ownership_pct,
    year_1: years.year_1,
    year_2: years.year_2,
    year_1_income: round(y1),
    year_2_income: round(y2),
    average_annual_income: round(avg),
    average_monthly_income: round(avg / 12),
    trend: classifyTrend(y1, y2),
  };
}

function classifyTrend(y1: number, y2: number): BusinessSummary["trend"] {
  if (y2 === 0) return y1 > 0 ? "increasing" : "stable";
  const delta = (y1 - y2) / Math.abs(y2);
  if (delta > 0.05) return "increasing";
  if (delta < -0.05) return "declining";
  return "stable";
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
}

function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function groupBy<T, K>(arr: T[], key: (t: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const item of arr) {
    const k = key(item);
    const list = out.get(k) ?? [];
    list.push(item);
    out.set(k, list);
  }
  return out;
}
