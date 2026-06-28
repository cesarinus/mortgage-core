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
 * SAM section ordering groups multi-instance sections (e.g. 4 partnership
 * businesses). When evaluating, the Nth business of a given entity type maps
 * to the Nth *slot* — a slot is a run of one or more contiguous worksheet
 * blocks that belong to the same logical entity instance.
 *
 * Partnerships and S-Corps allocate TWO blocks per business in the SAM
 * workbook: a K-1 block (no ownership multiplier — captures Ordinary Income /
 * Net Rental / Guaranteed Payments straight off the K-1) followed by a
 * Form-1065/1120S block (with ownership multiplier and final Partner's /
 * Shareholder's Share of Income row). Both blocks share the borrower's
 * ownership percentage and the same business_id, but they evaluate against
 * different IRS lines and produce their own subtotal each year.
 *
 * Sole-prop, Sch E/F and C-Corp slots contain a single block.
 */
export function sectionsByEntity(entity: BusinessEntity): SectionSpec[] {
  return SECTIONS.filter((s) => s.entity === entity);
}

/** One business-slot: 1+ worksheet blocks that share a single business_id. */
export interface SectionSlot {
  entity: BusinessEntity;
  slot_index: number;        // 0-based within entity
  blocks: SectionSpec[];     // ordered as they appear in SAM
}

function buildSlots(blocks: SectionSpec[]): SectionSpec[][] {
  const out: SectionSpec[][] = [];
  for (const b of blocks) {
    const last = out[out.length - 1];
    const lastTail = last?.[last.length - 1];
    // A leading K-1 block (ownership == null) followed by a form block
    // (ownership != null) belongs to the same slot. Anything else opens a
    // new slot.
    if (last && lastTail && lastTail.ownership == null && b.ownership != null) {
      last.push(b);
    } else {
      out.push([b]);
    }
  }
  return out;
}

export function slotsByEntity(entity: BusinessEntity): SectionSlot[] {
  return buildSlots(sectionsByEntity(entity)).map((blocks, slot_index) => ({
    entity,
    slot_index,
    blocks,
  }));
}

/** Personal (non-business) sections. */
export const PERSONAL_SECTIONS = SECTIONS.filter(
  (s) => s.entity === "interest_div" || s.entity === "capital_gains",
);
