export interface EstimateInputs {
  price: number;
  downPayment: number;
  annualRatePct: number;       // adjusted CRM rate (e.g. 6.875)
  termYears?: number;          // default 30
  propertyTaxesAnnual?: number;
  homeownersInsuranceAnnual?: number;
  hoaMonthly?: number;
  loanType?: string | null;    // "va" skips PMI
}

export interface EstimateResult {
  principal: number;
  monthlyPI: number;
  monthlyTaxes: number;
  monthlyInsurance: number;
  monthlyHoa: number;
  monthlyPmi: number;
  totalMonthly: number;
  ltv: number;
  rateUsed: number;
}

export function estimatePayment(i: EstimateInputs): EstimateResult {
  const price = Number(i.price) || 0;
  const down = Number(i.downPayment) || 0;
  const principal = Math.max(price - down, 0);
  const term = (i.termYears ?? 30) * 12;
  const annual = Number(i.annualRatePct) || 0;
  const r = annual / 100 / 12;

  let pi = 0;
  if (principal > 0 && term > 0) {
    pi = r === 0
      ? principal / term
      : (principal * r) / (1 - Math.pow(1 + r, -term));
  }

  const taxes = (i.propertyTaxesAnnual ?? price * 0.0125) / 12;
  const ins = (i.homeownersInsuranceAnnual ?? 1800) / 12;
  const hoa = i.hoaMonthly ?? 0;

  const ltv = price > 0 ? principal / price : 0;
  const skipPmi = (i.loanType ?? "").toLowerCase() === "va";
  const pmi = !skipPmi && ltv > 0.8 && principal > 0 ? (principal * 0.005) / 12 : 0;

  const total = pi + taxes + ins + hoa + pmi;
  return {
    principal,
    monthlyPI: pi,
    monthlyTaxes: taxes,
    monthlyInsurance: ins,
    monthlyHoa: hoa,
    monthlyPmi: pmi,
    totalMonthly: Math.round(total),
    ltv,
    rateUsed: annual,
  };
}

export interface DtiInputs {
  housingPayment: number;
  monthlyLiabilities: number;
  grossMonthlyIncome: number;
}

export function computeDtis({ housingPayment, monthlyLiabilities, grossMonthlyIncome }: DtiInputs) {
  if (!grossMonthlyIncome || grossMonthlyIncome <= 0) {
    return { frontEndDti: 0, backEndDti: 0 };
  }
  const frontEndDti = Math.round((housingPayment / grossMonthlyIncome) * 100);
  const backEndDti = Math.round(((housingPayment + (monthlyLiabilities || 0)) / grossMonthlyIncome) * 100);
  return { frontEndDti, backEndDti };
}