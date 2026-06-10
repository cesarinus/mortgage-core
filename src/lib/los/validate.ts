import type { LosFieldMapping } from "./mappings";
import {
  normalizePhone, normalizeEmail, normalizeMoney, normalizeZip, normalizeDate,
} from "./format";

export interface ValidationIssue {
  crm_field: string;
  external_field: string;
  severity: "error" | "warning";
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  missing: ValidationIssue[];
  invalid: ValidationIssue[];
  resolved: Record<string, unknown>;
}

function coerce(value: unknown, type: string): { value: unknown; valid: boolean } {
  if (value === null || value === undefined || value === "") return { value: null, valid: false };
  switch (type) {
    case "email": {
      const v = normalizeEmail(String(value));
      return { value: v, valid: !!v };
    }
    case "phone": {
      const v = normalizePhone(String(value));
      return { value: v, valid: !!v && v.length === 10 };
    }
    case "money":
    case "number": {
      const v = normalizeMoney(value as any);
      return { value: v, valid: v != null };
    }
    case "zip": {
      const v = normalizeZip(String(value));
      return { value: v, valid: !!v };
    }
    case "date": {
      const v = normalizeDate(value as any);
      return { value: v, valid: !!v };
    }
    case "boolean":
      return { value: !!value, valid: true };
    default:
      return { value: String(value), valid: String(value).trim().length > 0 };
  }
}

/**
 * Run mapping-driven validation against a CRM lead row.
 * Returns missing required fields, format errors, and the normalized payload.
 */
export function validateAgainstMappings(
  lead: Record<string, any>,
  mappings: LosFieldMapping[]
): ValidationResult {
  const missing: ValidationIssue[] = [];
  const invalid: ValidationIssue[] = [];
  const resolved: Record<string, unknown> = {};

  for (const m of mappings) {
    if (!m.active) continue;
    let raw = lead?.[m.crm_field];
    if ((raw === null || raw === undefined || raw === "") && m.default_value) raw = m.default_value;

    const { value, valid } = coerce(raw, m.data_type);
    resolved[m.external_field] = value;

    if (value === null || value === undefined || value === "") {
      if (m.required) {
        missing.push({
          crm_field: m.crm_field,
          external_field: m.external_field,
          severity: "error",
          message: `Missing required field: ${m.external_field}`,
        });
      }
    } else if (!valid) {
      invalid.push({
        crm_field: m.crm_field,
        external_field: m.external_field,
        severity: m.required ? "error" : "warning",
        message: `Invalid ${m.data_type} for ${m.external_field}`,
      });
    }
  }

  return {
    ok: missing.length === 0 && invalid.filter((i) => i.severity === "error").length === 0,
    missing,
    invalid,
    resolved,
  };
}