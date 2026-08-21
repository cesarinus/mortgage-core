import { Section, Grid, MoneyField, SelectField, TotalRow, LineItems, CheckField } from "../fields";
import { PageProps } from "./shared";
import type { Direction, SellerDirection, AmountLine } from "@/lib/closing-disclosure/types";
import type { Column } from "../fields";

const AMOUNT_COLUMNS: Column<AmountLine>[] = [
  { key: "item", header: "Item", type: "text" as const },
  { key: "amount", header: "Amount", type: "money" as const },
];

export default function Page3({ form, update, totals }: PageProps) {
  const c = form.cashToClose;
  const s = c.summaries;

  return (
    <div className="space-y-6">
      <Section title="Borrower's Transaction">
        <LineItems
          title="K. Due from Borrower at Closing"
          rows={c.due_from_borrower}
          makeRow={(): AmountLine => ({ item: "", amount: null })}
          onChange={(rows) => update((f) => { f.cashToClose.due_from_borrower = rows; })}
          columns={AMOUNT_COLUMNS}
        />
        <TotalRow label="Total Due from Borrower at Closing (K)" value={totals.totalDueFromBorrower} />

        <LineItems
          title="L. Paid Already by or on Behalf of Borrower at Closing"
          rows={c.paid_already_by_borrower}
          makeRow={(): AmountLine => ({ item: "", amount: null })}
          onChange={(rows) => update((f) => { f.cashToClose.paid_already_by_borrower = rows; })}
          columns={AMOUNT_COLUMNS}
        />
        <TotalRow label="Total Paid Already by or on Behalf of Borrower (L)" value={totals.totalPaidAlreadyByBorrower} />

        <Grid cols={2}>
          <TotalRow label="Cash to Close (K − L)" value={totals.cashToCloseBorrower} emphasis />
          <SelectField
            label="Direction"
            value={c.direction_to_borrower}
            options={[
              { value: "From Borrower", label: "From Borrower" },
              { value: "To Borrower", label: "To Borrower" },
            ]}
            onChange={(v) => update((f) => { f.cashToClose.direction_to_borrower = v as Direction; })}
          />
        </Grid>
      </Section>

      <Section title="Seller's Transaction">
        <LineItems
          title="M. Due to Seller at Closing"
          rows={c.due_to_seller}
          makeRow={(): AmountLine => ({ item: "", amount: null })}
          onChange={(rows) => update((f) => { f.cashToClose.due_to_seller = rows; })}
          columns={AMOUNT_COLUMNS}
        />
        <TotalRow label="Total Due to Seller at Closing (M)" value={totals.totalDueToSeller} />

        <LineItems
          title="N. Due from Seller at Closing"
          rows={c.due_from_seller}
          makeRow={(): AmountLine => ({ item: "", amount: null })}
          onChange={(rows) => update((f) => { f.cashToClose.due_from_seller = rows; })}
          columns={AMOUNT_COLUMNS}
        />
        <TotalRow label="Total Due from Seller at Closing (N)" value={totals.totalDueFromSeller} />

        <Grid cols={2}>
          <TotalRow label="Cash to Close (M − N)" value={totals.cashToCloseSeller} emphasis />
          <SelectField
            label="Direction"
            value={c.direction_to_seller}
            options={[
              { value: "From Seller", label: "From Seller" },
              { value: "To Seller", label: "To Seller" },
            ]}
            onChange={(v) => update((f) => { f.cashToClose.direction_to_seller = v as SellerDirection; })}
          />
        </Grid>
      </Section>

      <Section title="Summaries of Transactions">
        <Grid cols={3}>
          <MoneyField label="Total Closing Costs (J)" value={s.total_closing_costs} onChange={(v) => update((f) => { f.cashToClose.summaries.total_closing_costs = v; })} />
          <MoneyField label="Closing Costs Paid Before Closing" value={s.closing_costs_paid_before} onChange={(v) => update((f) => { f.cashToClose.summaries.closing_costs_paid_before = v; })} />
          <MoneyField label="Closing Costs Financed" value={s.closing_costs_financed} onChange={(v) => update((f) => { f.cashToClose.summaries.closing_costs_financed = v; })} />
          <MoneyField label="Down Payment / Funds from Borrower" value={s.down_payment} onChange={(v) => update((f) => { f.cashToClose.summaries.down_payment = v; })} />
          <MoneyField label="Deposit" value={s.deposit} onChange={(v) => update((f) => { f.cashToClose.summaries.deposit = v; })} />
          <MoneyField label="Funds for Borrower" value={s.funds_for_borrower} onChange={(v) => update((f) => { f.cashToClose.summaries.funds_for_borrower = v; })} />
          <MoneyField label="Seller Credits" value={s.seller_credits} onChange={(v) => update((f) => { f.cashToClose.summaries.seller_credits = v; })} />
          <MoneyField label="Adjustments and Other Credits" value={s.adjustments_and_other_credits} onChange={(v) => update((f) => { f.cashToClose.summaries.adjustments_and_other_credits = v; })} />
          <MoneyField label="Cash to Close (override)" value={s.cash_to_close} onChange={(v) => update((f) => { f.cashToClose.summaries.cash_to_close = v; })} />
        </Grid>
        <TotalRow label="Calculated Cash to Close" value={totals.summaryCashToClose} emphasis />
      </Section>

      <Section title="Loan Estimate Comparison">
        <div className="space-y-3">
          {c.loan_estimate_comparison.map((row, i) => (
            <div key={i} className="grid grid-cols-1 gap-3 rounded-lg border border-border/60 p-3 sm:grid-cols-4 sm:items-end">
              <p className="text-sm font-medium">{row.item}</p>
              <MoneyField
                label="Loan Estimate"
                value={row.loan_estimate}
                onChange={(v) => update((f) => { f.cashToClose.loan_estimate_comparison[i].loan_estimate = v; })}
              />
              <MoneyField
                label="Final"
                value={row.final}
                onChange={(v) => update((f) => { f.cashToClose.loan_estimate_comparison[i].final = v; })}
              />
              <CheckField
                label="Did this change?"
                checked={row.did_change}
                onChange={(v) => update((f) => { f.cashToClose.loan_estimate_comparison[i].did_change = v; })}
              />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
