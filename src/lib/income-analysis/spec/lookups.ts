/**
 * Lookup tables and named ranges extracted from the All-In-One worksheet.
 *
 * IMPORTANT: the table loader reads the generated JSON spec at runtime so we
 * don't drift from the workbook. The constants below are typed re-exports
 * convenient for engine modules.
 */
import spec from "./sections.generated.json";

type LookupRow = { key: string | number; value: number };

function toLookup(name: string): LookupRow[] {
  const t = (spec.lookups as Record<string, unknown>)[name];
  if (!Array.isArray(t)) return [];
  return (t as Array<Record<string, unknown>>).map((row) => {
    const cells = (row.cells ?? row) as Array<{ value?: unknown }>;
    const k = cells?.[0]?.value;
    const v = cells?.[1]?.value;
    return {
      key: typeof k === "number" ? k : String(k ?? ""),
      value: typeof v === "number" ? v : Number(v ?? 0),
    };
  });
}

/** IRS standard mileage depreciation rate by tax year (LKP_MILEAGE). */
export const MILEAGE_DEPRECIATION_RATE: Record<number, number> = (() => {
  const out: Record<number, number> = {};
  for (const row of toLookup("LKP_MILEAGE")) {
    const year = Number(row.key);
    if (Number.isFinite(year) && Number.isFinite(row.value)) out[year] = row.value;
  }
  // Fallback for 2025 / 2024 / 2023 per the worksheet (resilient if lookup absent).
  if (!out[2025]) out[2025] = 0.33;
  if (!out[2024]) out[2024] = 0.3;
  if (!out[2023]) out[2023] = 0.28;
  return out;
})();

export const NAMED_RANGES = spec.named_ranges as string[];
export const FORMULA_VERSION = spec.formula_version as "all-in-one-2025.v1";
