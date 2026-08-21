import type { ClosingDisclosureForm } from "./types";

export const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export const sum = (values: Array<number | null | undefined>) =>
  values.reduce<number>((acc, v) => acc + num(v), 0);

export const money = (v: number | null | undefined, opts?: { blank?: boolean }) => {
  if (v === null || v === undefined || (opts?.blank && v === 0)) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num(v));
};

export const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? "" : `${num(v).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}%`;

export const dateUS = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${m}/${d}/${y}`;
};

/** All derived subtotals for the form. Pure — never mutates. */
export function computeTotals(f: ClosingDisclosureForm) {
  const sectionA = sum(f.loanCosts.origination_charges.map((l) => l.amount));
  const sectionB = sum(f.loanCosts.services_not_shopped.map((l) => l.borrower_paid_at_closing));
  const sectionC = sum(f.loanCosts.services_shopped.map((l) => l.borrower_paid_at_closing));
  const totalLoanCosts = sectionA + sectionB + sectionC;

  const borrowerPaidBefore = sum([
    ...f.loanCosts.services_not_shopped.map((l) => l.borrower_paid_before),
    ...f.loanCosts.services_shopped.map((l) => l.borrower_paid_before),
  ]);
  const sellerPaid = sum([
    ...f.loanCosts.services_not_shopped.map((l) => l.seller_paid),
    ...f.loanCosts.services_shopped.map((l) => l.seller_paid),
  ]);
  const othersPaid = sum([
    ...f.loanCosts.services_not_shopped.map((l) => l.others_paid),
    ...f.loanCosts.services_shopped.map((l) => l.others_paid),
  ]);

  const oc = f.otherCosts;
  const sectionE =
    num(oc.recording_fees_deed) +
    num(oc.recording_fees_mortgage) +
    sum(oc.other_government_fees.map((l) => l.borrower_paid_at_closing));

  const p = oc.prepaids;
  const sectionF =
    num(p.homeowners_insurance_premium) +
    num(p.mortgage_insurance_premium) +
    num(p.prepaid_interest_amount) +
    num(p.property_taxes_amount) +
    sum(p.other_prepaids.map((l) => l.borrower_paid_at_closing));

  const sectionG = sum(oc.initial_escrow.map((l) => l.amount)) + num(oc.aggregate_adjustment);
  const sectionH = sum(oc.other_costs_detail.map((l) => l.borrower_paid_at_closing));
  const totalOtherCosts = sectionE + sectionF + sectionG + sectionH;

  const lenderCredits = num(oc.lender_credits_amount);
  const totalClosingCosts = totalLoanCosts + totalOtherCosts - Math.abs(lenderCredits);

  const projectedTotal =
    num(f.projectedPayments.principal_interest) +
    num(f.projectedPayments.mortgage_insurance) +
    num(f.projectedPayments.estimated_escrow);

  const escrowedYear1 = sum(f.projectedPayments.escrowed_property_costs.map((l) => l.amount));
  const nonEscrowedYear1 = sum(f.projectedPayments.non_escrowed_property_costs.map((l) => l.amount));

  const totalDueFromBorrower = sum(f.cashToClose.due_from_borrower.map((l) => l.amount));
  const totalPaidAlreadyByBorrower = sum(f.cashToClose.paid_already_by_borrower.map((l) => l.amount));
  const cashToCloseBorrower = totalDueFromBorrower - totalPaidAlreadyByBorrower;

  const totalDueToSeller = sum(f.cashToClose.due_to_seller.map((l) => l.amount));
  const totalDueFromSeller = sum(f.cashToClose.due_from_seller.map((l) => l.amount));
  const cashToCloseSeller = totalDueToSeller - totalDueFromSeller;

  const s = f.cashToClose.summaries;
  const summaryCashToClose =
    num(s.total_closing_costs) -
    num(s.closing_costs_paid_before) -
    num(s.closing_costs_financed) +
    num(s.down_payment) -
    num(s.deposit) -
    num(s.funds_for_borrower) -
    num(s.seller_credits) -
    num(s.adjustments_and_other_credits);

  return {
    sectionA,
    sectionB,
    sectionC,
    totalLoanCosts,
    borrowerPaidBefore,
    sellerPaid,
    othersPaid,
    sectionE,
    sectionF,
    sectionG,
    sectionH,
    totalOtherCosts,
    lenderCredits,
    totalClosingCosts,
    projectedTotal,
    escrowedYear1,
    nonEscrowedYear1,
    totalDueFromBorrower,
    totalPaidAlreadyByBorrower,
    cashToCloseBorrower,
    totalDueToSeller,
    totalDueFromSeller,
    cashToCloseSeller,
    summaryCashToClose,
  };
}

export type Totals = ReturnType<typeof computeTotals>;

/** Minimal regulatory-ish validation for submit. */
export function validateForm(f: ClosingDisclosureForm): string[] {
  const errors: string[] = [];
  if (!f.transactionInfo.borrower_name.trim()) errors.push("Page 1: Borrower name is required.");
  if (!f.transactionInfo.lender_name.trim()) errors.push("Page 1: Lender name is required.");
  if (!f.transactionInfo.loan_id.trim()) errors.push("Page 1: Loan ID # is required.");
  if (!f.closingInfo.date_issued) errors.push("Page 1: Date Issued is required.");
  if (!f.closingInfo.closing_date) errors.push("Page 1: Closing Date is required.");
  if (!f.property.property_address.trim()) errors.push("Page 1: Property address is required.");
  if (!f.loanTerms.loan_amount) errors.push("Page 1: Loan amount is required.");
  if (f.loanTerms.interest_rate === null) errors.push("Page 1: Interest rate is required.");
  if (f.loanCalculations.apr === null) errors.push("Page 6: Annual Percentage Rate (APR) is required.");

  // Currency fields must be finite, non-negative numbers.
  const currency: Array<[string, number | null]> = [
    ["Loan amount", f.loanTerms.loan_amount],
    ["Sale price", f.property.sale_price],
    ["Total closing costs", f.closingCostsSummary.total_closing_costs],
    ["Cash to close", f.closingCostsSummary.cash_to_close_amount],
  ];
  for (const [label, v] of currency) {
    if (v !== null && (!Number.isFinite(v) || v < 0)) errors.push(`${label} must be a valid amount.`);
  }

  // Date fields must parse.
  const dates: Array<[string, string]> = [
    ["Date Issued", f.closingInfo.date_issued],
    ["Closing Date", f.closingInfo.closing_date],
    ["Disbursement Date", f.closingInfo.disbursement_date],
  ];
  for (const [label, v] of dates) {
    if (v && Number.isNaN(new Date(v).getTime())) errors.push(`${label} is not a valid date.`);
  }

  if (!f.signatures.applicant_signature_data_url)
    errors.push("Page 5: Applicant signature is required before submitting.");
  if (!f.signatures.receipt_confirmed)
    errors.push("Page 5: Receipt of the Closing Disclosure must be confirmed.");
  return errors;
}
