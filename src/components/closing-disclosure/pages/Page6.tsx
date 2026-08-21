import { Section, Grid, MoneyField, NumberField, AreaField } from "../fields";
import { PageProps } from "./shared";

export default function Page6({ form, update }: PageProps) {
  const lc = form.loanCalculations;
  const cd = form.closingDetails;

  return (
    <div className="space-y-6">
      <Section title="Loan Calculations">
        <Grid cols={2}>
          <MoneyField
            label="Total of Payments"
            value={lc.total_of_payments}
            onChange={(v) => update((f) => { f.loanCalculations.total_of_payments = v; })}
            hint="Total you will have paid after all payments of principal, interest, mortgage insurance and loan costs."
          />
          <MoneyField
            label="Finance Charge"
            value={lc.finance_charge}
            onChange={(v) => update((f) => { f.loanCalculations.finance_charge = v; })}
            hint="The dollar amount the loan will cost you."
          />
          <MoneyField
            label="Amount Financed"
            value={lc.amount_financed}
            onChange={(v) => update((f) => { f.loanCalculations.amount_financed = v; })}
            hint="The loan amount available after paying your upfront finance charge."
          />
          <NumberField
            label="Annual Percentage Rate (APR)"
            suffix="%"
            value={lc.apr}
            onChange={(v) => update((f) => { f.loanCalculations.apr = v; })}
            hint="Your costs over the loan term expressed as a rate."
          />
          <NumberField
            label="Total Interest Percentage (TIP)"
            suffix="%"
            value={lc.tip}
            onChange={(v) => update((f) => { f.loanCalculations.tip = v; })}
            hint="Total amount of interest that you will pay over the loan term as a percentage of your loan amount."
          />
        </Grid>
      </Section>

      <Section title="Additional Closing Details">
        <AreaField
          label="Final Settlement Notes"
          rows={5}
          value={cd.settlement_notes}
          onChange={(v) => update((f) => { f.closingDetails.settlement_notes = v; })}
        />
        <AreaField
          label="Document IDs"
          rows={3}
          value={cd.document_ids}
          onChange={(v) => update((f) => { f.closingDetails.document_ids = v; })}
          hint="Reference IDs for the note, security instrument, and related closing documents."
        />
      </Section>
    </div>
  );
}
