#!/usr/bin/env node
/**
 * Compile docs/income-analysis/worksheet-spec.json into
 * src/lib/income-analysis/spec/sections.generated.json.
 *
 * SAM-sheet layout: each "section block" runs from one SUBTOTAL row (exclusive)
 * to the next SUBTOTAL row (inclusive). A block carries a parent header
 * (SCHEDULE C / PARTNERSHIP / S CORPORATION / CORPORATION etc) that determines
 * the form_code & entity. Partnerships, S-corps and C-corps then have an
 * Ownership line and a "Total Share of Income (Loss)" final line below the
 * SUBTOTAL — those are folded into the block too.
 */
import fs from "node:fs";
import path from "node:path";

const SPEC = JSON.parse(fs.readFileSync("docs/income-analysis/worksheet-spec.json", "utf8"));
const SAM  = SPEC.sheets.SAM;

const rows = {};
for (const c of SAM.cells) {
  const letter = c.coord.replace(/\d+$/, "");
  (rows[c.row] ??= {})[letter] = c;
}
const get = (r, col) => rows[r]?.[col];

// Treat a cell as text whenever its value isn't a real Excel formula. openpyxl
// marks any cell starting with '=' as a formula even when the rest is plain
// text (e.g. '= Total Mileage Depreciation'), so we sniff for an actual call /
// reference signature before honoring is_formula.
const FORMULA_SHAPE = /[A-Z]+\d|[A-Z_]+\(|[+\-*/]\$|SUM|IF\(|VLOOKUP|IFERROR/;
function textOf(cell) {
  if (!cell) return "";
  const v = String(cell.value ?? "").trim();
  if (cell.is_formula && FORMULA_SHAPE.test(v)) return ""; // real formula — no display text
  return v;
}
function formulaOf(cell) {
  if (!cell || !cell.is_formula) return null;
  const v = String(cell.value ?? "");
  return FORMULA_SHAPE.test(v) ? v : null;
}

const TOP_HEADERS = [
  { re: /SCHEDULE B/i,                          form_code: "sch_b",  entity: "interest_div" },
  { re: /SCHEDULE C\s*-\s*SOLE/i,               form_code: "sch_c",  entity: "sole_prop" },
  { re: /SCHEDULE C\s*-\s*SINGLE/i,             form_code: "sch_c",  entity: "single_member_llc" },
  { re: /^SCHEDULE C/i,                         form_code: "sch_c",  entity: "sole_prop" },
  { re: /SCHEDULE D/i,                          form_code: "sch_d",  entity: "capital_gains" },
  { re: /SCHEDULE E/i,                          form_code: "sch_e",  entity: "schedule_e_rental" },
  { re: /SCHEDULE F/i,                          form_code: "sch_f",  entity: "schedule_f_farm" },
  { re: /^PARTNERSHIP\b/i,                      form_code: "1065",   entity: "partnership" },
  { re: /^S CORPORATION\b/i,                    form_code: "1120s",  entity: "s_corp" },
  { re: /^CORPORATION\b/i,                      form_code: "1120",   entity: "c_corp" },
];

function classifyHeader(label) {
  for (const h of TOP_HEADERS) if (h.re.test(label)) return { form_code: h.form_code, entity: h.entity };
  return null;
}

const sortedRows = Object.keys(rows).map(Number).sort((a, b) => a - b);

// Pass 1: scan rows linearly; track current top-level header; whenever we hit
// a SUBTOTAL row, close out the current "block" containing the lines collected
// since the previous SUBTOTAL.
let currentHeader = null;          // { label, form_code, entity, row }
let pendingLines  = [];            // {row, line_number, label, ...}
const blocks      = [];            // closed section blocks

for (const r of sortedRows) {
  if (r < 7) continue;
  const row = rows[r];
  const bRaw = textOf(get(r, "B"));
  const cRaw = textOf(get(r, "C"));
  const iCell = get(r, "I");
  const lCell = get(r, "L");
  const iForm = formulaOf(iCell);
  const lForm = formulaOf(lCell);

  // Header detection: no B-col line and C-col matches a top-level header regex.
  if (!bRaw && cRaw) {
    const cls = classifyHeader(cRaw);
    if (cls) {
      // Header switch flushes any uncommitted lines (defensive).
      currentHeader = { label: cRaw, ...cls, row: r };
      continue;
    }
  }

  if (!currentHeader) continue;

  const isSubtotal     = /^SUBTOTAL\b/i.test(cRaw);
  const isPartnerShare = /Total Share of Income/i.test(cRaw);
  const isOwnership    = /Multiplied by Ownership/i.test(cRaw);

  if (isSubtotal && (iForm || lForm)) {
    // Look ahead for an ownership row + final share row within ~3 rows.
    let ownership = null;
    let final     = null;
    for (let off = 1; off <= 4; off++) {
      const rr = r + off;
      const orow = rows[rr];
      if (!orow) continue;
      const b = textOf(orow.B);
      const c = textOf(orow.C);
      const iC = orow.I, lC = orow.L;
      if (!ownership && b && /Multiplied by Ownership/i.test(c)) {
        ownership = { row: rr, line_number: b, label: c,
          input_cell_I: iC?.coord || `I${rr}`,
          input_cell_L: lC?.coord || `L${rr}`,
        };
      }
      if (!final && /Total Share of Income/i.test(c) && formulaOf(iC)) {
        final = { row: rr, label: c,
          cell_I: iC.coord, cell_L: lC?.coord,
          formula_I: formulaOf(iC), formula_L: formulaOf(lC),
        };
      }
    }
    blocks.push({
      header: currentHeader,
      input_lines: pendingLines,
      subtotal: { row: r, label: cRaw,
        cell_I: iCell.coord, cell_L: lCell?.coord,
        formula_I: iForm, formula_L: lForm,
      },
      ownership,
      final,
    });
    pendingLines = [];
    continue;
  }

  if (isOwnership || isPartnerShare) continue; // consumed as part of the next block lookahead

  // Numbered or computed input line
  if (bRaw) {
    pendingLines.push({
      row: r,
      line_number: bRaw,
      label: cRaw,
      irs_line_ref: (cRaw.match(/LINES?\s+([0-9a-zA-Z][^:,]*)/i) || [null])[0],
      input_cell_I: iCell?.coord || `I${r}`,
      input_cell_L: lCell?.coord || `L${r}`,
      is_computed: Boolean(iForm),
      formula_I: iForm,
      formula_L: lForm,
    });
  }
}

// Pass 2: shape into final sections list.
const sections = blocks.map((b, i) => ({
  index: i,
  label: b.header.label,
  form_code: b.header.form_code,
  entity: b.header.entity,
  header_row: b.header.row,
  row: b.subtotal.row,
  input_lines: b.input_lines,
  subtotal: b.subtotal,
  ownership: b.ownership,
  final: b.final,
}));

const out = {
  source: SPEC.source_file,
  generated_at: new Date().toISOString(),
  formula_version: "all-in-one-2025.v1",
  named_ranges: SPEC.named_ranges,
  lookups: SPEC.lookup_tables || {},
  sections,
};

const outDir = path.join("src", "lib", "income-analysis", "spec");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "sections.generated.json"), JSON.stringify(out, null, 2));

console.log(`✓ Compiled ${sections.length} section blocks`);
const counts = sections.reduce((a, s) => ((a[s.entity] = (a[s.entity] || 0) + 1), a), {});
console.log("  by entity:", counts);
