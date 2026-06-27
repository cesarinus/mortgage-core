/**
 * Public entry point for the Income Analysis engine.
 *
 * Typical usage:
 *   const result = await calculateCase(caseId);
 * which loads inputs from Supabase, evaluates every worksheet section, and
 * persists the result into income_analysis_calculations + _summaries.
 */
import { loadCaseInputs } from "./loadInputs";
import { persistCalculation } from "./persistence";
import { runCaseCalculation } from "./runCalculation";
import type { CaseCalculationResult, CaseInputs } from "./types";

export { runCaseCalculation } from "./runCalculation";
export { loadCaseInputs } from "./loadInputs";
export { persistCalculation } from "./persistence";
export { evaluate, makeParser } from "./formula";
export type { CaseInputs, CaseCalculationResult } from "./types";

/** Load → evaluate → persist for one case. */
export async function calculateCase(caseId: string): Promise<CaseCalculationResult> {
  const inputs = await loadCaseInputs(caseId);
  const result = runCaseCalculation(inputs);
  await persistCalculation(result);
  return result;
}

/** Evaluate inputs in-memory (no DB writes). Useful for previewing scenarios. */
export function previewCalculation(inputs: CaseInputs): CaseCalculationResult {
  return runCaseCalculation(inputs);
}