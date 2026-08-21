import {
  Section,
  Grid,
  TextField,
  AreaField,
  DateField,
  MoneyField,
  NumberField,
  SelectField,
  CheckField,
  TotalRow,
  LineItems,
} from "../fields";
import { PageProps, LOAN_PURPOSES, LOAN_PRODUCTS, LOAN_TYPES, toOptions } from "./shared";

export default function Page1({ form, update, totals }: PageProps) {
  const t = form.transactionInfo;
  const c = form.closingInfo;
  const p = form.property;
  const li = form.loanInformation;
  const lt = form.loanTerms;
  const cc = form.closingCostsSummary;
  const pp = form.projectedPayments;

  return (
    <div className="space-y-6">
      <Section title="Transaction Information">
        <Grid cols={2}>
          <TextField label="Borrower Name" required value={t.borrower_name} onChange={(v) => update((f) => { f.transactionInfo.borrower_name = v; })} />
          <AreaField label="Borrower Address" rows={2} value={t.borrower_address} onChange={(v) => update((f) => { f.transactionInfo.borrower_address = v; })} />
          <TextField label="Seller Name" value={t.seller_name} onChange={(v) => update((f) => { f.transactionInfo.seller_name = v; })} />
          <AreaField label="Seller Address" rows={2} value={t.seller_address} onChange={(v) => update((f) => { f.transactionInfo.seller_address = v; })} />
          <TextField label="Lender Name" required value={t.lender_name} onChange={(v) => update((f) => { f.transactionInfo.lender_name = v; })} />
          <AreaField label="Lender Address" rows={2} value={t.lender_address} onChange={(v) => update((f) => { f.transactionInfo.lender_address = v; })} />
          <TextField label="Loan ID #" required value={t.loan_id} onChange={(v) => update((f) => { f.transactionInfo.loan_id = v; })} />
          <TextField label="MIC #" value={t.mic_number} onChange={(v) => update((f) => { f.transactionInfo.mic_number = v; })} />
        </Grid>
      </Section>

      <Section title="Closing Information">
        <Grid cols={3}>
          <DateField label="Date Issued" required value={c.date_issued} onChange={(v) => update((f) => { f.closingInfo.date_issued = v; })} />
          <DateField label="Closing Date" required value={c.closing_date} onChange={(v) => update((f) => { f.closingInfo.closing_date = v; })} />
          <DateField label="Disbursement Date" value={c.disbursement_date} onChange={(v) => update((f) => { f.closingInfo.disbursement_date = v; })} />
          <TextField label="Settlement Agent" value={c.settlement_agent} onChange={(v) => update((f) => { f.closingInfo.settlement_agent = v; })} />
          <TextField label="File #" value={c.file_number} onChange={(v) => update((f) => { f.closingInfo.file_number = v; })} />
        </Grid>
      </Section>

      <Section title="Property">
        <AreaField label="Property Address" rows={2} value={p.property_address} onChange={(v) => update((f) => { f.property.property_address = v; })} />
        <Grid cols={3}>
          <MoneyField label="Sale Price" value={p.sale_price} onChange={(v) => update((f) => { f.property.sale_price = v; })} hint="Purchase transactions" />
          <MoneyField label="Appraised Property Value" value={p.appraised_property_value} onChange={(v) => update((f) => { f.property.appraised_property_value = v; })} />
          <MoneyField label="Estimated Property Value" value={p.estimated_property_value} onChange={(v) => update((f) => { f.property.estimated_property_value = v; })} hint="Refinance transactions" />
        </Grid>
      </Section>

      <Section title="Loan Information">
        <Grid cols={4}>
          <TextField label="Loan Term" value={li.loan_term} onChange={(v) => update((f) => { f.loanInformation.loan_term = v; })} />
          <SelectField label="Purpose" value={li.purpose} options={toOptions(LOAN_PURPOSES)} onChange={(v) => update((f) => { f.loanInformation.purpose = v; })} />
          <SelectField label="Product" value={li.product} options={toOptions(LOAN_PRODUCTS)} onChange={(v) => update((f) => { f.loanInformation.product = v; })} />
          <SelectField label="Loan Type" value={li.loan_type} options={toOptions(LOAN_TYPES)} onChange={(v) => update((f) => { f.loanInformation.loan_type = v; })} />
        </Grid>
      </Section>

      <Section title="Loan Terms">
        <Grid cols={4}>
          <MoneyField label="Loan Amount" required value={lt.loan_amount} onChange={(v) => update((f) => { f.loanTerms.loan_amount = v; })} />
          <NumberField label="Interest Rate" required suffix="%" value={lt.interest_rate} onChange={(v) => update((f) => { f.loanTerms.interest_rate = v; })} />
          <MoneyField label="Monthly Principal & Interest" value={lt.monthly_principal_interest} onChange={(v) => update((f) => { f.loanTerms.monthly_principal_interest = v; })} />
          <MoneyField label="Estimated Total Monthly Payment" value={lt.estimated_total_monthly_payment} onChange={(v) => update((f) => { f.loanTerms.estimated_total_monthly_payment = v; })} />
        </Grid>
        <Grid cols={3}>
          <CheckField label="Loan amount can increase after closing" checked={lt.loan_amount_can_increase} onChange={(v) => update((f) => { f.loanTerms.loan_amount_can_increase = v; })} />
          <CheckField label="Interest rate can increase after closing" checked={lt.interest_rate_can_increase} onChange={(v) => update((f) => { f.loanTerms.interest_rate_can_increase = v; })} />
          <CheckField label="Monthly P&I can increase after closing" checked={lt.payment_can_increase} onChange={(v) => update((f) => { f.loanTerms.payment_can_increase = v; })} />
        </Grid>
      </Section>

      <Section title="Features">
        <Grid cols={2}>
          <div className="space-y-3">
            <CheckField label="Has Prepayment Penalty" checked={lt.has_prepayment_penalty} onChange={(v) => update((f) => { f.loanTerms.has_prepayment_penalty = v; })} />
            {lt.has_prepayment_penalty && (
              <AreaField label="Prepayment Penalty Details" rows={2} value={lt.prepayment_penalty_details} onChange={(v) => update((f) => { f.loanTerms.prepayment_penalty_details = v; })} />
            )}
          </div>
          <div className="space-y-3">
            <CheckField label="Has Balloon Payment" checked={lt.has_balloon_payment} onChange={(v) => update((f) => { f.loanTerms.has_balloon_payment = v; })} />
            {lt.has_balloon_payment && (
              <AreaField label="Balloon Payment Details" rows={2} value={lt.balloon_payment_details} onChange={(v) => update((f) => { f.loanTerms.balloon_payment_details = v; })} />
            )}
          </div>
        </Grid>
      </Section>

      <Section title="Projected Payments">
        <Grid cols={4}>
          <MoneyField label="Principal & Interest" value={pp.principal_interest} onChange={(v) => update((f) => { f.projectedPayments.principal_interest = v; })} />
          <MoneyField label="Mortgage Insurance" value={pp.mortgage_insurance} onChange={(v) => update((f) => { f.projectedPayments.mortgage_insurance = v; })} />
          <MoneyField label="Estimated Escrow" value={pp.estimated_escrow} onChange={(v) => update((f) => { f.projectedPayments.estimated_escrow = v; })} />
          <MoneyField label="Est. Taxes, Insurance & Assessments" value={pp.estimated_taxes_insurance_assessments} onChange={(v) => update((f) => { f.projectedPayments.estimated_taxes_insurance_assessments = v; })} hint="Monthly total" />
        </Grid>
        <TotalRow label="Estimated Total Monthly Payment (calculated)" value={totals.projectedTotal} emphasis />

        <LineItems
          title="Escrowed Property Costs over Year 1"
          rows={pp.escrowed_property_costs}
          makeRow={() => ({ type: "", amount: null, in_escrow: true, can_increase_after_closing: false })}
          onChange={(rows) => update((f) => { f.projectedPayments.escrowed_property_costs = rows; })}
          columns={[
            { key: "type", header: "Type", type: "text" },
            { key: "amount", header: "Amount", type: "money" },
            { key: "in_escrow", header: "In escrow", type: "check" },
            { key: "can_increase_after_closing", header: "Can increase", type: "check" },
          ]}
        />
        <TotalRow label="Escrowed Property Costs over Year 1" value={totals.escrowedYear1} />

        <LineItems
          title="Non-Escrowed Property Costs over Year 1"
          rows={pp.non_escrowed_property_costs}
          makeRow={() => ({ type: "", amount: null })}
          onChange={(rows) => update((f) => { f.projectedPayments.non_escrowed_property_costs = rows; })}
          columns={[
            { key: "type", header: "Type", type: "text" },
            { key: "amount", header: "Amount", type: "money" },
          ]}
        />
        <TotalRow label="Non-Escrowed Property Costs over Year 1" value={totals.nonEscrowedYear1} />
      </Section>

      <Section title="Costs at Closing">
        <Grid cols={4}>
          <MoneyField label="Total Loan Costs (D)" value={cc.total_loan_costs} onChange={(v) => update((f) => { f.closingCostsSummary.total_loan_costs = v; })} hint={`Page 2 calc: ${totals.totalLoanCosts.toFixed(2)}`} />
          <MoneyField label="Other Costs (I)" value={cc.other_costs} onChange={(v) => update((f) => { f.closingCostsSummary.other_costs = v; })} hint={`Page 2 calc: ${totals.totalOtherCosts.toFixed(2)}`} />
          <MoneyField label="Lender Credits" value={cc.lender_credits} onChange={(v) => update((f) => { f.closingCostsSummary.lender_credits = v; })} />
          <MoneyField label="Total Closing Costs (J)" value={cc.total_closing_costs} onChange={(v) => update((f) => { f.closingCostsSummary.total_closing_costs = v; })} hint={`Page 2 calc: ${totals.totalClosingCosts.toFixed(2)}`} />
        </Grid>
        <MoneyField label="Cash to Close" value={cc.cash_to_close_amount} onChange={(v) => update((f) => { f.closingCostsSummary.cash_to_close_amount = v; })} className="sm:max-w-xs" />
      </Section>
    </div>
  );
}
