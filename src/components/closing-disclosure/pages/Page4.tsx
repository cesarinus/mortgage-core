import { Section, Grid, MoneyField, NumberField, AreaField, TextField, CheckField, SelectField } from "../fields";
import { PageProps } from "./shared";

export default function Page4({ form, update }: PageProps) {
  const d = form.loanDisclosures;
  const e = d.escrow;
  const ap = d.adjustable_payment;
  const air = d.adjustable_interest_rate;

  return (
    <div className="space-y-6">
      <Section title="Assumption">
        <CheckField
          label="Lender will allow, under certain conditions, this person to assume this loan on the original terms"
          checked={d.assumption_allowed}
          onChange={(v) => update((f) => { f.loanDisclosures.assumption_allowed = v; })}
        />
        <AreaField label="Assumption Conditions" rows={2} value={d.assumption_conditions} onChange={(v) => update((f) => { f.loanDisclosures.assumption_conditions = v; })} />
      </Section>

      <Section title="Demand Feature">
        <CheckField
          label="Your loan has a demand feature"
          checked={d.has_demand_feature}
          onChange={(v) => update((f) => { f.loanDisclosures.has_demand_feature = v; })}
        />
        {d.has_demand_feature && (
          <AreaField label="Demand Feature Details" rows={2} value={d.demand_feature_details} onChange={(v) => update((f) => { f.loanDisclosures.demand_feature_details = v; })} />
        )}
      </Section>

      <Section title="Late Payment">
        <Grid cols={2}>
          <NumberField label="Days Late Before Fee" step="1" suffix="days" value={d.late_payment_days} onChange={(v) => update((f) => { f.loanDisclosures.late_payment_days = v; })} />
          <MoneyField label="Late Payment Fee" value={d.late_payment_fee_amount} onChange={(v) => update((f) => { f.loanDisclosures.late_payment_fee_amount = v; })} />
        </Grid>
      </Section>

      <Section title="Negative Amortization">
        <SelectField
          label="Negative Amortization Type"
          value={d.negative_amortization_type}
          options={[
            { value: "scheduled", label: "Are scheduled to make monthly payments that do not pay all interest due" },
            { value: "may", label: "May have monthly payments that do not pay all of the interest due" },
            { value: "none", label: "Do not have a negative amortization feature" },
          ]}
          onChange={(v) => update((f) => { f.loanDisclosures.negative_amortization_type = v as typeof d.negative_amortization_type; })}
        />
        <AreaField label="Details" rows={2} value={d.negative_amortization_details} onChange={(v) => update((f) => { f.loanDisclosures.negative_amortization_details = v; })} />
      </Section>

      <Section title="Partial Payments">
        <SelectField
          label="Partial Payment Policy"
          value={d.partial_payments_policy}
          options={[
            { value: "accept", label: "May accept payments that are less than the full amount due" },
            { value: "hold", label: "May hold them in a separate account until you pay the rest" },
            { value: "does_not_accept", label: "Does not accept any partial payments" },
          ]}
          onChange={(v) => update((f) => { f.loanDisclosures.partial_payments_policy = v as typeof d.partial_payments_policy; })}
        />
      </Section>

      <Section title="Security Interest">
        <AreaField label="Security Interest Description" rows={2} value={d.security_interest_description} onChange={(v) => update((f) => { f.loanDisclosures.security_interest_description = v; })} />
      </Section>

      <Section title="Escrow Account">
        <CheckField
          label="Will have an escrow account"
          checked={e.will_have_escrow_account}
          onChange={(v) => update((f) => { f.loanDisclosures.escrow.will_have_escrow_account = v; })}
        />
        {e.will_have_escrow_account ? (
          <Grid cols={2}>
            <MoneyField label="Escrowed Property Costs over Year 1" value={e.escrowed_property_costs_year1} onChange={(v) => update((f) => { f.loanDisclosures.escrow.escrowed_property_costs_year1 = v; })} />
            <MoneyField label="Non-Escrowed Property Costs over Year 1" value={e.non_escrowed_property_costs_year1} onChange={(v) => update((f) => { f.loanDisclosures.escrow.non_escrowed_property_costs_year1 = v; })} />
            <MoneyField label="Initial Escrow Payment" value={e.initial_escrow_payment} onChange={(v) => update((f) => { f.loanDisclosures.escrow.initial_escrow_payment = v; })} />
            <MoneyField label="Monthly Escrow Payment" value={e.monthly_escrow_payment} onChange={(v) => update((f) => { f.loanDisclosures.escrow.monthly_escrow_payment = v; })} />
          </Grid>
        ) : (
          <Grid cols={3}>
            <SelectField
              label="No Escrow Reason"
              value={e.escrow_waiver_reason ?? ""}
              options={[
                { value: "declined", label: "You declined it" },
                { value: "not_offered", label: "Your lender does not offer one" },
              ]}
              onChange={(v) => update((f) => { f.loanDisclosures.escrow.escrow_waiver_reason = v as "declined" | "not_offered"; })}
            />
            <MoneyField label="Estimated Property Costs over Year 1" value={e.no_escrow_estimated_property_costs_year1} onChange={(v) => update((f) => { f.loanDisclosures.escrow.no_escrow_estimated_property_costs_year1 = v; })} />
            <MoneyField label="Escrow Waiver Fee" value={e.escrow_waiver_fee} onChange={(v) => update((f) => { f.loanDisclosures.escrow.escrow_waiver_fee = v; })} />
          </Grid>
        )}
        <AreaField label="Escrow Notes" rows={2} value={e.escrow_notes} onChange={(v) => update((f) => { f.loanDisclosures.escrow.escrow_notes = v; })} />
      </Section>

      <Section title="Adjustable Payment (AP) Table">
        <Grid cols={4}>
          <CheckField label="Interest Only Payments" checked={ap.interest_only_payments} onChange={(v) => update((f) => { f.loanDisclosures.adjustable_payment.interest_only_payments = v; })} />
          <CheckField label="Optional Payments" checked={ap.optional_payments} onChange={(v) => update((f) => { f.loanDisclosures.adjustable_payment.optional_payments = v; })} />
          <CheckField label="Step Payments" checked={ap.step_payments} onChange={(v) => update((f) => { f.loanDisclosures.adjustable_payment.step_payments = v; })} />
          <CheckField label="Seasonal Payments" checked={ap.seasonal_payments} onChange={(v) => update((f) => { f.loanDisclosures.adjustable_payment.seasonal_payments = v; })} />
        </Grid>
        <Grid cols={3}>
          <TextField label="First Change (Monthly P&I)" value={ap.monthly_principal_interest_changes.first_change_amount} onChange={(v) => update((f) => { f.loanDisclosures.adjustable_payment.monthly_principal_interest_changes.first_change_amount = v; })} />
          <TextField label="Subsequent Changes" value={ap.monthly_principal_interest_changes.subsequent_changes_amount} onChange={(v) => update((f) => { f.loanDisclosures.adjustable_payment.monthly_principal_interest_changes.subsequent_changes_amount = v; })} />
          <TextField label="Maximum Payment" value={ap.monthly_principal_interest_changes.maximum_payment} onChange={(v) => update((f) => { f.loanDisclosures.adjustable_payment.monthly_principal_interest_changes.maximum_payment = v; })} />
        </Grid>
      </Section>

      <Section title="Adjustable Interest Rate (AIR) Table">
        <Grid cols={3}>
          <TextField label="Index + Margin" value={air.index_margin} onChange={(v) => update((f) => { f.loanDisclosures.adjustable_interest_rate.index_margin = v; })} />
          <NumberField label="Initial Interest Rate" suffix="%" value={air.initial_interest_rate} onChange={(v) => update((f) => { f.loanDisclosures.adjustable_interest_rate.initial_interest_rate = v; })} />
          <NumberField label="Minimum Interest Rate" suffix="%" value={air.min_interest_rate} onChange={(v) => update((f) => { f.loanDisclosures.adjustable_interest_rate.min_interest_rate = v; })} />
          <NumberField label="Maximum Interest Rate" suffix="%" value={air.max_interest_rate} onChange={(v) => update((f) => { f.loanDisclosures.adjustable_interest_rate.max_interest_rate = v; })} />
          <TextField label="Change Frequency" value={air.change_frequency} onChange={(v) => update((f) => { f.loanDisclosures.adjustable_interest_rate.change_frequency = v; })} />
          <TextField label="First Change" value={air.first_change} onChange={(v) => update((f) => { f.loanDisclosures.adjustable_interest_rate.first_change = v; })} />
          <TextField label="Subsequent Changes" value={air.subsequent_changes} onChange={(v) => update((f) => { f.loanDisclosures.adjustable_interest_rate.subsequent_changes = v; })} />
          <TextField label="Limit — First Change" value={air.limits_on_interest_rate_changes.first_change} onChange={(v) => update((f) => { f.loanDisclosures.adjustable_interest_rate.limits_on_interest_rate_changes.first_change = v; })} />
          <TextField label="Limit — Subsequent Changes" value={air.limits_on_interest_rate_changes.subsequent_changes} onChange={(v) => update((f) => { f.loanDisclosures.adjustable_interest_rate.limits_on_interest_rate_changes.subsequent_changes = v; })} />
        </Grid>
      </Section>
    </div>
  );
}
