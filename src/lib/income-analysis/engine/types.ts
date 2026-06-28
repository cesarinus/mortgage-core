/**
 * Income Analysis Engine — public types.
 *
 * The engine consumes IRS line-item values (already extracted from tax returns),
 * evaluates the All-In-One Self-Employed Income Worksheet (Tax Year 2025) formulas
 * verbatim from worksheet-spec.json, and emits per-section calculation rows plus
 * a qualifying-income summary per borrower.
 */

export type FormulaVersion = "all-in-one-2025.v1";

/** Two-year window analysed by the worksheet (Year 1 = recent, Year 2 = prior). */
export interface TaxYearPair {
  year_1: number;
  year_2: number;
}

/** A single extracted IRS line value used as engine input. */
export interface LineInput {
  /** SAM line number printed in column B (e.g. "4", "11a", "36"). */
  line_number: string;
  /** Year 1 value or null if blank. */
  year_1: number | null;
  /** Year 2 value or null if blank. */
  year_2: number | null;
}

/** Per-business input bundle the engine evaluates against. */
export interface BusinessInputs {
  business_id: string;
  business_name?: string | null;
  entity: BusinessEntity;
  /** 0–100 — applied to partnership / S-Corp subtotals. */
  ownership_pct: number | null;
  lines: LineInput[];
}

/** Top-level inputs for one case. */
export interface CaseInputs {
  case_id: string;
  tax_years: TaxYearPair;
  /** Personal Schedule B / D inputs that aren't tied to a business. */
  personal_lines?: LineInput[];
  businesses: BusinessInputs[];
}

export type BusinessEntity =
  | "sole_prop"
  | "single_member_llc"
  | "partnership"
  | "s_corp"
  | "c_corp"
  | "schedule_e_rental"
  | "schedule_f_farm"
  | "interest_div"
  | "capital_gains";

/** One evaluated worksheet section (matches a SAM section block). */
export interface SectionResult {
  section_code: string;           // e.g. 'sch_c', '1065', '1120s'
  section_label: string;          // raw worksheet header text
  spec_row: number;               // source row in SAM
  business_id: string | null;     // null for personal sections (Sch B, Sch D)
  /** Index of the slot (= business instance) within its entity. */
  slot_index: number | null;
  /** Position of this block inside its slot (0 = K-1, 1 = form-level, ...). */
  block_index: number;
  /** Stable identifier for this block within a slot: 'k1', '1065', '1120s', 'main'. */
  block_role: "k1" | "form" | "main";
  year_1_subtotal: number | null;
  year_2_subtotal: number | null;
  year_1_after_ownership: number | null;
  year_2_after_ownership: number | null;
  ownership_pct: number | null;
  inputs_snapshot: Record<string, unknown>;
  /** Echo of the IRS formula evaluated (verbatim from the worksheet). */
  subtotal_formula: string | null;
  final_formula: string | null;
}

/** Qualifying-income summary per borrower / business. */
export interface BusinessSummary {
  business_id: string | null;
  business_name: string | null;
  entity: BusinessEntity | null;
  ownership_pct: number | null;
  year_1: number;
  year_2: number;
  year_1_income: number;
  year_2_income: number;
  average_annual_income: number;
  average_monthly_income: number;
  trend: "increasing" | "stable" | "declining";
}

export interface CaseCalculationResult {
  case_id: string;
  formula_version: FormulaVersion;
  tax_years: TaxYearPair;
  computed_at: string;             // ISO timestamp
  sections: SectionResult[];
  summaries: BusinessSummary[];
  totals: {
    year_1_income: number;
    year_2_income: number;
    average_annual_income: number;
    average_monthly_income: number;
    trend: "increasing" | "stable" | "declining";
  };
}
