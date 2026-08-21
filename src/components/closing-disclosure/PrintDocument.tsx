import { forwardRef } from "react";
import "./print.css";
import type { ClosingDisclosureForm } from "@/lib/closing-disclosure/types";
import { CONTACT_ROLE_LABELS } from "@/lib/closing-disclosure/types";
import { computeTotals, money, pct, dateUS } from "@/lib/closing-disclosure/calc";

const CK = ({ on }: { on?: boolean }) => <span className="cd-ck">{on ? "X" : ""}</span>;

const KV = ({ k, v }: { k: string; v: string }) => (
  <div className="cd-kv">
    <span>{k}</span>
    <span>{v || "\u00A0"}</span>
  </div>
);

const Footer = ({ page, loanId }: { page: number; loanId: string }) => (
  <div className="cd-footer">
    <span>Closing Disclosure</span>
    <span>Page {page} of 6</span>
    <span>Loan ID # {loanId || "—"}</span>
  </div>
);

interface Props {
  form: ClosingDisclosureForm;
}

export const PrintDocument = forwardRef<HTMLDivElement, Props>(function PrintDocument({ form }, ref) {
  const t = computeTotals(form);
  const ti = form.transactionInfo;
  const ci = form.closingInfo;
  const pr = form.property;
  const li = form.loanInformation;
  const lt = form.loanTerms;
  const pp = form.projectedPayments;
  const lc = form.loanCosts;
  const oc = form.otherCosts;
  const p = oc.prepaids;
  const ctc = form.cashToClose;
  const s = ctc.summaries;
  const d = form.loanDisclosures;
  const loanId = ti.loan_id;

  const totalLoanCosts = lc.total_loan_costs ?? t.totalLoanCosts;
  const totalOtherCosts = oc.total_other_costs ?? t.totalOtherCosts;
  const totalClosingCosts = oc.total_closing_costs ?? t.totalClosingCosts;

  return (
    <div className="cd-doc" ref={ref} id="cd-print-root">
      {/* ================= PAGE 1 ================= */}
      <section className="cd-page">
        <div className="cd-head">
          <div>
            <h1 className="cd-title">Closing Disclosure</h1>
            <p className="cd-intro">
              This form is a statement of final loan terms and closing costs. Compare this document with your Loan
              Estimate.
            </p>
          </div>
        </div>

        <div className="cd-cols3">
          <div>
            <div className="cd-subbar">Closing Information</div>
            <KV k="Date Issued" v={dateUS(ci.date_issued)} />
            <KV k="Closing Date" v={dateUS(ci.closing_date)} />
            <KV k="Disbursement Date" v={dateUS(ci.disbursement_date)} />
            <KV k="Settlement Agent" v={ci.settlement_agent} />
            <KV k="File #" v={ci.file_number} />
            <KV k="Property" v={pr.property_address} />
            {li.purpose === "Refinance" ? (
              <KV k="Estimated Prop. Value" v={money(pr.estimated_property_value)} />
            ) : (
              <KV k="Sale Price" v={money(pr.sale_price)} />
            )}
            <KV k="Appraised Prop. Value" v={money(pr.appraised_property_value)} />
          </div>
          <div>
            <div className="cd-subbar">Transaction Information</div>
            <KV k="Borrower" v={ti.borrower_name} />
            <KV k="" v={ti.borrower_address} />
            <KV k="Seller" v={ti.seller_name} />
            <KV k="" v={ti.seller_address} />
            <KV k="Lender" v={ti.lender_name} />
            <KV k="" v={ti.lender_address} />
            <KV k="MIC #" v={ti.mic_number} />
          </div>
          <div>
            <div className="cd-subbar">Loan Information</div>
            <KV k="Loan Term" v={li.loan_term} />
            <KV k="Purpose" v={li.purpose} />
            <KV k="Product" v={li.product} />
            <KV k="Loan Type" v={li.loan_type} />
            <KV k="Loan ID #" v={ti.loan_id} />
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <div className="cd-bar">Loan Terms</div>
          <table className="cd-table">
            <tbody>
              <tr>
                <td style={{ width: "38%" }}>
                  <b>Loan Amount</b>
                </td>
                <td className="num" style={{ width: "17%" }}>
                  <b>{money(lt.loan_amount)}</b>
                </td>
                <td>
                  <CK on={lt.loan_amount_can_increase} /> Can this amount increase after closing?
                </td>
              </tr>
              <tr>
                <td>
                  <b>Interest Rate</b>
                </td>
                <td className="num">
                  <b>{pct(lt.interest_rate)}</b>
                </td>
                <td>
                  <CK on={lt.interest_rate_can_increase} /> Can this amount increase after closing?
                </td>
              </tr>
              <tr>
                <td>
                  <b>Monthly Principal &amp; Interest</b>
                  <div className="cd-note">See Projected Payments below for your Estimated Total Monthly Payment</div>
                </td>
                <td className="num">
                  <b>{money(lt.monthly_principal_interest)}</b>
                </td>
                <td>
                  <CK on={lt.payment_can_increase} /> Can this amount increase after closing?
                </td>
              </tr>
              <tr>
                <td>
                  <b>Prepayment Penalty</b>
                </td>
                <td className="num">
                  <CK on={lt.has_prepayment_penalty} />
                  {lt.has_prepayment_penalty ? "YES" : "NO"}
                </td>
                <td>{lt.prepayment_penalty_details}</td>
              </tr>
              <tr>
                <td>
                  <b>Balloon Payment</b>
                </td>
                <td className="num">
                  <CK on={lt.has_balloon_payment} />
                  {lt.has_balloon_payment ? "YES" : "NO"}
                </td>
                <td>{lt.balloon_payment_details}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 8 }}>
          <div className="cd-bar">Projected Payments</div>
          <table className="cd-table">
            <tbody>
              <tr>
                <td style={{ width: "38%" }}>Principal &amp; Interest</td>
                <td className="num">{money(pp.principal_interest)}</td>
              </tr>
              <tr>
                <td>Mortgage Insurance</td>
                <td className="num">{money(pp.mortgage_insurance)}</td>
              </tr>
              <tr>
                <td>Estimated Escrow</td>
                <td className="num">{money(pp.estimated_escrow)}</td>
              </tr>
              <tr className="total">
                <td>Estimated Total Monthly Payment</td>
                <td className="num">{money(lt.estimated_total_monthly_payment ?? t.projectedTotal)}</td>
              </tr>
              <tr>
                <td>
                  Estimated Taxes, Insurance &amp; Assessments
                  <div className="cd-note">Amount can increase over time. See page 4 for details.</div>
                </td>
                <td className="num">{money(pp.estimated_taxes_insurance_assessments)}</td>
              </tr>
            </tbody>
          </table>
          <table className="cd-table" style={{ marginTop: 4 }}>
            <thead>
              <tr>
                <th>Property Cost</th>
                <th className="num">Amount</th>
                <th style={{ width: "1.1in" }}>In Escrow?</th>
                <th style={{ width: "1.3in" }}>Can Increase?</th>
              </tr>
            </thead>
            <tbody>
              {pp.escrowed_property_costs.map((e, i) => (
                <tr key={`e${i}`}>
                  <td>{e.type}</td>
                  <td className="num">{money(e.amount)}</td>
                  <td>
                    <CK on={e.in_escrow} /> {e.in_escrow ? "YES" : "NO"}
                  </td>
                  <td>
                    <CK on={e.can_increase_after_closing} /> {e.can_increase_after_closing ? "YES" : "NO"}
                  </td>
                </tr>
              ))}
              {pp.non_escrowed_property_costs.map((e, i) => (
                <tr key={`n${i}`}>
                  <td>{e.type}</td>
                  <td className="num">{money(e.amount)}</td>
                  <td>
                    <CK /> NO
                  </td>
                  <td>—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 8 }}>
          <div className="cd-bar">Costs at Closing</div>
          <table className="cd-table">
            <tbody>
              <tr>
                <td style={{ width: "38%" }}>
                  <b>Closing Costs</b>
                </td>
                <td className="num">{money(form.closingCostsSummary.total_closing_costs ?? totalClosingCosts)}</td>
                <td className="cd-note">
                  Includes {money(form.closingCostsSummary.total_loan_costs ?? totalLoanCosts)} in Loan Costs +{" "}
                  {money(form.closingCostsSummary.other_costs ?? totalOtherCosts)} in Other Costs −{" "}
                  {money(form.closingCostsSummary.lender_credits ?? t.lenderCredits)} in Lender Credits. See page 2 for
                  details.
                </td>
              </tr>
              <tr>
                <td>
                  <b>Cash to Close</b>
                </td>
                <td className="num">{money(form.closingCostsSummary.cash_to_close_amount)}</td>
                <td className="cd-note">Includes Closing Costs. See Calculating Cash to Close on page 3 for details.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <Footer page={1} loanId={loanId} />
      </section>

      {/* ================= PAGE 2 ================= */}
      <section className="cd-page">
        <div className="cd-bar">Closing Cost Details</div>
        <div className="cd-cols2" style={{ marginTop: 6 }}>
          <div>
            <div className="cd-subbar">Loan Costs</div>
            <table className="cd-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="num">Borrower At Closing</th>
                  <th className="num">Before Closing</th>
                  <th className="num">Seller</th>
                  <th className="num">Others</th>
                </tr>
              </thead>
              <tbody>
                <tr className="section">
                  <td colSpan={4}>A. Origination Charges</td>
                  <td className="num">{money(t.sectionA)}</td>
                </tr>
                {lc.origination_charges.map((o, i) => (
                  <tr key={`a${i}`}>
                    <td>
                      {o.percent_of_loan ? `${o.percent_of_loan}% of Loan Amount (Points) ` : ""}
                      {o.item}
                    </td>
                    <td className="num">{money(o.amount)}</td>
                    <td className="num" />
                    <td className="num" />
                    <td className="num" />
                  </tr>
                ))}
                <tr className="section">
                  <td colSpan={4}>B. Services Borrower Did Not Shop For</td>
                  <td className="num">{money(t.sectionB)}</td>
                </tr>
                {lc.services_not_shopped.map((o, i) => (
                  <tr key={`b${i}`}>
                    <td>{o.item}</td>
                    <td className="num">{money(o.borrower_paid_at_closing)}</td>
                    <td className="num">{money(o.borrower_paid_before)}</td>
                    <td className="num">{money(o.seller_paid)}</td>
                    <td className="num">{money(o.others_paid)}</td>
                  </tr>
                ))}
                <tr className="section">
                  <td colSpan={4}>C. Services Borrower Did Shop For</td>
                  <td className="num">{money(t.sectionC)}</td>
                </tr>
                {lc.services_shopped.map((o, i) => (
                  <tr key={`c${i}`}>
                    <td>{o.item}</td>
                    <td className="num">{money(o.borrower_paid_at_closing)}</td>
                    <td className="num">{money(o.borrower_paid_before)}</td>
                    <td className="num">{money(o.seller_paid)}</td>
                    <td className="num">{money(o.others_paid)}</td>
                  </tr>
                ))}
                <tr className="total">
                  <td>D. TOTAL LOAN COSTS (Borrower-Paid)</td>
                  <td className="num">{money(totalLoanCosts)}</td>
                  <td className="num">{money(t.borrowerPaidBefore)}</td>
                  <td className="num">{money(t.sellerPaid)}</td>
                  <td className="num">{money(t.othersPaid)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <div className="cd-subbar">Other Costs</div>
            <table className="cd-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="num">Borrower At Closing</th>
                  <th className="num">Seller</th>
                  <th className="num">Others</th>
                </tr>
              </thead>
              <tbody>
                <tr className="section">
                  <td colSpan={3}>E. Taxes and Other Government Fees</td>
                  <td className="num">{money(t.sectionE)}</td>
                </tr>
                <tr>
                  <td>Recording Fees — Deed</td>
                  <td className="num">{money(oc.recording_fees_deed)}</td>
                  <td className="num" />
                  <td className="num" />
                </tr>
                <tr>
                  <td>Recording Fees — Mortgage</td>
                  <td className="num">{money(oc.recording_fees_mortgage)}</td>
                  <td className="num" />
                  <td className="num" />
                </tr>
                {oc.other_government_fees.map((o, i) => (
                  <tr key={`e${i}`}>
                    <td>{o.item}</td>
                    <td className="num">{money(o.borrower_paid_at_closing)}</td>
                    <td className="num">{money(o.seller_paid)}</td>
                    <td className="num">{money(o.others_paid)}</td>
                  </tr>
                ))}
                <tr className="section">
                  <td colSpan={3}>F. Prepaids</td>
                  <td className="num">{money(t.sectionF)}</td>
                </tr>
                <tr>
                  <td>Homeowner's Insurance Premium ({p.homeowners_insurance_months ?? 0} mo.)</td>
                  <td className="num">{money(p.homeowners_insurance_premium)}</td>
                  <td className="num" />
                  <td className="num" />
                </tr>
                <tr>
                  <td>Mortgage Insurance Premium ({p.mortgage_insurance_premium_months ?? 0} mo.)</td>
                  <td className="num">{money(p.mortgage_insurance_premium)}</td>
                  <td className="num" />
                  <td className="num" />
                </tr>
                <tr>
                  <td>
                    Prepaid Interest ({money(p.prepaid_interest_per_day)} per day {p.prepaid_interest_dates})
                  </td>
                  <td className="num">{money(p.prepaid_interest_amount)}</td>
                  <td className="num" />
                  <td className="num" />
                </tr>
                <tr>
                  <td>Property Taxes ({p.property_taxes_months ?? 0} mo.)</td>
                  <td className="num">{money(p.property_taxes_amount)}</td>
                  <td className="num" />
                  <td className="num" />
                </tr>
                {p.other_prepaids.map((o, i) => (
                  <tr key={`f${i}`}>
                    <td>{o.item}</td>
                    <td className="num">{money(o.borrower_paid_at_closing)}</td>
                    <td className="num">{money(o.seller_paid)}</td>
                    <td className="num">{money(o.others_paid)}</td>
                  </tr>
                ))}
                <tr className="section">
                  <td colSpan={3}>G. Initial Escrow Payment at Closing</td>
                  <td className="num">{money(t.sectionG)}</td>
                </tr>
                {oc.initial_escrow.map((o, i) => (
                  <tr key={`g${i}`}>
                    <td>
                      {o.type} {money(o.per_month)} per month × {o.months ?? 0} mo.
                    </td>
                    <td className="num">{money(o.amount)}</td>
                    <td className="num" />
                    <td className="num" />
                  </tr>
                ))}
                <tr>
                  <td>Aggregate Adjustment</td>
                  <td className="num">{money(oc.aggregate_adjustment)}</td>
                  <td className="num" />
                  <td className="num" />
                </tr>
                <tr className="section">
                  <td colSpan={3}>H. Other</td>
                  <td className="num">{money(t.sectionH)}</td>
                </tr>
                {oc.other_costs_detail.map((o, i) => (
                  <tr key={`h${i}`}>
                    <td>{o.item}</td>
                    <td className="num">{money(o.borrower_paid_at_closing)}</td>
                    <td className="num">{money(o.seller_paid)}</td>
                    <td className="num">{money(o.others_paid)}</td>
                  </tr>
                ))}
                <tr className="total">
                  <td>I. TOTAL OTHER COSTS (Borrower-Paid)</td>
                  <td className="num">{money(totalOtherCosts)}</td>
                  <td className="num" />
                  <td className="num" />
                </tr>
                <tr className="total">
                  <td>J. TOTAL CLOSING COSTS (Borrower-Paid)</td>
                  <td className="num">{money(totalClosingCosts)}</td>
                  <td className="num" />
                  <td className="num" />
                </tr>
                <tr>
                  <td>Lender Credits</td>
                  <td className="num">({money(t.lenderCredits)})</td>
                  <td className="num" />
                  <td className="num" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <Footer page={2} loanId={loanId} />
      </section>

      {/* ================= PAGE 3 ================= */}
      <section className="cd-page">
        <div className="cd-bar">Calculating Cash to Close</div>
        <table className="cd-table" style={{ marginTop: 4 }}>
          <thead>
            <tr>
              <th>Use this table to see what has changed from your Loan Estimate.</th>
              <th className="num">Loan Estimate</th>
              <th className="num">Final</th>
              <th style={{ width: "2.2in" }}>Did this change?</th>
            </tr>
          </thead>
          <tbody>
            {ctc.loan_estimate_comparison.map((r, i) => (
              <tr key={i}>
                <td>{r.item}</td>
                <td className="num">{money(r.loan_estimate)}</td>
                <td className="num">{money(r.final)}</td>
                <td>
                  <CK on={r.did_change} />
                  {r.did_change ? "YES" : "NO"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="cd-bar" style={{ marginTop: 8 }}>
          Summaries of Transactions
        </div>
        <div className="cd-cols2" style={{ marginTop: 4 }}>
          <table className="cd-table">
            <tbody>
              <tr className="section">
                <td colSpan={2}>BORROWER'S TRANSACTION</td>
              </tr>
              <tr className="section">
                <td>K. Due from Borrower at Closing</td>
                <td className="num">{money(ctc.total_due_from_borrower ?? t.totalDueFromBorrower)}</td>
              </tr>
              {ctc.due_from_borrower.map((l, i) => (
                <tr key={`k${i}`}>
                  <td>{l.item}</td>
                  <td className="num">{money(l.amount)}</td>
                </tr>
              ))}
              <tr className="section">
                <td>L. Paid Already by or on Behalf of Borrower at Closing</td>
                <td className="num">{money(ctc.total_paid_already_by_borrower ?? t.totalPaidAlreadyByBorrower)}</td>
              </tr>
              {ctc.paid_already_by_borrower.map((l, i) => (
                <tr key={`l${i}`}>
                  <td>{l.item}</td>
                  <td className="num">{money(l.amount)}</td>
                </tr>
              ))}
              <tr className="total">
                <td>CASH TO CLOSE — {ctc.direction_to_borrower}</td>
                <td className="num">{money(ctc.cash_to_close_borrower ?? t.cashToCloseBorrower)}</td>
              </tr>
            </tbody>
          </table>

          <table className="cd-table">
            <tbody>
              <tr className="section">
                <td colSpan={2}>SELLER'S TRANSACTION</td>
              </tr>
              <tr className="section">
                <td>M. Due to Seller at Closing</td>
                <td className="num">{money(ctc.total_due_to_seller ?? t.totalDueToSeller)}</td>
              </tr>
              {ctc.due_to_seller.map((l, i) => (
                <tr key={`m${i}`}>
                  <td>{l.item}</td>
                  <td className="num">{money(l.amount)}</td>
                </tr>
              ))}
              <tr className="section">
                <td>N. Due from Seller at Closing</td>
                <td className="num">{money(ctc.total_due_from_seller ?? t.totalDueFromSeller)}</td>
              </tr>
              {ctc.due_from_seller.map((l, i) => (
                <tr key={`n${i}`}>
                  <td>{l.item}</td>
                  <td className="num">{money(l.amount)}</td>
                </tr>
              ))}
              <tr className="total">
                <td>CASH — {ctc.direction_to_seller}</td>
                <td className="num">{money(ctc.cash_to_close_seller ?? t.cashToCloseSeller)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <table className="cd-table" style={{ marginTop: 6 }}>
          <tbody>
            <tr>
              <td>Total Closing Costs (J)</td>
              <td className="num">{money(s.total_closing_costs)}</td>
              <td>Deposit</td>
              <td className="num">{money(s.deposit)}</td>
            </tr>
            <tr>
              <td>Closing Costs Paid Before Closing</td>
              <td className="num">{money(s.closing_costs_paid_before)}</td>
              <td>Funds for Borrower</td>
              <td className="num">{money(s.funds_for_borrower)}</td>
            </tr>
            <tr>
              <td>Closing Costs Financed</td>
              <td className="num">{money(s.closing_costs_financed)}</td>
              <td>Seller Credits</td>
              <td className="num">{money(s.seller_credits)}</td>
            </tr>
            <tr>
              <td>Down Payment/Funds from Borrower</td>
              <td className="num">{money(s.down_payment)}</td>
              <td>Adjustments and Other Credits</td>
              <td className="num">{money(s.adjustments_and_other_credits)}</td>
            </tr>
            <tr className="total">
              <td colSpan={3}>Cash to Close</td>
              <td className="num">{money(s.cash_to_close ?? t.summaryCashToClose)}</td>
            </tr>
          </tbody>
        </table>
        <Footer page={3} loanId={loanId} />
      </section>

      {/* ================= PAGE 4 ================= */}
      <section className="cd-page">
        <div className="cd-bar">Additional Information About This Loan</div>
        <div className="cd-subbar" style={{ marginTop: 6 }}>
          Loan Disclosures
        </div>
        <div className="cd-cols2" style={{ marginTop: 4 }}>
          <div className="cd-stack">
            <div className="cd-box">
              <b>Assumption</b>
              <div>
                <CK on={d.assumption_allowed} /> will allow, under certain conditions, this person to assume this loan on
                the original terms.
              </div>
              <div>
                <CK on={!d.assumption_allowed} /> will not allow assumption of this loan on the original terms.
              </div>
              <div className="cd-note">{d.assumption_conditions}</div>
            </div>
            <div className="cd-box">
              <b>Demand Feature</b>
              <div>
                <CK on={d.has_demand_feature} /> Your loan has a demand feature.
              </div>
              <div>
                <CK on={!d.has_demand_feature} /> Your loan does not have a demand feature.
              </div>
              <div className="cd-note">{d.demand_feature_details}</div>
            </div>
            <div className="cd-box">
              <b>Late Payment</b>
              <div className="cd-note">
                If your payment is more than {d.late_payment_days ?? 0} days late, your lender will charge a late fee of{" "}
                {money(d.late_payment_fee_amount)}.
              </div>
            </div>
            <div className="cd-box">
              <b>Negative Amortization (Increase in Loan Amount)</b>
              <div>
                <CK on={d.negative_amortization_type === "scheduled"} /> are scheduled to make monthly payments that do
                not pay all of the interest due that month.
              </div>
              <div>
                <CK on={d.negative_amortization_type === "may"} /> may have monthly payments that do not pay all of the
                interest due that month.
              </div>
              <div>
                <CK on={d.negative_amortization_type === "none"} /> do not have a negative amortization feature.
              </div>
              <div className="cd-note">{d.negative_amortization_details}</div>
            </div>
            <div className="cd-box">
              <b>Partial Payments</b>
              <div>
                <CK on={d.partial_payments_policy === "accept"} /> may accept payments that are less than the full amount
                due.
              </div>
              <div>
                <CK on={d.partial_payments_policy === "hold"} /> may hold them in a separate account until you pay the
                rest of the payment.
              </div>
              <div>
                <CK on={d.partial_payments_policy === "does_not_accept"} /> does not accept any partial payments.
              </div>
            </div>
            <div className="cd-box">
              <b>Security Interest</b>
              <div className="cd-note">{d.security_interest_description || pr.property_address}</div>
            </div>
          </div>

          <div className="cd-stack">
            <div className="cd-box">
              <b>Escrow Account</b>
              <div>
                <CK on={d.escrow.will_have_escrow_account} /> will have an escrow account
              </div>
              {d.escrow.will_have_escrow_account ? (
                <table className="cd-table" style={{ marginTop: 3 }}>
                  <tbody>
                    <tr>
                      <td>Escrowed Property Costs over Year 1</td>
                      <td className="num">{money(d.escrow.escrowed_property_costs_year1)}</td>
                    </tr>
                    <tr>
                      <td>Non-Escrowed Property Costs over Year 1</td>
                      <td className="num">{money(d.escrow.non_escrowed_property_costs_year1)}</td>
                    </tr>
                    <tr>
                      <td>Initial Escrow Payment</td>
                      <td className="num">{money(d.escrow.initial_escrow_payment)}</td>
                    </tr>
                    <tr>
                      <td>Monthly Escrow Payment</td>
                      <td className="num">{money(d.escrow.monthly_escrow_payment)}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <table className="cd-table" style={{ marginTop: 3 }}>
                  <tbody>
                    <tr>
                      <td>
                        No escrow because{" "}
                        {d.escrow.escrow_waiver_reason === "declined"
                          ? "you declined it"
                          : "your lender does not offer one"}
                      </td>
                      <td className="num" />
                    </tr>
                    <tr>
                      <td>Estimated Property Costs over Year 1</td>
                      <td className="num">{money(d.escrow.no_escrow_estimated_property_costs_year1)}</td>
                    </tr>
                    <tr>
                      <td>Escrow Waiver Fee</td>
                      <td className="num">{money(d.escrow.escrow_waiver_fee)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
              <div className="cd-note">{d.escrow.escrow_notes}</div>
            </div>

            <div className="cd-box">
              <b>Adjustable Payment (AP) Table</b>
              <table className="cd-table" style={{ marginTop: 3 }}>
                <tbody>
                  <tr>
                    <td>Interest Only Payments?</td>
                    <td className="num">{d.adjustable_payment.interest_only_payments ? "YES" : "NO"}</td>
                  </tr>
                  <tr>
                    <td>Optional Payments?</td>
                    <td className="num">{d.adjustable_payment.optional_payments ? "YES" : "NO"}</td>
                  </tr>
                  <tr>
                    <td>Step Payments?</td>
                    <td className="num">{d.adjustable_payment.step_payments ? "YES" : "NO"}</td>
                  </tr>
                  <tr>
                    <td>Seasonal Payments?</td>
                    <td className="num">{d.adjustable_payment.seasonal_payments ? "YES" : "NO"}</td>
                  </tr>
                  <tr className="section">
                    <td>Monthly Principal and Interest Payments</td>
                    <td className="num" />
                  </tr>
                  <tr>
                    <td>First Change/Amount</td>
                    <td className="num">
                      {d.adjustable_payment.monthly_principal_interest_changes.first_change_amount}
                    </td>
                  </tr>
                  <tr>
                    <td>Subsequent Changes</td>
                    <td className="num">
                      {d.adjustable_payment.monthly_principal_interest_changes.subsequent_changes_amount}
                    </td>
                  </tr>
                  <tr>
                    <td>Maximum Payment</td>
                    <td className="num">{d.adjustable_payment.monthly_principal_interest_changes.maximum_payment}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="cd-box">
              <b>Adjustable Interest Rate (AIR) Table</b>
              <table className="cd-table" style={{ marginTop: 3 }}>
                <tbody>
                  <tr>
                    <td>Index + Margin</td>
                    <td className="num">{d.adjustable_interest_rate.index_margin}</td>
                  </tr>
                  <tr>
                    <td>Initial Interest Rate</td>
                    <td className="num">{pct(d.adjustable_interest_rate.initial_interest_rate)}</td>
                  </tr>
                  <tr>
                    <td>Minimum/Maximum Interest Rate</td>
                    <td className="num">
                      {pct(d.adjustable_interest_rate.min_interest_rate)} /{" "}
                      {pct(d.adjustable_interest_rate.max_interest_rate)}
                    </td>
                  </tr>
                  <tr>
                    <td>Change Frequency</td>
                    <td className="num">{d.adjustable_interest_rate.change_frequency}</td>
                  </tr>
                  <tr>
                    <td>First Change</td>
                    <td className="num">{d.adjustable_interest_rate.first_change}</td>
                  </tr>
                  <tr>
                    <td>Subsequent Changes</td>
                    <td className="num">{d.adjustable_interest_rate.subsequent_changes}</td>
                  </tr>
                  <tr className="section">
                    <td>Limits on Interest Rate Changes</td>
                    <td className="num" />
                  </tr>
                  <tr>
                    <td>First Change</td>
                    <td className="num">{d.adjustable_interest_rate.limits_on_interest_rate_changes.first_change}</td>
                  </tr>
                  <tr>
                    <td>Subsequent Changes</td>
                    <td className="num">
                      {d.adjustable_interest_rate.limits_on_interest_rate_changes.subsequent_changes}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <Footer page={4} loanId={loanId} />
      </section>

      {/* ================= PAGE 5 ================= */}
      <section className="cd-page">
        <div className="cd-bar">Contact Information</div>
        <table className="cd-table" style={{ marginTop: 4 }}>
          <thead>
            <tr>
              <th />
              {form.contactInfo.parties.map((p2) => (
                <th key={p2.role}>{CONTACT_ROLE_LABELS[p2.role] ?? p2.role}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["Name", "name"],
                ["Address", "address"],
                ["NMLS ID", "nmls_id"],
                ["License ID", "license_id"],
                ["Contact", "contact_name"],
                ["Contact NMLS ID", "contact_nmls_id"],
                ["Contact License ID", "contact_license_id"],
                ["Email", "email"],
                ["Phone", "phone"],
              ] as const
            ).map(([label, key]) => (
              <tr key={key}>
                <td>
                  <b>{label}</b>
                </td>
                {form.contactInfo.parties.map((p2) => (
                  <td key={p2.role + key}>{p2[key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="cd-bar" style={{ marginTop: 8 }}>
          Other Disclosures
        </div>
        <div className="cd-cols2" style={{ marginTop: 4 }}>
          <div className="cd-stack">
            <div className="cd-box">
              <b>Appraisal</b>
              <div className="cd-note">
                <CK on={form.otherDisclosures.appraisal_acknowledged} /> If the property was appraised for your loan, your
                lender is required to give you a copy at no additional cost at least 3 days before closing.
              </div>
            </div>
            <div className="cd-box">
              <b>Contract Details</b>
              <div className="cd-note">
                <CK on={form.otherDisclosures.contract_details_acknowledged} /> See your note and security instrument for
                information about nonpayment, default, required repayment in full before the scheduled date, and value
                of any property.
              </div>
            </div>
          </div>
          <div className="cd-stack">
            <div className="cd-box">
              <b>Liability after Foreclosure</b>
              <div className="cd-note">
                <CK on={form.otherDisclosures.liability_after_foreclosure_protected} /> State law may protect you from
                liability for the unpaid balance.
              </div>
            </div>
            <div className="cd-box">
              <b>Refinance</b>
              <div className="cd-note">
                <CK on={form.otherDisclosures.refinance_possible} /> Refinancing this loan will depend on your future
                financial situation, the property value, and market conditions.
              </div>
            </div>
            <div className="cd-box">
              <b>Tax Deductions</b>
              <div className="cd-note">{form.otherDisclosures.tax_deductions_note}</div>
            </div>
          </div>
        </div>

        <div className="cd-bar" style={{ marginTop: 8 }}>
          Confirm Receipt
        </div>
        <p className="cd-note" style={{ marginTop: 4 }}>
          By signing, you are only confirming that you have received this form. You do not have to accept this loan
          because you have signed or received this form.
        </p>
        <div className="cd-cols2" style={{ marginTop: 16 }}>
          <div>
            <div className="cd-sig">
              {form.signatures.applicant_signature_data_url && (
                <img src={form.signatures.applicant_signature_data_url} alt="Applicant signature" />
              )}
            </div>
            <div className="cd-note">
              Applicant Signature — Date {dateUS(form.signatures.applicant_signature_date)}
            </div>
          </div>
          <div>
            <div className="cd-sig">
              {form.signatures.co_applicant_signature_data_url && (
                <img src={form.signatures.co_applicant_signature_data_url} alt="Co-applicant signature" />
              )}
            </div>
            <div className="cd-note">
              Co-Applicant Signature — Date {dateUS(form.signatures.co_applicant_signature_date)}
            </div>
          </div>
        </div>
        <Footer page={5} loanId={loanId} />
      </section>

      {/* ================= PAGE 6 ================= */}
      <section className="cd-page">
        <div className="cd-bar">Loan Calculations</div>
        <table className="cd-table" style={{ marginTop: 4 }}>
          <tbody>
            <tr>
              <td style={{ width: "62%" }}>
                <b>Total of Payments.</b> Total you will have paid after you make all payments of principal, interest,
                mortgage insurance, and loan costs, as scheduled.
              </td>
              <td className="num">
                <b>{money(form.loanCalculations.total_of_payments)}</b>
              </td>
            </tr>
            <tr>
              <td>
                <b>Finance Charge.</b> The dollar amount the loan will cost you.
              </td>
              <td className="num">
                <b>{money(form.loanCalculations.finance_charge)}</b>
              </td>
            </tr>
            <tr>
              <td>
                <b>Amount Financed.</b> The loan amount available after paying your upfront finance charge.
              </td>
              <td className="num">
                <b>{money(form.loanCalculations.amount_financed)}</b>
              </td>
            </tr>
            <tr>
              <td>
                <b>Annual Percentage Rate (APR).</b> Your costs over the loan term expressed as a rate. This is not your
                interest rate.
              </td>
              <td className="num">
                <b>{pct(form.loanCalculations.apr)}</b>
              </td>
            </tr>
            <tr>
              <td>
                <b>Total Interest Percentage (TIP).</b> The total amount of interest that you will pay over the loan term
                as a percentage of your loan amount.
              </td>
              <td className="num">
                <b>{pct(form.loanCalculations.tip)}</b>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="cd-bar" style={{ marginTop: 10 }}>
          Additional Closing Details
        </div>
        <div className="cd-box" style={{ marginTop: 4, minHeight: "1.6in" }}>
          <b>Final Settlement Notes</b>
          <p className="cd-note" style={{ whiteSpace: "pre-wrap" }}>
            {form.closingDetails.settlement_notes}
          </p>
        </div>
        <div className="cd-box" style={{ marginTop: 6, minHeight: "1in" }}>
          <b>Document IDs</b>
          <p className="cd-note" style={{ whiteSpace: "pre-wrap" }}>
            {form.closingDetails.document_ids}
          </p>
        </div>
        <div className="cd-box" style={{ marginTop: 6 }}>
          <b>Questions?</b>
          <p className="cd-note">
            If you have questions about the loan terms or costs on this form, use the contact information on page 5. To
            get more information or make a complaint, contact the Consumer Financial Protection Bureau at
            www.consumerfinance.gov/mortgage-closing
          </p>
        </div>
        <Footer page={6} loanId={loanId} />
      </section>
    </div>
  );
});
