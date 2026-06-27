#!/usr/bin/env node
// Compiles docs/income-analysis/worksheet-spec.json -> src/lib/income-analysis/spec/sections.generated.json
// Parses SAM-sheet section blocks: header (C col only) -> input lines (B-col line number + label) -> SUBTOTAL row (formula in I/L).
import fs from "node:fs";
import path from "node:path";

const SPEC = JSON.parse(fs.readFileSync("docs/income-analysis/worksheet-spec.json", "utf8"));
const SAM = SPEC.sheets.SAM;

// row -> {col_letter: cell}
const rows = {};
for (const c of SAM.cells) {
  const letter = c.coord.replace(/\d+$/, "");
  (rows[c.row] ??= {})[letter] = c;
}

const get = (r, col) => rows[r]?.[col];
const text = (cell) => (cell ? (cell.is_formula ? null : String(cell.value ?? "").trim()) : "");
const formula = (cell) => (cell && cell.is_formula ? cell.value : null);

// Subsection / form sub-headers that should not be section starts on their own;
// they live INSIDE a parent business section (e.g. SCHEDULE K-1, FORM W-2, FORM 1065, FORM 1120S, FORM 1120).
const SUB_HEADER_RE = /^(SCHEDULE K-1|FORM W-2|FORM 1065|FORM 1120S|FORM 1120|FORM 8825)\b/i;

// Recognised top-level section starters (C-col text, no B-col line number).
const TOP_SECTION_RE = /^(SCHEDULE [A-Z]|PARTNERSHIP\b|S CORPORATION\b|CORPORATION\b)/i;

// Map a section header to (form_code, kind).
function classifyHeader(label) {
  const u = label.toUpperCase();
  if (u.includes("SCHEDULE B"))             return { form_code: "sch_b", entity: "interest_div" };
  if (u.includes("SCHEDULE C - SOLE"))      return { form_code: "sch_c", entity: "sole_prop" };
  if (u.includes("SCHEDULE C - SINGLE"))    return { form_code: "sch_c", entity: "single_member_llc" };
  if (u.startsWith("SCHEDULE C"))           return { form_code: "sch_c", entity: "sole_prop" };
  if (u.startsWith("SCHEDULE D"))           return { form_code: "sch_d", entity: "capital_gains" };
  if (u.startsWith("SCHEDULE E"))           return { form_code: "sch_e", entity: "rental" };
  if (u.startsWith("SCHEDULE F"))           return { form_code: "sch_f", entity: "farm" };
  if (u.startsWith("PARTNERSHIP"))          return { form_code: "1065",  entity: "partnership" };
  if (u.startsWith("S CORPORATION"))        return { form_code: "1120s", entity: "s_corp" };
  if (u.startsWith("CORPORATION"))          return { form_code: "1120",  entity: "c_corp" };
  return { form_code: "unknown", entity: "unknown" };
}

const sortedRows = Object.keys(rows).map(Number).sort((a, b) => a - b);

// Walk rows, slice into sections at top-level headers.
const sections = [];
let cur = null;
let curSub = null;

function pushSection() { if (cur) sections.push(cur); cur = null; curSub = null; }

for (const r of sortedRows) {
  if (r < 7) continue;                              // skip metadata
  const bRaw = text(get(r, "B"));
  const cRaw = text(get(r, "C")) || "";
  const iCell = get(r, "I");
  const lCell = get(r, "L");
  const iForm = formula(iCell);
  const lForm = formula(lCell);

  const upper = cRaw.toUpperCase();

  // SUBTOTAL or final summary lines (Partner's / Shareholder's Total Share, Total Mileage Depreciation)
  const isSubtotal = /^SUBTOTAL\b/i.test(cRaw);
  const isPartnerShare = /Total Share of Income/i.test(cRaw);

  // Top-level section starter
  if (!bRaw && TOP_SECTION_RE.test(cRaw) && !SUB_HEADER_RE.test(cRaw)) {
    pushSection();
    const meta = classifyHeader(cRaw);
    cur = {
      row: r,
      label: cRaw,
      header_cell: { I: iCell?.coord, L: lCell?.coord, year_token: iForm || null },
      form_code: meta.form_code,
      entity: meta.entity,
      sub_blocks: [],          // sub-headers like SCHEDULE K-1, FORM 1065
      input_lines: [],         // {row, line_number, label, irs_line_ref, sub_block, input_cell_I, input_cell_L, is_computed, formula_I, formula_L}
      subtotal: null,          // {row, label, cell_I, cell_L, formula_I, formula_L}
      ownership: null,         // {row, label, input_cell_I, input_cell_L}
      final: null,             // {row, label, cell_I, cell_L, formula_I, formula_L}
    };
    curSub = null;
    continue;
  }

  if (!cur) continue;

  // Sub-block header (no B-col line, all caps form name)
  if (!bRaw && SUB_HEADER_RE.test(cRaw)) {
    curSub = { row: r, label: cRaw };
    cur.sub_blocks.push(curSub);
    continue;
  }

  // Numbered input line
  if (bRaw && cRaw && !isSubtotal && !isPartnerShare) {
    const lineLabel = cRaw.replace(/\s+/g, " ").trim();
    const irsLineMatch = lineLabel.match(/LINES?\s+([0-9a-zA-Z][^:,]*)/i);
    cur.input_lines.push({
      row: r,
      line_number: bRaw,
      label: lineLabel,
      irs_line_ref: irsLineMatch ? irsLineMatch[0] : null,
      sub_block: curSub?.label ?? null,
      input_cell_I: iCell?.coord || `I${r}`,
      input_cell_L: lCell?.coord || `L${r}`,
      is_computed: Boolean(iForm),
      formula_I: iForm,
      formula_L: lForm,
    });
    continue;
  }

  if (isSubtotal && (iForm || lForm)) {
    cur.subtotal = {
      row: r,
      label: cRaw,
      cell_I: iCell.coord,
      cell_L: lCell?.coord,
      formula_I: iForm,
      formula_L: lForm,
    };
    continue;
  }

  // Ownership multiplier line (line number present, label = "Multiplied by Ownership Percentage")
  if (bRaw && /Multiplied by Ownership/i.test(cRaw)) {
    cur.ownership = {
      row: r,
      line_number: bRaw,
      label: cRaw,
      input_cell_I: iCell?.coord || `I${r}`,
      input_cell_L: lCell?.coord || `L${r}`,
    };
    continue;
  }

  if (isPartnerShare && iForm) {
    cur.final = {
      row: r,
      label: cRaw,
      cell_I: iCell.coord,
      cell_L: lCell?.coord,
      formula_I: iForm,
      formula_L: lForm,
    };
  }
}
pushSection();

// Lookup tables
const lookups = SPEC.lookup_tables || {};

const out = {
  source: SPEC.source_file,
  generated_at: new Date().toISOString(),
  formula_version: "all-in-one-2025.v1",
  named_ranges: SPEC.named_ranges,
  lookups,
  sections,
};

const outDir = path.join("src", "lib", "income-analysis", "spec");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "sections.generated.json"), JSON.stringify(out, null, 2));

console.log(`✓ Compiled ${sections.length} sections to src/lib/income-analysis/spec/sections.generated.json`);
const counts = sections.reduce((acc, s) => ((acc[s.form_code] = (acc[s.form_code] || 0) + 1), acc), {});
console.log("  by form_code:", counts);
