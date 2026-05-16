import { LOAN_TYPES } from "./mortgageCalc";

// Spread (in percentage points) added to MND base rates throughout the app.
// Sourced from src/lib/mortgageCalc.ts (defaultRate = baseRate + 0.275).
export const MND_RATE_SPREAD_PCT = 0.275;

export type MortgageTypeKey = "Conventional" | "FHA" | "VA" | "USDA";

export interface MndRateLookup {
  baseRate: number;     // raw MND
  spread: number;       // bps spread (pct points)
  effectiveRate: number; // base + spread
  asOf: string;         // ISO timestamp
  productLabel: string;
}

const MND_AS_OF = "2026-04-22T14:30:00-04:00";

function productKey(type: string | null | undefined): string {
  switch ((type ?? "Conventional").toLowerCase()) {
    case "fha": return "fha";
    case "va": return "va";
    case "usda": return "30-year-fixed"; // fallback per spec
    default: return "30-year-fixed";
  }
}

export function getMndRate(mortgageType: string | null | undefined): MndRateLookup {
  const key = productKey(mortgageType);
  const entry = LOAN_TYPES.find(t => t.value === key) ?? LOAN_TYPES[0];
  return {
    baseRate: entry.baseRate,
    spread: MND_RATE_SPREAD_PCT,
    effectiveRate: +(entry.baseRate + MND_RATE_SPREAD_PCT).toFixed(4),
    asOf: MND_AS_OF,
    productLabel: entry.label,
  };
}

export function calculatePI(
  loanAmount: number,
  annualRatePct: number,
  termYears: number,
): number {
  if (!loanAmount || !annualRatePct || !termYears) return 0;
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return loanAmount / n;
  const m = (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return isFinite(m) ? m : 0;
}