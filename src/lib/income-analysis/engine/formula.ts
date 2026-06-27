/**
 * Excel formula evaluator wrapper around hot-formula-parser.
 *
 * The SAM worksheet uses a constrained set of functions: IFERROR, IF, AND, OR,
 * NOT, ISNUMBER, ISBLANK, SUM, VLOOKUP. hot-formula-parser implements all of
 * these. We bind cell references and named ranges (VLOOKUP into LKP_MILEAGE)
 * by populating a sparse cell map and intercepting the parser's `callCellValue`
 * / `callRangeValue` / `callFunction` hooks.
 */
import { Parser } from "hot-formula-parser";
import { MILEAGE_DEPRECIATION_RATE } from "../spec/lookups";

export type CellMap = Map<string, number | string | null>;

const COL_RE = /^([A-Z]+)(\d+)$/;

function colLetterToIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n; // 1-based
}

function refToKey(col: string, row: number | string): string {
  return `${col.toUpperCase()}${row}`;
}

/** Build a parser bound to the supplied sparse cell map. */
export function makeParser(cells: CellMap): Parser {
  const parser = new Parser();

  parser.on("callCellValue", (cellCoord, done) => {
    const key = `${cellCoord.column.label}${cellCoord.row.label}`;
    const v = cells.get(key);
    done(v == null ? 0 : v);
  });

  parser.on("callRangeValue", (startCoord, endCoord, done) => {
    const startCol = colLetterToIndex(startCoord.column.label);
    const endCol = colLetterToIndex(endCoord.column.label);
    const startRow = Number(startCoord.row.label);
    const endRow = Number(endCoord.row.label);
    const rows: Array<Array<number | string | null>> = [];
    for (let r = startRow; r <= endRow; r++) {
      const row: Array<number | string | null> = [];
      for (let c = startCol; c <= endCol; c++) {
        const colLetter = indexToColLetter(c);
        const v = cells.get(refToKey(colLetter, r));
        row.push(v == null ? 0 : v);
      }
      rows.push(row);
    }
    done(rows);
  });

  parser.on("callFunction", (name, params, done) => {
    // Intercept VLOOKUP against the named LKP_MILEAGE range — the worksheet
    // uses =VLOOKUP($I$5, LKP_MILEAGE, 2, FALSE).
    if (name === "VLOOKUP" && Array.isArray(params) && params[1] === "LKP_MILEAGE") {
      const key = Number(params[0]);
      const rate = MILEAGE_DEPRECIATION_RATE[key];
      done(rate ?? "");
      return;
    }
    done(undefined); // fall through to built-in implementation
  });

  // Resolve VLOOKUP's `LKP_MILEAGE` token — hot-formula-parser sees it as a
  // variable when the range name isn't a real range. Register it as a constant
  // so `params[1]` arrives as the literal string above.
  parser.setVariable("LKP_MILEAGE", "LKP_MILEAGE");

  // Worksheet-named error strings — return the literal so IFERROR catches them.
  parser.setVariable("ErrMsg_InputYears", "ErrMsg_InputYears");
  parser.setVariable("ErrMsg_InputTwoYears", "ErrMsg_InputTwoYears");
  parser.setVariable("ErrMsg_EnterAnnDate", "ErrMsg_EnterAnnDate");

  return parser;
}

function indexToColLetter(index: number): string {
  let n = index;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Evaluate a formula in the context of the supplied cell map. */
export function evaluate(formula: string, cells: CellMap): number | null {
  const parser = makeParser(cells);
  const expr = formula.startsWith("=") ? formula.slice(1) : formula;
  const { result, error } = parser.parse(expr);
  if (error) return null;
  if (result == null || result === "") return null;
  const n = typeof result === "number" ? result : Number(result);
  return Number.isFinite(n) ? n : null;
}

export const __test = { colLetterToIndex, indexToColLetter };
