// Mortgage calculation utilities
// Default rates: MND base rates as of April 22, 2026 + 0.275% (27.5 bps)

export type LoanType =
  | "30-year-fixed"
  | "15-year-fixed"
  | "fha"
  | "va"
  | "jumbo"
  | "5-1-arm";

export interface LoanTypeOption {
  value: LoanType;
  label: string;
  baseRate: number; // MND base
  defaultRate: number; // base + 0.275
  defaultTerm: number;
}

export const LOAN_TYPES: LoanTypeOption[] = [
  { value: "30-year-fixed", label: "30-Year Fixed", baseRate: 6.33, defaultRate: 6.605, defaultTerm: 30 },
  { value: "15-year-fixed", label: "15-Year Fixed", baseRate: 5.92, defaultRate: 6.195, defaultTerm: 15 },
  { value: "fha", label: "FHA Loan", baseRate: 6.5, defaultRate: 6.775, defaultTerm: 30 },
  { value: "va", label: "VA Loan", baseRate: 6.25, defaultRate: 6.525, defaultTerm: 30 },
  { value: "jumbo", label: "Jumbo Loan", baseRate: 6.55, defaultRate: 6.825, defaultTerm: 30 },
  { value: "5-1-arm", label: "5/1 ARM", baseRate: 6.1, defaultRate: 6.375, defaultTerm: 30 },
];

export const TERM_OPTIONS = [10, 15, 20, 25, 30] as const;

export const DEFAULT_PROPERTY_TAX_ANNUAL = 2500;
export const DEFAULT_INSURANCE_ANNUAL = 2000;

// PMI rate when LTV > 80%. Conservative middle of the 0.5–1% range.
const PMI_ANNUAL_RATE = 0.0075;

export interface CalcInputs {
  homePrice: number;
  downPayment: number;
  loanTermYears: number;
  annualRatePct: number; // e.g. 6.605
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  loanType: LoanType;
}

export interface CalcResult {
  loanAmount: number;
  monthlyPI: number;
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyPMI: number;
  totalMonthly: number;
  totalInterest: number;
  totalCost: number;
  pmiRequired: boolean;
  ltv: number;
}

export function calculateMortgage(input: CalcInputs): CalcResult {
  const loanAmount = Math.max(0, input.homePrice - input.downPayment);
  const n = input.loanTermYears * 12;
  const r = input.annualRatePct / 100 / 12;

  let monthlyPI = 0;
  if (loanAmount > 0 && n > 0) {
    if (r === 0) {
      monthlyPI = loanAmount / n;
    } else {
      monthlyPI = (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }
  }

  const ltv = input.homePrice > 0 ? loanAmount / input.homePrice : 0;
  // VA loans don't require PMI; FHA has its own MIP but for simplicity we apply PMI rule
  const pmiRequired = input.loanType !== "va" && ltv > 0.8 && loanAmount > 0;
  const monthlyPMI = pmiRequired ? (loanAmount * PMI_ANNUAL_RATE) / 12 : 0;

  const monthlyTax = input.propertyTaxAnnual / 12;
  const monthlyInsurance = input.insuranceAnnual / 12;

  const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance + monthlyPMI;
  const totalInterest = monthlyPI * n - loanAmount;
  const totalCost = monthlyPI * n;

  return {
    loanAmount,
    monthlyPI,
    monthlyTax,
    monthlyInsurance,
    monthlyPMI,
    totalMonthly,
    totalInterest: Math.max(0, totalInterest),
    totalCost,
    pmiRequired,
    ltv,
  };
}

export const formatUSD = (n: number, fractionDigits = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(isFinite(n) ? n : 0);
