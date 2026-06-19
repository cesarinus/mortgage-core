/**
 * Canonical → LOS-vocab translations.
 * Apply inside the lead-context resolver so downstream mappers (LOS payload,
 * Zapier, Arive field-map) all see the same normalized strings.
 *
 * Keep this file free of side effects — it is imported by browser code and
 * potentially edge functions.
 */

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

const OCCUPANCY_MAP: Record<string, string> = {
  // Canonical CRM labels
  "primary residence": "PRIMARY",
  "primary": "PRIMARY",
  "owner occupied": "PRIMARY",
  "second home": "SECONDARY",
  "secondary": "SECONDARY",
  "investment": "INVESTMENT",
  "investment property": "INVESTMENT",
  // Already-LOS shapes pass through
  "primary_residence": "PRIMARY",
  "second_home": "SECONDARY",
  "investment_property": "INVESTMENT",
};

export function translateOccupancy(v: unknown): string | null {
  const k = norm(v).toLowerCase();
  if (!k) return null;
  return OCCUPANCY_MAP[k] ?? norm(v).toUpperCase();
}

const LOAN_PURPOSE_MAP: Record<string, string> = {
  "purchase": "Purchase",
  "buying": "Purchase",
  "refinance": "Refinance",
  "refi": "Refinance",
  "rate and term": "Refinance",
  "cash out": "Refinance",
  "cash-out": "Refinance",
  "cashout": "Refinance",
  "heloc": "Refinance",
};

export function translateLoanPurpose(v: unknown): string | null {
  const k = norm(v).toLowerCase();
  if (!k) return null;
  return LOAN_PURPOSE_MAP[k] ?? null;
}

const LIEN_POSITION_MAP: Record<string, string> = {
  "first lien": "FirstLien",
  "first": "FirstLien",
  "1": "FirstLien",
  "second lien": "SecondLien",
  "second": "SecondLien",
  "2": "SecondLien",
};

export function translateLienPosition(v: unknown): string | null {
  const k = norm(v).toLowerCase();
  if (!k) return "FirstLien"; // safe default — every loan we originate is 1st
  return LIEN_POSITION_MAP[k] ?? "FirstLien";
}