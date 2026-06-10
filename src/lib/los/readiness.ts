import type { LosFieldMapping } from "./mappings";
import { validateAgainstMappings } from "./validate";

export interface ReadinessResult {
  score: number;          // 0-100
  total: number;
  filled: number;
  requiredTotal: number;
  requiredFilled: number;
  missing: string[];      // external field names
  invalid: string[];
}

/**
 * Compute lead readiness as a configurable %, weighted toward required fields.
 * 70% of the score = required-field completeness, 30% = optional-field completeness.
 */
export function computeReadiness(
  lead: Record<string, any>,
  mappings: LosFieldMapping[]
): ReadinessResult {
  const active = mappings.filter((m) => m.active);
  const required = active.filter((m) => m.required);
  const optional = active.filter((m) => !m.required);

  const v = validateAgainstMappings(lead, active);
  const missingExt = new Set(v.missing.map((i) => i.external_field));
  const invalidExt = new Set(
    v.invalid.filter((i) => i.severity === "error").map((i) => i.external_field)
  );

  const requiredFilled = required.filter(
    (m) => !missingExt.has(m.external_field) && !invalidExt.has(m.external_field)
  ).length;
  const optionalFilled = optional.filter((m) => {
    const val = v.resolved[m.external_field];
    return val !== null && val !== undefined && val !== "";
  }).length;

  const reqPct = required.length ? requiredFilled / required.length : 1;
  const optPct = optional.length ? optionalFilled / optional.length : 1;
  const score = Math.round((reqPct * 0.7 + optPct * 0.3) * 100);

  return {
    score,
    total: active.length,
    filled: requiredFilled + optionalFilled,
    requiredTotal: required.length,
    requiredFilled,
    missing: [...missingExt],
    invalid: [...invalidExt],
  };
}