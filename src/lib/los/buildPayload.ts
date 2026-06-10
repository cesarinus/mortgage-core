import type { LosFieldMapping } from "./mappings";
import { validateAgainstMappings, type ValidationResult } from "./validate";

export interface BuiltPayload {
  payload: Record<string, unknown>;
  validation: ValidationResult;
}

/**
 * Apply mapping config to a CRM lead row → produce an outbound payload object
 * keyed by external_field, alongside the validation report.
 */
export function buildLosPayload(
  lead: Record<string, any>,
  mappings: LosFieldMapping[]
): BuiltPayload {
  const validation = validateAgainstMappings(lead, mappings);
  return { payload: validation.resolved, validation };
}