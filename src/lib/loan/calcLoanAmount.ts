export type LoanTypeInput = string | null | undefined;

export interface CalcLoanAmountInputs {
  loan_type?: LoanTypeInput;
  purchase_price?: number | null;
  down_payment?: number | null;
}

/**
 * Compute the financed loan amount from intake data.
 *
 * Conventional (default): purchase_price - down_payment
 * FHA: (purchase_price - max(down_payment, 3.5%)) * 1.0175  // base + UFMIP financed
 */
export function calcLoanAmount({
  loan_type,
  purchase_price,
  down_payment,
}: CalcLoanAmountInputs): number | null {
  const price = Number(purchase_price ?? 0);
  if (!price || price <= 0) return null;
  const type = String(loan_type ?? "conventional").toLowerCase();
  const dpRaw = Number(down_payment ?? 0);

  if (type === "fha") {
    const minDown = price * 0.035;
    const dp = Math.max(dpRaw || minDown, minDown);
    const base = Math.max(price - dp, 0);
    return Math.round(base * 1.0175);
  }

  // conventional / va / usda / other → simple price - down
  return Math.max(0, Math.round(price - dpRaw));
}

/**
 * Convenience wrapper that pulls inputs from a mortgage_profiles row
 * (with its JSON-string `notes` column) plus a leads row as fallback.
 */
export function calcLoanAmountFromProfile(
  mortgage: any | null,
  lead: any | null,
): number | null {
  let mpNotes: any = {};
  try {
    mpNotes = mortgage?.notes ? JSON.parse(mortgage.notes) : {};
  } catch {
    mpNotes = {};
  }
  return calcLoanAmount({
    loan_type: mpNotes?.loan_type ?? null,
    purchase_price: mortgage?.purchase_price ?? lead?.property_value ?? null,
    down_payment: mortgage?.down_payment ?? null,
  });
}