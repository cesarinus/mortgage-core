import { calculatePI, getMndRate } from "@/lib/calculatePI";

export type AutoScenarioRow = {
  lead_id: string;
  label: string;
  sublabel: string;
  purchase_price: number;
  property_address: string | null;
  down_payment_amt: number;
  down_payment_pct: number;
  loan_amount: number;
  ltv: number;
  mortgage_type: string;
  lien_position: string;
  pi: number;
  hoi: number;
  supplemental: number;
  property_taxes: number;
  mi: number;
  dues: number;
  other_amount: number;
  other_label: string | null;
  total_piti: number;
  loan_term_years: number;
  interest_rate: number;
  rate_source: string;
  buydown_mode: boolean;
  points_budget: number | null;
  points_purchasable: number | null;
  rate_reduction_pct: number | null;
  reduction_per_point: number | null;
  bought_down_rate: number | null;
  breakeven_vs_a_months: number | null;
  breakeven_vs_b_months: number | null;
  created_by?: string | null;
};

const DEFAULTS = { hoi: 166.67, supplemental: 47.67, property_taxes: 240.75 };
const MI_ANNUAL_RATE = 0.0075; // 0.75% when LTV > 80
const REDUCTION_PER_POINT = 0.25;

function creditMidpoint(range: string | null | undefined): number {
  if (!range) return 700;
  const m = String(range).match(/(\d{3})/g);
  if (!m) return 700;
  const nums = m.map(Number);
  if (nums.length >= 2) return Math.round((nums[0] + nums[1]) / 2);
  return nums[0];
}

function buildOne(args: {
  leadId: string;
  label: string;
  sublabel: string;
  price: number;
  address: string | null;
  dpPct: number;
  mortgageType: string;
  term: number;
  rate: number;
  hoi: number;
  supp: number;
  taxes: number;
  userId?: string | null;
}): AutoScenarioRow {
  const dpAmt = +(args.price * (args.dpPct / 100)).toFixed(2);
  const loan = Math.max(0, +(args.price - dpAmt).toFixed(2));
  const ltv = args.price > 0 ? +((loan / args.price) * 100).toFixed(3) : 0;
  const mi = ltv > 80 && args.mortgageType !== "VA" ? +((loan * MI_ANNUAL_RATE) / 12).toFixed(2) : 0;
  const pi = +calculatePI(loan, args.rate, args.term).toFixed(2);
  const total = +(pi + args.hoi + args.supp + args.taxes + mi).toFixed(2);
  return {
    lead_id: args.leadId,
    label: args.label,
    sublabel: args.sublabel,
    purchase_price: args.price,
    property_address: args.address,
    down_payment_amt: dpAmt,
    down_payment_pct: +args.dpPct.toFixed(3),
    loan_amount: loan,
    ltv,
    mortgage_type: args.mortgageType,
    lien_position: "First Lien",
    pi,
    hoi: args.hoi,
    supplemental: args.supp,
    property_taxes: args.taxes,
    mi,
    dues: 0,
    other_amount: 0,
    other_label: null,
    total_piti: total,
    loan_term_years: args.term,
    interest_rate: +args.rate.toFixed(4),
    rate_source: "mnd_live",
    buydown_mode: false,
    points_budget: null,
    points_purchasable: null,
    rate_reduction_pct: null,
    reduction_per_point: null,
    bought_down_rate: null,
    breakeven_vs_a_months: null,
    breakeven_vs_b_months: null,
    created_by: args.userId ?? null,
  };
}

export function buildAutoScenarios(
  lead: any,
  mortgageProfile: any | null,
  userId?: string | null,
): { scenarios: AutoScenarioRow[]; warnings: string[] } {
  const warnings: string[] = [];
  const price = Number(
    mortgageProfile?.purchase_price ?? lead?.property_value ?? 0,
  );
  if (!price || price <= 0) {
    return {
      scenarios: [],
      warnings: ["Add a purchase price or property value to the lead before auto-generating."],
    };
  }

  let mpNotes: any = {};
  try { mpNotes = mortgageProfile?.notes ? JSON.parse(mortgageProfile.notes) : {}; } catch {}

  const credit = creditMidpoint(lead?.credit_range);
  const useFHA = credit < 680;
  const typeA = useFHA ? "FHA" : "Conventional";
  const dpA = useFHA ? 3.5 : 5;
  const term = 30;
  const address = mortgageProfile?.property_address ?? lead?.property_address ?? lead?.address ?? null;

  const hoi = DEFAULTS.hoi;
  const supp = DEFAULTS.supplemental;
  const taxes = DEFAULTS.property_taxes;

  const rateA = getMndRate(typeA).effectiveRate;
  const rateConv = getMndRate("Conventional").effectiveRate;

  const A = buildOne({
    leadId: lead.id, label: "Option A", sublabel: useFHA ? "FHA Low Down" : "Low Down",
    price, address, dpPct: dpA, mortgageType: typeA, term, rate: rateA,
    hoi, supp, taxes, userId,
  });

  const B = buildOne({
    leadId: lead.id, label: "Option B", sublabel: "Standard 10% Down",
    price, address, dpPct: 10, mortgageType: "Conventional", term, rate: rateConv,
    hoi, supp, taxes, userId,
  });

  // Option C: 20% down, redirect Δ(B-A) cash to discount points (industry-standard buydown)
  const dpC = 20;
  const dpAmtC = +(price * (dpC / 100)).toFixed(2);
  const loanC = Math.max(0, +(price - dpAmtC).toFixed(2));
  const ltvC = price > 0 ? +((loanC / price) * 100).toFixed(3) : 0;
  const pointsBudget = Math.max(0, +(B.down_payment_amt - A.down_payment_amt).toFixed(2));
  const costPerPoint = loanC * 0.01;
  const pointsPurchasable = costPerPoint > 0 ? +(pointsBudget / costPerPoint).toFixed(4) : 0;
  const rateReductionPct = +(pointsPurchasable * REDUCTION_PER_POINT).toFixed(4);
  const boughtDownRate = Math.max(0, +(rateConv - rateReductionPct).toFixed(4));
  const piC = +calculatePI(loanC, boughtDownRate, term).toFixed(2);
  const miC = ltvC > 80 ? +((loanC * MI_ANNUAL_RATE) / 12).toFixed(2) : 0;
  const totalC = +(piC + hoi + supp + taxes + miC).toFixed(2);
  const savingsA = +(A.pi - piC).toFixed(2);
  const savingsB = +(B.pi - piC).toFixed(2);

  const C: AutoScenarioRow = {
    lead_id: lead.id,
    label: "Option C",
    sublabel: "Rate Buydown",
    purchase_price: price,
    property_address: address,
    down_payment_amt: dpAmtC,
    down_payment_pct: dpC,
    loan_amount: loanC,
    ltv: ltvC,
    mortgage_type: "Conventional",
    lien_position: "First Lien",
    pi: piC,
    hoi, supplemental: supp, property_taxes: taxes,
    mi: miC, dues: 0, other_amount: 0, other_label: null,
    total_piti: totalC,
    loan_term_years: term,
    interest_rate: boughtDownRate,
    rate_source: "mnd_live",
    buydown_mode: true,
    points_budget: pointsBudget,
    points_purchasable: pointsPurchasable,
    rate_reduction_pct: rateReductionPct,
    reduction_per_point: REDUCTION_PER_POINT,
    bought_down_rate: boughtDownRate,
    breakeven_vs_a_months: savingsA > 0 ? Math.round(pointsBudget / savingsA) : null,
    breakeven_vs_b_months: savingsB > 0 ? Math.round(pointsBudget / savingsB) : null,
    created_by: userId ?? null,
  };

  if (!mortgageProfile?.purchase_price && lead?.property_value) {
    warnings.push("Used lead's property value — confirm purchase price on the lead.");
  }
  if (!lead?.credit_range) warnings.push("No credit range on lead — defaulted to Conventional.");

  return { scenarios: [A, B, C], warnings };
}