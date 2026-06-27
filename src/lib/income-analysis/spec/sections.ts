/**
 * Typed accessor over the generated section spec. Loaded from JSON so the
 * worksheet formulas stay verbatim from the All-In-One workbook.
 */
import spec from "./sections.generated.json";
import type { BusinessEntity } from "../engine/types";

export interface SectionInputLine {
  row: number;
  line_number: string;
  label: string;
  irs_line_ref: string | null;
  sub_block: string | null;
  input_cell_I: string;
  input_cell_L: string;
  is_computed: boolean;
  formula_I: string | null;
  formula_L: string | null;
}

export interface SectionSpec {
  row: number;
  label: string;
  form_code: string;
  entity: BusinessEntity;
  sub_blocks: Array<{ row: number; label: string }>;
  input_lines: SectionInputLine[];
  subtotal: {
    row: number;
    label: string;
    cell_I: string;
    cell_L: string;
    formula_I: string;
    formula_L: string;
  } | null;
  ownership: {
    row: number;
    line_number: string;
    label: string;
    input_cell_I: string;
    input_cell_L: string;
  } | null;
  final: {
    row: number;
    label: string;
    cell_I: string;
    cell_L: string;
    formula_I: string;
    formula_L: string;
  } | null;
}

export const SECTIONS: SectionSpec[] = spec.sections as unknown as SectionSpec[];
export const FORMULA_VERSION = spec.formula_version as "all-in-one-2025.v1";

/**
 * SAM section ordering groups multi-instance sections (e.g. 5 partnership
 * blocks). When evaluating, the Nth business of a given entity type maps to
 * the Nth section block of that entity in the spec.
 */
export function sectionsByEntity(entity: BusinessEntity): SectionSpec[] {
  return SECTIONS.filter((s) => s.entity === entity);
}

/** Personal (non-business) sections. */
export const PERSONAL_SECTIONS = SECTIONS.filter(
  (s) => s.entity === "interest_div" || s.entity === "capital_gains",
);
