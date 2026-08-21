import { Section, Grid, MoneyField, NumberField, TextField, TotalRow, LineItems } from "../fields";
import { PageProps } from "./shared";
import { emptyServiceLine, emptyOtherCostLine } from "@/lib/closing-disclosure/types";
import type { ServiceLine, OtherCostLine } from "@/lib/closing-disclosure/types";
import type { Column } from "../fields";

const SERVICE_COLUMNS: Column<ServiceLine>[] = [
  { key: "item", header: "Item", type: "text" as const },
  { key: "borrower_paid_at_closing", header: "Borrower-Paid At Closing", type: "money" as const },
  { key: "borrower_paid_before", header: "Borrower-Paid Before Closing", type: "money" as const },
  { key: "seller_paid", header: "Seller-Paid", type: "money" as const },
  { key: "others_paid", header: "Paid by Others", type: "money" as const },
];

const OTHER_COLUMNS: Column<OtherCostLine>[] = [
  { key: "item", header: "Item", type: "text" as const },
  { key: "borrower_paid_at_closing", header: "Borrower-Paid At Closing", type: "money" as const },
  { key: "seller_paid", header: "Seller-Paid", type: "money" as const },
  { key: "others_paid", header: "Paid by Others", type: "money" as const },
];

export default function Page2({ form, update, totals }: PageProps) {
  const lc = form.loanCosts;
  const oc = form.otherCosts;
  const p = oc.prepaids;

  return (
    <div className="space-y-6">
      <Section letter="A" title="Origination Charges">
        <LineItems
          rows={lc.origination_charges}
          makeRow={() => ({ item: "", percent_of_loan: null, amount: null })}
          onChange={(rows) => update((f) => { f.loanCosts.origination_charges = rows; })}
          columns={[
            { key: "item", header: "Item", type: "text" },
            { key: "percent_of_loan", header: "% of Loan Amount", type: "number", suffix: "%" },
            { key: "amount", header: "Amount", type: "money" },
          ]}
        />
        <TotalRow label="A. Origination Charges" value={totals.sectionA} />
      </Section>

      <Section letter="B" title="Services Borrower Did Not Shop For">
        <LineItems
          rows={lc.services_not_shopped}
          makeRow={emptyServiceLine}
          onChange={(rows) => update((f) => { f.loanCosts.services_not_shopped = rows; })}
          columns={SERVICE_COLUMNS}
        />
        <TotalRow label="B. Services Borrower Did Not Shop For" value={totals.sectionB} />
      </Section>

      <Section letter="C" title="Services Borrower Did Shop For">
        <LineItems
          rows={lc.services_shopped}
          makeRow={emptyServiceLine}
          onChange={(rows) => update((f) => { f.loanCosts.services_shopped = rows; })}
          columns={SERVICE_COLUMNS}
        />
        <TotalRow label="C. Services Borrower Did Shop For" value={totals.sectionC} />
      </Section>

      <Section letter="D" title="Total Loan Costs (Borrower-Paid)">
        <TotalRow label="Loan Costs Subtotals (A + B + C)" value={totals.totalLoanCosts} emphasis />
        <Grid cols={3}>
          <TotalRow label="Borrower-Paid Before Closing" value={totals.borrowerPaidBefore} />
          <TotalRow label="Seller-Paid" value={totals.sellerPaid} />
          <TotalRow label="Paid by Others" value={totals.othersPaid} />
        </Grid>
        <MoneyField
          label="D. Total Loan Costs (override)"
          value={lc.total_loan_costs}
          onChange={(v) => update((f) => { f.loanCosts.total_loan_costs = v; })}
          hint="Leave blank to use the calculated subtotal."
          className="sm:max-w-xs"
        />
      </Section>

      <Section letter="E" title="Taxes and Other Government Fees">
        <Grid cols={2}>
          <MoneyField label="Recording Fees — Deed" value={oc.recording_fees_deed} onChange={(v) => update((f) => { f.otherCosts.recording_fees_deed = v; })} />
          <MoneyField label="Recording Fees — Mortgage" value={oc.recording_fees_mortgage} onChange={(v) => update((f) => { f.otherCosts.recording_fees_mortgage = v; })} />
        </Grid>
        <LineItems
          title="Other Government Fees (transfer taxes, etc.)"
          rows={oc.other_government_fees}
          makeRow={emptyOtherCostLine}
          onChange={(rows) => update((f) => { f.otherCosts.other_government_fees = rows; })}
          columns={OTHER_COLUMNS}
        />
        <TotalRow label="E. Taxes and Other Government Fees" value={totals.sectionE} />
      </Section>

      <Section letter="F" title="Prepaids">
        <Grid cols={3}>
          <NumberField label="Homeowner's Insurance Premium (months)" step="1" value={p.homeowners_insurance_months} onChange={(v) => update((f) => { f.otherCosts.prepaids.homeowners_insurance_months = v; })} />
          <MoneyField label="Homeowner's Insurance Premium" value={p.homeowners_insurance_premium} onChange={(v) => update((f) => { f.otherCosts.prepaids.homeowners_insurance_premium = v; })} />
          <NumberField label="Mortgage Insurance Premium (months)" step="1" value={p.mortgage_insurance_premium_months} onChange={(v) => update((f) => { f.otherCosts.prepaids.mortgage_insurance_premium_months = v; })} />
          <MoneyField label="Mortgage Insurance Premium" value={p.mortgage_insurance_premium} onChange={(v) => update((f) => { f.otherCosts.prepaids.mortgage_insurance_premium = v; })} />
          <MoneyField label="Prepaid Interest (per day)" value={p.prepaid_interest_per_day} onChange={(v) => update((f) => { f.otherCosts.prepaids.prepaid_interest_per_day = v; })} />
          <TextField label="Prepaid Interest Dates" placeholder="from 04/15/26 to 05/01/26" value={p.prepaid_interest_dates} onChange={(v) => update((f) => { f.otherCosts.prepaids.prepaid_interest_dates = v; })} />
          <MoneyField label="Prepaid Interest Amount" value={p.prepaid_interest_amount} onChange={(v) => update((f) => { f.otherCosts.prepaids.prepaid_interest_amount = v; })} />
          <NumberField label="Property Taxes (months)" step="1" value={p.property_taxes_months} onChange={(v) => update((f) => { f.otherCosts.prepaids.property_taxes_months = v; })} />
          <MoneyField label="Property Taxes Amount" value={p.property_taxes_amount} onChange={(v) => update((f) => { f.otherCosts.prepaids.property_taxes_amount = v; })} />
        </Grid>
        <LineItems
          title="Other Prepaids"
          rows={p.other_prepaids}
          makeRow={emptyOtherCostLine}
          onChange={(rows) => update((f) => { f.otherCosts.prepaids.other_prepaids = rows; })}
          columns={OTHER_COLUMNS}
        />
        <TotalRow label="F. Prepaids" value={totals.sectionF} />
      </Section>

      <Section letter="G" title="Initial Escrow Payment at Closing">
        <LineItems
          rows={oc.initial_escrow}
          makeRow={() => ({ type: "", per_month: null, months: null, amount: null })}
          onChange={(rows) => update((f) => { f.otherCosts.initial_escrow = rows; })}
          columns={[
            { key: "type", header: "Type", type: "text" },
            { key: "per_month", header: "Per Month", type: "money" },
            { key: "months", header: "Months", type: "number", suffix: "mo" },
            { key: "amount", header: "Amount", type: "money" },
          ]}
        />
        <MoneyField label="Aggregate Adjustment" value={oc.aggregate_adjustment} onChange={(v) => update((f) => { f.otherCosts.aggregate_adjustment = v; })} className="sm:max-w-xs" />
        <TotalRow label="G. Initial Escrow Payment at Closing" value={totals.sectionG} />
      </Section>

      <Section letter="H" title="Other">
        <LineItems
          rows={oc.other_costs_detail}
          makeRow={emptyOtherCostLine}
          onChange={(rows) => update((f) => { f.otherCosts.other_costs_detail = rows; })}
          columns={OTHER_COLUMNS}
        />
        <TotalRow label="H. Other" value={totals.sectionH} />
      </Section>

      <Section letter="I" title="Total Other Costs (Borrower-Paid)">
        <TotalRow label="Other Costs Subtotals (E + F + G + H)" value={totals.totalOtherCosts} emphasis />
        <MoneyField
          label="I. Total Other Costs (override)"
          value={oc.total_other_costs}
          onChange={(v) => update((f) => { f.otherCosts.total_other_costs = v; })}
          className="sm:max-w-xs"
        />
      </Section>

      <Section letter="J" title="Total Closing Costs & Lender Credits">
        <Grid cols={2}>
          <MoneyField label="Lender Credits" value={oc.lender_credits_amount} onChange={(v) => update((f) => { f.otherCosts.lender_credits_amount = v; })} hint="Entered as a positive number; subtracted from totals." />
          <MoneyField label="J. Total Closing Costs (override)" value={oc.total_closing_costs} onChange={(v) => update((f) => { f.otherCosts.total_closing_costs = v; })} />
        </Grid>
        <TotalRow label="J. Total Closing Costs (D + I − Lender Credits)" value={totals.totalClosingCosts} emphasis />
      </Section>
    </div>
  );
}
