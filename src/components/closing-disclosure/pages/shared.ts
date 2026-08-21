import type { ClosingDisclosureForm } from "@/lib/closing-disclosure/types";
import type { Totals } from "@/lib/closing-disclosure/calc";

export interface PageProps {
  form: ClosingDisclosureForm;
  update: (mutate: (draft: ClosingDisclosureForm) => void) => void;
  totals: Totals;
}

export const LOAN_PURPOSES = ["Purchase", "Refinance", "Construction", "Home Equity Loan"];
export const LOAN_PRODUCTS = [
  "Fixed Rate",
  "5/1 Adjustable Rate",
  "7/1 Adjustable Rate",
  "10/1 Adjustable Rate",
  "Step Rate",
  "Interest Only",
];
export const LOAN_TYPES = ["Conventional", "FHA", "VA", "USDA", "Other"];

export const toOptions = (values: string[]) => values.map((v) => ({ value: v, label: v }));
