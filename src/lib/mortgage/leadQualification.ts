import { estimatePayment } from "./estimatePayment";

/**
 * Leads-page-only pre-qualification engine.
 * Do NOT use these calculations in Pipeline / Active Loans / Processing /
 * Underwriting / Closing / Post-Close — those stages must display ARIVE LOS
 * values as the source of truth.
 */

export interface QualificationInputs {
  // Property / loan
  purchasePrice: number;
  propertyValue?: number;
  downPayment: number;
  loanAmount?: number;
  loanType?: string | null;
  annualRatePct: number;
  // PITI extras
  annualPropertyTax?: number;
  annualInsurance?: number;
  hoaMonthly?: number;
  floodInsuranceMonthly?: number;
  pmiMonthlyOverride?: number;
  // Income (already summed from Income Analysis)
  totalMonthlyIncome: number;
  // Liabilities
  monthlyLiabilities?: number;
  // Readiness extras
  creditScore?: number | null;
  incomeStabilityYears?: number | null;
  reservesMonths?: number | null;
}

export interface QualificationResult {
  loanAmount: number;
  monthlyPI: number;
  propertyTaxesMonthly: number;
  insuranceMonthly: number;
  hoaMonthly: number;
  floodInsuranceMonthly: number;
  pmiMonthly: number;
  housingExpense: number;
  totalMonthlyDebt: number;
  frontEndDTI: number;     // 0..1
  backEndDTI: number;      // 0..1
  ltv: number;             // 0..1
  readinessScore: number;  // 0..100
  readinessStatus: "Excellent" | "Strong" | "Review" | "Needs Work";
}

export function calcLeadQualification(i: QualificationInputs): QualificationResult {
  const price = Number(i.purchasePrice) || 0;
  const propertyValue = Number(i.propertyValue ?? price) || 0;
  const down = Number(i.downPayment) || 0;
  const loanAmount = Number(i.loanAmount ?? Math.max(price - down, 0)) || 0;

  const taxes = i.annualPropertyTax != null
    ? Number(i.annualPropertyTax) / 12
    : (price * 0.0125) / 12;
  const ins = i.annualInsurance != null
    ? Number(i.annualInsurance) / 12
    : 150;
  const hoa = Number(i.hoaMonthly ?? 0);
  const flood = Number(i.floodInsuranceMonthly ?? 0);

  // PI via shared estimator (handles 0-rate edge)
  const est = estimatePayment({
    price,
    downPayment: down,
    annualRatePct: i.annualRatePct,
    propertyTaxesAnnual: i.annualPropertyTax,
    homeownersInsuranceAnnual: i.annualInsurance,
    hoaMonthly: hoa,
    loanType: i.loanType ?? null,
  });
  const pi = est.monthlyPI;

  const ltv = propertyValue > 0 ? loanAmount / propertyValue : 0;
  const skipPmi = (i.loanType ?? "").toLowerCase() === "va";
  const pmi = i.pmiMonthlyOverride != null
    ? Number(i.pmiMonthlyOverride)
    : !skipPmi && ltv > 0.8 && loanAmount > 0
      ? (loanAmount * 0.005) / 12
      : 0;

  const housingExpense = pi + taxes + ins + hoa + flood + pmi;
  const totalMonthlyDebt = Number(i.monthlyLiabilities ?? 0);

  const inc = Math.max(0, Number(i.totalMonthlyIncome) || 0);
  const frontEndDTI = inc > 0 ? housingExpense / inc : 0;
  const backEndDTI = inc > 0 ? (housingExpense + totalMonthlyDebt) / inc : 0;

  // Readiness (weights: DTI 35, LTV 25, Credit 20, Income stability 10, Reserves 10)
  const dtiSub = backEndDTI <= 0
    ? 0
    : backEndDTI <= 0.36 ? 100
    : backEndDTI <= 0.43 ? 80
    : backEndDTI <= 0.5 ? 55
    : 25;
  const ltvSub = ltv <= 0
    ? 50
    : ltv <= 0.6 ? 100
    : ltv <= 0.8 ? 85
    : ltv <= 0.95 ? 60
    : 35;
  const credit = Number(i.creditScore ?? 0);
  const creditSub = credit >= 760 ? 100
    : credit >= 720 ? 90
    : credit >= 680 ? 75
    : credit >= 640 ? 55
    : credit >= 580 ? 35
    : credit > 0 ? 20 : 50;
  const years = Number(i.incomeStabilityYears ?? 0);
  const stabilitySub = years >= 2 ? 100 : years >= 1 ? 70 : years > 0 ? 50 : 50;
  const reserves = Number(i.reservesMonths ?? 0);
  const reservesSub = reserves >= 6 ? 100 : reserves >= 3 ? 75 : reserves >= 1 ? 50 : 25;

  const readinessScore = Math.round(
    dtiSub * 0.35 + ltvSub * 0.25 + creditSub * 0.20 + stabilitySub * 0.10 + reservesSub * 0.10,
  );
  const readinessStatus: QualificationResult["readinessStatus"] =
    readinessScore >= 90 ? "Excellent"
    : readinessScore >= 80 ? "Strong"
    : readinessScore >= 70 ? "Review"
    : "Needs Work";

  return {
    loanAmount,
    monthlyPI: pi,
    propertyTaxesMonthly: taxes,
    insuranceMonthly: ins,
    hoaMonthly: hoa,
    floodInsuranceMonthly: flood,
    pmiMonthly: pmi,
    housingExpense,
    totalMonthlyDebt,
    frontEndDTI,
    backEndDTI,
    ltv,
    readinessScore,
    readinessStatus,
  };
}

/** Parse credit score from a `credit_range` string like "740+", "680-700", "<620". */
export function parseCreditScore(range?: string | null): number | null {
  if (!range) return null;
  const nums = String(range).match(/\d{3}/g);
  if (!nums || nums.length === 0) return null;
  if (nums.length === 1) return Number(nums[0]);
  const a = Number(nums[0]);
  const b = Number(nums[1]);
  return Math.round((a + b) / 2);
}