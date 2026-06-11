import {
  normalizeEmail,
  normalizeMoney,
  normalizePhone,
  normalizeCreditScore,
  normalizeLoanPurpose,
  toISO8601,
} from "./format";
import { calcLoanAmountFromProfile } from "@/lib/loan/calcLoanAmount";
import { ARIVE_FIELD_MAP, type AriveFieldDef } from "./ariveFieldMap";

export type FieldStatus = "valid" | "missing" | "invalid";

export interface FieldReport {
  ariveField: string;
  crmField: string;
  rawValue: unknown;
  outputValue: unknown;
  status: FieldStatus;
  required: boolean;
  message?: string;
  usedDefault?: boolean;
}

export interface ValidationIssue {
  field: string;        // ARIVE field name
  code: "missing" | "invalid";
  message: string;
}

export interface AriveValidationResult {
  ok: boolean;
  score: number;                       // 0-100
  fields: FieldReport[];
  errors: ValidationIssue[];
  payload: Record<string, string | number>;
}

function readPath(source: Record<string, any>, path: string): unknown {
  if (!path) return undefined;
  return path.split(".").reduce<any>((acc, key) => (acc == null ? acc : acc[key]), source);
}

function coerce(value: unknown, def: AriveFieldDef): { value: any; valid: boolean } {
  if (value === null || value === undefined || value === "") return { value: null, valid: false };
  switch (def.type) {
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
      return { value: v, valid: v != null && Number.isFinite(v) };
    }
    case "fico": {
      const v = normalizeCreditScore(value as any);
      return { value: v, valid: v != null && v >= 300 && v <= 850 };
    }
    case "enum": {
      // Special-case loanPurpose normalisation, otherwise straight membership check
      let v: string | null;
      if (def.ariveField === "loanPurpose") {
        v = normalizeLoanPurpose(String(value));
      } else {
        v = String(value).trim();
      }
      const allowed = def.enumValues ?? [];
      const ok = !!v && (allowed.length === 0 || allowed.includes(v));
      return { value: ok ? v : null, valid: ok };
    }
    case "date": {
      const v = toISO8601(value as any);
      return { value: v, valid: !!v };
    }
    case "string":
    default: {
      const v = String(value).trim();
      return { value: v || null, valid: v.length > 0 };
    }
  }
}

/**
 * Pure validator + payload builder for ARIVE exports.
 * Builds a flat, primitive-only payload. Empty strings collapse to null
 * and missing keys are stripped from the final payload.
 */
export function validateAriveLead(
  lead: Record<string, any> | null | undefined,
  mortgageProfile: Record<string, any> | null | undefined,
): AriveValidationResult {
  if (!lead) {
    return { ok: false, score: 0, fields: [], errors: [{ field: "lead", code: "missing", message: "Lead is required" }], payload: {} };
  }

  // Parse mortgage_profiles.notes extras (loan_type, etc.)
  let mpExtras: any = {};
  try {
    mpExtras = mortgageProfile?.notes ? JSON.parse(mortgageProfile.notes) : {};
  } catch {
    mpExtras = {};
  }

  const computedLoanAmount = calcLoanAmountFromProfile(mortgageProfile ?? null, lead);

  const source: Record<string, any> = {
    ...lead,
    ...(mortgageProfile ?? {}),
    mp: mpExtras,
    __loan_amount:
      (lead as any).loan_amount ??
      (mortgageProfile as any)?.loan_amount ??
      computedLoanAmount,
  };

  const fields: FieldReport[] = [];
  const errors: ValidationIssue[] = [];
  const payload: Record<string, string | number> = {};

  let missingRequired = 0;
  let invalid = 0;
  let missingOptional = 0;

  for (const def of ARIVE_FIELD_MAP) {
    const raw = readPath(source, def.crmPath);
    let coerced = coerce(raw, def);
    let usedDefault = false;

    // Apply default when ARIVE requires a value and CRM had nothing
    if ((coerced.value == null || coerced.value === "") && def.required && def.defaultValue) {
      coerced = coerce(def.defaultValue, def);
      usedDefault = true;
    }

    let status: FieldStatus = "valid";
    let message: string | undefined;

    const hasValue = coerced.value !== null && coerced.value !== undefined && coerced.value !== "";

    if (!hasValue) {
      status = "missing";
      message = `${def.ariveField} is empty`;
      if (def.required) {
        missingRequired += 1;
        errors.push({ field: def.ariveField, code: "missing", message: `Missing required field: ${def.ariveField}` });
      } else {
        missingOptional += 1;
      }
    } else if (!coerced.valid) {
      status = "invalid";
      message = `Invalid ${def.type} for ${def.ariveField}`;
      invalid += 1;
      errors.push({ field: def.ariveField, code: "invalid", message });
    } else {
      payload[def.ariveField] = coerced.value;
    }

    fields.push({
      ariveField: def.ariveField,
      crmField: def.crmField,
      rawValue: raw ?? null,
      outputValue: coerced.value,
      status,
      required: def.required,
      message,
      usedDefault,
    });
  }

  // Ensure externalCreateDate exists — fall back to now()
  if (!payload.externalCreateDate) {
    payload.externalCreateDate = new Date().toISOString();
  }

  // Score: 100 − required missing×15 − invalid×10 − optional missing×5, floored at 0
  const score = Math.max(0, 100 - missingRequired * 15 - invalid * 10 - missingOptional * 5);

  // Strip any accidental nullish keys (belt + suspenders)
  for (const k of Object.keys(payload)) {
    const v = (payload as any)[k];
    if (v === null || v === undefined || v === "") delete (payload as any)[k];
  }

  return {
    ok: missingRequired === 0 && invalid === 0,
    score,
    fields,
    errors,
    payload,
  };
}
