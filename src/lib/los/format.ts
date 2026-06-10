/**
 * Phase 6 — LOS data formatting engine.
 * Pure normalizers used before any payload is sent to Zapier / ARIVE.
 * Backwards compatible: every function returns the original value when it can't safely normalize.
 */

export function normalizePhone(input?: string | null): string | null {
  if (input == null) return null;
  const digits = String(input).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length === 10) return digits;
  return digits || null;
}

export function normalizeEmail(input?: string | null): string | null {
  if (!input) return null;
  const v = String(input).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}

export function normalizeMoney(input?: string | number | null): number | null {
  if (input == null || input === "") return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  const cleaned = String(input).replace(/[^0-9.\-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function normalizeZip(input?: string | null): string | null {
  if (!input) return null;
  const v = String(input).trim();
  const m = v.match(/(\d{5})(?:-?(\d{4}))?/);
  return m ? (m[2] ? `${m[1]}-${m[2]}` : m[1]) : null;
}

export function normalizeDate(input?: string | Date | null): string | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Convert "$700-739" / "700-739" / "720" → midpoint integer. */
export function normalizeCreditScore(input?: string | number | null): number | null {
  if (input == null || input === "") return null;
  if (typeof input === "number") return Math.round(input);
  const nums = String(input).match(/\d{3}/g);
  if (!nums) return null;
  if (nums.length === 1) return Number(nums[0]);
  return Math.round((Number(nums[0]) + Number(nums[1])) / 2);
}

/** Best-effort split of a freeform address into line1/city/state/zip. Originals always preserved. */
export function splitAddress(input?: string | null): {
  line1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
} {
  if (!input) return { line1: null, city: null, state: null, zip: null };
  const parts = String(input).split(",").map((s) => s.trim()).filter(Boolean);
  const line1 = parts[0] ?? null;
  const city = parts.length >= 3 ? parts[1] : null;
  const tail = parts.length >= 3 ? parts[2] : parts[1] ?? "";
  const m = tail.match(/^([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?/i);
  return {
    line1,
    city,
    state: m?.[1]?.toUpperCase() ?? null,
    zip: normalizeZip(m?.[2] ?? null),
  };
}

/** Normalize the full LOS payload in one pass. Unknown keys are passed through untouched. */
export function normalizeLosPayload<T extends Record<string, any>>(p: T): T {
  const out: any = { ...p };
  if ("phone" in out) out.phone = normalizePhone(out.phone);
  if ("email" in out) out.email = normalizeEmail(out.email) ?? out.email;
  if ("loan_amount" in out) out.loan_amount = normalizeMoney(out.loan_amount);
  if ("property_value" in out) out.property_value = normalizeMoney(out.property_value);
  if ("annual_income" in out) out.annual_income = normalizeMoney(out.annual_income);
  if ("estimated_credit_score" in out) out.estimated_credit_score = normalizeCreditScore(out.estimated_credit_score);
  if (out.property_address) {
    const s = splitAddress(out.property_address);
    out.property_address_line1 = s.line1;
    out.property_city = s.city;
    out.property_state = s.state;
    out.property_zip = s.zip;
  }
  return out;
}