import { forwardRef } from "react";
import "./print.css";
import type { ClosingDisclosureForm } from "@/lib/closing-disclosure/types";
import { CONTACT_ROLE_LABELS } from "@/lib/closing-disclosure/types";
import { computeTotals, money, pct, dateUS } from "@/lib/closing-disclosure/calc";

const CK = ({ on }: { on?: boolean }) => <span className="cd-ck">{on ? "X" : ""}</span>;

const KV = ({ k, v, wide }: { k: string; v?: string | null; wide?: boolean }) => (
  <div className={wide ? "cd-kv wide" : "cd-kv"}>
    <span>{k}</span>
    <span>{v || "\u00A0"}</span>
  </div>
);

const N = ({ i }: { i: number }) => <span className="cd-idx">{String(i).padStart(2, "0")}</span>;

const Footer = ({ page, loanId }: { page: number; loanId: string }) => (
  <div className="cd-footer">
    <span>CLOSING DISCLOSURE</span>
    <span className="cd-footer-page">PAGE {page} OF 6</span>
    <span>LOAN ID # {loanId || "\u2014"}</span>
  </div>
);

/** Pad a list of rows so each cost section keeps the fixed CFPB row grid. */
function padRows<T>(rows: T[], min: number): (T | null)[] {
  const out: (T | null)[] = [...rows];
  while (out.length < min) out.push(null);
  return out;
}

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
  const loanType = (li.loan_type || "").toLowerCase();

  const costRow = (
    key: string,
    idx: number,
    label: string,
    atClosing?: number | null,
    before?: number | null,
    seller?: number | null,
    others?: number | null,
  ) => (
    <tr key={key}>
      <td>
        <N i={idx} /> {label}
      </td>
      <td className="num">{atClosing ? money(atClosing) : ""}</td>
      <td className="num">{before ? money(before) : ""}</td>
      <td className="num">{seller ? money(seller) : ""}</td>
      <td className="num">{others ? money(others) : ""}</td>
    </tr>
  );

  return (
    <div className="cd-doc" ref={ref} id="cd-print-root">
      {/* ================= PAGE 1 ================= */}
      <section className="cd-page">
        <div className="cd-masthead">
          <h1 className="cd-title">Closing Disclosure</h1>
          <p className="cd-intro">
            This form is a statement of final loan terms and closing costs. Compare this document with your Loan
            Estimate.
          </p>
        </div>

        <div className="cd-cols3">
          <div>
            <div className="cd-colhead">Closing Information</div>
            <KV k="Date Issued" v={dateUS(ci.date_issued)} />
            <KV k="Closing Date" v={dateUS(ci.closing_date)} />
            <KV k="Disbursement Date" v={dateUS(ci.disbursement_date)} />
            <KV k="Settlement Agent" v={ci.settlement_agent} />
            <KV k="File #" v={ci.file_number} />
            <KV k="Property" v={pr.property_address} />
            {li.purpose === "Refinance" ? (
              <KV k="Est. Prop. Value" v={money(pr.estimated_property_value)} />
            ) : (
              <KV k="Sale Price" v={money(pr.sale_price)} />
            )}
          </div>
          <div>
            <div className="cd-colhead">Transaction Information</div>
            <KV k="Borrower" v={ti.borrower_name} wide />
            <KV k="" v={ti.borrower_address} wide />
            <KV k="Seller" v={ti.seller_name} wide />
            <KV k="" v={ti.seller_address} wide />
            <KV k="Lender" v={ti.lender_name} wide />
            <KV k="" v={ti.lender_address} wide />
          </div>
          <div>
            <div className="cd-colhead">Loan Information</div>
            <KV k="Loan Term" v={li.loan_term} wide />
            <KV k="Purpose" v={li.purpose} wide />
            <KV k="Product" v={li.product} wide />
            <div className="cd-kv wide">
              <span>Loan Type</span>
              <span>
                <CK on={loanType.includes("conv")} />
                Conventional <CK on={loanType.includes("fha")} />
                FHA <CK on={loanType.includes("va")} />
                VA
              </span>
            </div>
            <KV k="Loan ID #" v={ti.loan_id} wide />
            <KV k="MIC #" v={ti.mic_number} wide />
          </div>
        </div>

        {/* Loan Terms */}
        <div style={{ marginTop: 10 }}>
          <div className="cd-barrow">
            <div className="cd-bar">Loan Terms</div>
            <div className="cd-graybar">Can this amount increase after closing?</div>
          </div>
          <table className="cd-table cd-split">
            <tbody>
              <tr>
                <td className="lab">
                  <span className="cd-lead">Loan Amount</span>
                </td>
                <td style={{ width: "1.5in" }} className="num">
                  {money(lt.loan_amount)}
                </td>
                <td>
                  <b>{lt.loan_amount_can_increase ? "YES" : "NO"}</b>
                </td>
              </tr>
              <tr>
                <td className="lab">
                  <span className="cd-lead">Interest Rate</span>
                </td>
                <td className="num">{pct(lt.interest_rate)}</td>
                <td>
                  <b>{lt.interest_rate_can_increase ? "YES" : "NO"}</b>
                </td>
              </tr>
              <tr>
                <td className="lab">
                  <span className="cd-lead">Monthly Principal &amp; Interest</span>
                  <div className="cd-note">
                    See Projected Payments below for your Estimated Total Monthly Payment
                  </div>
                </td>
                <td className="num">{money(lt.monthly_principal_interest)}</td>
                <td>
                  <b>{lt.payment_can_increase ? "YES" : "NO"}</b>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="cd-barrow">
            <div style={{ flex: "0 0 3.1in" }} />
            <div className="cd-graybar" style={{ flex: 1 }}>
              Does the loan have these features?
            </div>
          </div>
          <table className="cd-table cd-split">
            <tbody>
              <tr>
                <td className="lab">
                  <span className="cd-lead">Prepayment Penalty</span>
                </td>
                <td style={{ width: "1.5in" }} />
                <td>
                  <b>{lt.has_prepayment_penalty ? "YES" : "NO"}</b>{" "}
                  <span className="cd-note">{lt.prepayment_penalty_details}</span>
                </td>
              </tr>
              <tr>
                <td className="lab">
                  <span className="cd-lead">Balloon Payment</span>
                </td>
                <td />
                <td>
                  <b>{lt.has_balloon_payment ? "YES" : "NO"}</b>{" "}
                  <span className="cd-note">{lt.balloon_payment_details}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Projected Payments */}
        <div style={{ marginTop: 10 }}>
          <div className="cd-bar">Projected Payments</div>
          <div className="cd-barrow">
            <div className="cd-graybar left" style={{ flex: "0 0 3.1in" }}>
              Payment Calculation
            </div>
            <div className="cd-graybar" style={{ flex: 1 }}>
              {li.loan_term ? `Years 1 - ${String(li.loan_term).replace(/[^0-9]/g, "") || ""}` : "Years 1 - 30"}
            </div>
          </div>
          <table className="cd-table cd-split">
            <tbody>
              <tr>
                <td className="lab">Principal &amp; Interest</td>
                <td className="num">{money(pp.principal_interest)}</td>
              </tr>
              <tr>
                <td className="lab">Mortgage Insurance</td>
                <td className="num">+ {money(pp.mortgage_insurance)}</td>
              </tr>
              <tr>
                <td className="lab">
                  Estimated Escrow
                  <div className="cd-note">Amount can increase over time</div>
                </td>
                <td className="num">+ {money(pp.estimated_escrow)}</td>
              </tr>
              <tr className="total">
                <td className="lab">
                  Estimated Total
                  <br />
                  Monthly Payment
                </td>
                <td className="num">{money(lt.estimated_total_monthly_payment ?? t.projectedTotal)}</td>
              </tr>
            </tbody>
          </table>
          <table className="cd-table">
            <tbody>
              <tr>
                <td style={{ width: "2.6in", borderRight: "0.7px solid #000" }}>
                  <span className="cd-lead">Estimated Taxes, Insurance &amp; Assessments</span>
                  <div className="cd-note">Amount can increase over time. See page 4 for details.</div>
                </td>
                <td className="num" style={{ width: "1.1in", borderRight: "0.7px solid #000" }}>
                  {money(pp.estimated_taxes_insurance_assessments)}
                  <div className="cd-note">a month</div>
                </td>
                <td>
                  <b>This estimate includes</b>
                  {pp.escrowed_property_costs.map((e, i) => (
                    <div key={`ep${i}`}>
                      <CK on /> {e.type}
                    </div>
                  ))}
                  {pp.non_escrowed_property_costs.map((e, i) => (
                    <div key={`np${i}`}>
                      <CK /> {e.type}
                    </div>
                  ))}
                  <div className="cd-note">
                    See Escrow Account on page 4 for details. You must pay for other property costs separately.
                  </div>
                </td>
                <td style={{ width: "0.85in" }}>
                  <b>In escrow?</b>
                  {pp.escrowed_property_costs.map((e, i) => (
                    <div key={`ei${i}`}>
                      <b>{e.in_escrow ? "YES" : "NO"}</b>
                    </div>
                  ))}
                  {pp.non_escrowed_property_costs.map((_, i) => (
                    <div key={`ni${i}`}>
                      <b>NO</b>
                    </div>
                  ))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Costs at Closing */}
        <div style={{ marginTop: 10 }}>
          <div className="cd-bar">Costs at Closing</div>
          <table className="cd-table cd-split">
            <tbody>
              <tr>
                <td className="lab">
                  <span className="cd-lead">Closing Costs</span>
                </td>
                <td className="num" style={{ width: "1.3in" }}>
                  {money(form.closingCostsSummary.total_closing_costs ?? totalClosingCosts)}
                </td>
                <td>
                  Includes {money(form.closingCostsSummary.total_loan_costs ?? totalLoanCosts)} in Loan Costs +{" "}
                  {money(form.closingCostsSummary.other_costs ?? totalOtherCosts)} in Other Costs &minus;{" "}
                  {money(form.closingCostsSummary.lender_credits ?? t.lenderCredits)} in Lender Credits.{" "}
                  <span className="cd-note">See page 2 for details.</span>
                </td>
              </tr>
              <tr>
                <td className="lab">
                  <span className="cd-lead">Cash to Close</span>
                </td>
                <td className="num">{money(form.closingCostsSummary.cash_to_close_amount)}</td>
                <td>
                  Includes Closing Costs.{" "}
                  <span className="cd-note">See Calculating Cash to Close on page 3 for details.</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Footer page={1} loanId={loanId} />
      </section>

      {/* ================= PAGE 2 ================= */}
      <section className="cd-page">
        <div className="cd-pagehead">Closing Cost Details</div>

        <table className="cd-table">
          <thead>
            <tr>
              <th style={{ width: "3.1in" }}>Loan Costs</th>
              <th className="num">Borrower-Paid At Closing</th>
              <th className="num">Borrower-Paid Before Closing</th>
              <th className="num">Seller-Paid</th>
              <th className="num">Paid by Others</th>
            </tr>
          </thead>
          <tbody>
            <tr className="section">
              <td>A. Origination Charges</td>
              <td className="num">{money(t.sectionA)}</td>
              <td colSpan={3} />
            </tr>
            {padRows(lc.origination_charges, 3).map((o, i) =>
              o
                ? costRow(
                    `a${i}`,
                    i + 1,
                    `${o.percent_of_loan ? `${o.percent_of_loan}% of Loan Amount (Points) ` : ""}${o.item ?? ""}`,
                    o.amount,
                  )
                : costRow(`a${i}`, i + 1, ""),
            )}
            <tr className="section">
              <td>B. Services Borrower Did Not Shop For</td>
              <td className="num">{money(t.sectionB)}</td>
              <td colSpan={3} />
            </tr>
            {padRows(lc.services_not_shopped, 3).map((o, i) =>
              o
                ? costRow(
                    `b${i}`,
                    i + 1,
                    o.item ?? "",
                    o.borrower_paid_at_closing,
                    o.borrower_paid_before,
                    o.seller_paid,
                    o.others_paid,
                  )
                : costRow(`b${i}`, i + 1, ""),
            )}
            <tr className="section">
              <td>C. Services Borrower Did Shop For</td>
              <td className="num">{money(t.sectionC)}</td>
              <td colSpan={3} />
            </tr>
            {padRows(lc.services_shopped, 3).map((o, i) =>
              o
                ? costRow(
                    `c${i}`,
                    i + 1,
                    o.item ?? "",
                    o.borrower_paid_at_closing,
                    o.borrower_paid_before,
                    o.seller_paid,
                    o.others_paid,
                  )
                : costRow(`c${i}`, i + 1, ""),
            )}
            <tr className="total">
              <td>D. TOTAL LOAN COSTS (Borrower-Paid)</td>
              <td className="num">{money(totalLoanCosts)}</td>
              <td className="num">{money(t.borrowerPaidBefore)}</td>
              <td className="num">{money(t.sellerPaid)}</td>
              <td className="num">{money(t.othersPaid)}</td>
            </tr>
          </tbody>
        </table>

        <table className="cd-table" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th style={{ width: "3.1in" }}>Other Costs</th>
              <th className="num">Borrower-Paid At Closing</th>
              <th className="num">Borrower-Paid Before Closing</th>
              <th className="num">Seller-Paid</th>
              <th className="num">Paid by Others</th>
            </tr>
          </thead>
          <tbody>
            <tr className="section">
              <td>E. Taxes and Other Government Fees</td>
              <td className="num">{money(t.sectionE)}</td>
              <td colSpan={3} />
            </tr>
            {costRow("e1", 1, "Recording Fees — Deed", oc.recording_fees_deed)}
            {costRow("e2", 2, "Recording Fees — Mortgage", oc.recording_fees_mortgage)}
            {oc.other_government_fees.map((o, i) =>
              costRow(
                `eg${i}`,
                i + 3,
                o.item ?? "",
                o.borrower_paid_at_closing,
                null,
                o.seller_paid,
                o.others_paid,
              ),
            )}
            <tr className="section">
              <td>F. Prepaids</td>
              <td className="num">{money(t.sectionF)}</td>
              <td colSpan={3} />
            </tr>
            {costRow(
              "f1",
              1,
              `Homeowner's Insurance Premium (${p.homeowners_insurance_months ?? 0} mo.)`,
              p.homeowners_insurance_premium,
            )}
            {costRow(
              "f2",
              2,
              `Mortgage Insurance Premium (${p.mortgage_insurance_premium_months ?? 0} mo.)`,
              p.mortgage_insurance_premium,
            )}
            {costRow(
              "f3",
              3,
              `Prepaid Interest (${money(p.prepaid_interest_per_day)} per day ${p.prepaid_interest_dates ?? ""})`,
              p.prepaid_interest_amount,
            )}
            {costRow("f4", 4, `Property Taxes (${p.property_taxes_months ?? 0} mo.)`, p.property_taxes_amount)}
            {p.other_prepaids.map((o, i) =>
              costRow(
                `fo${i}`,
                i + 5,
                o.item ?? "",
                o.borrower_paid_at_closing,
                null,
                o.seller_paid,
                o.others_paid,
              ),
            )}
            <tr className="section">
              <td>G. Initial Escrow Payment at Closing</td>
              <td className="num">{money(t.sectionG)}</td>
              <td colSpan={3} />
            </tr>
            {oc.initial_escrow.map((o, i) =>
              costRow(
                `g${i}`,
                i + 1,
                `${o.type ?? ""} ${money(o.per_month)} per month × ${o.months ?? 0} mo.`,
                o.amount,
              ),
            )}
            {costRow("gagg", oc.initial_escrow.length + 1, "Aggregate Adjustment", oc.aggregate_adjustment)}
            <tr className="section">
              <td>H. Other</td>
              <td className="num">{money(t.sectionH)}</td>
              <td colSpan={3} />
            </tr>
            {padRows(oc.other_costs_detail, 2).map((o, i) =>
              o
                ? costRow(
                    `h${i}`,
                    i + 1,
                    o.item ?? "",
                    o.borrower_paid_at_closing,
                    null,
                    o.seller_paid,
                    o.others_paid,
                  )
                : costRow(`h${i}`, i + 1, ""),
            )}
            <tr className="total">
              <td>I. TOTAL OTHER COSTS (Borrower-Paid)</td>
              <td className="num">{money(totalOtherCosts)}</td>
              <td colSpan={3} />
            </tr>
            <tr>
              <td>Other Costs Subtotals (E + F + G + H)</td>
              <td className="num">{money(totalOtherCosts)}</td>
              <td colSpan={3} />
            </tr>
            <tr className="total">
              <td>J. TOTAL CLOSING COSTS (Borrower-Paid)</td>
              <td className="num">{money(totalClosingCosts)}</td>
              <td colSpan={3} />
            </tr>
            <tr>
              <td>Closing Costs Subtotals (D + I)</td>
              <td className="num">{money(totalClosingCosts)}</td>
              <td className="num">{money(t.borrowerPaidBefore)}</td>
              <td className="num">{money(t.sellerPaid)}</td>
              <td className="num">{money(t.othersPaid)}</td>
            </tr>
            <tr>
              <td>Lender Credits</td>
              <td className="num">{t.lenderCredits ? `(${money(t.lenderCredits)})` : ""}</td>
              <td colSpan={3} />
            </tr>
          </tbody>
        </table>

        <Footer page={2} loanId={loanId} />
      </section>

      {/* ================= PAGE 3 ================= */}
      <section className="cd-page">
        <div className="cd-pagehead">
          Calculating Cash to Close
          <span className="cd-sub">Use this table to see what has changed from your Loan Estimate.</span>
        </div>
        <table className="cd-table">
          <thead>
            <tr>
              <th style={{ width: "3.1in" }} />
              <th className="num" style={{ width: "1in" }}>
                Loan Estimate
              </th>
              <th className="num" style={{ width: "1in" }}>
                Final
              </th>
              <th>Did this change?</th>
            </tr>
          </thead>
          <tbody>
            {ctc.loan_estimate_comparison.map((r, i) => (
              <tr key={i}>
                <td>{r.item}</td>
                <td className="num">{money(r.loan_estimate)}</td>
                <td className="num">{money(r.final)}</td>
                <td>
                  <b>{r.did_change ? "YES" : "NO"}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="cd-pagehead" style={{ marginTop: 10 }}>
          Summaries of Transactions
          <span className="cd-sub">Use this table to see a summary of your transaction.</span>
        </div>
        <div className="cd-cols2">
          <div>
            <div className="cd-subbar">BORROWER'S TRANSACTION</div>
            <table className="cd-table">
              <tbody>
                <tr className="section">
                  <td>K. Due from Borrower at Closing</td>
                  <td className="num" style={{ width: "1.1in" }}>
                    {money(ctc.total_due_from_borrower ?? t.totalDueFromBorrower)}
                  </td>
                </tr>
                {ctc.due_from_borrower.map((l, i) => (
                  <tr key={`k${i}`}>
                    <td>
                      <N i={i + 1} /> {l.item}
                    </td>
                    <td className="num">{money(l.amount)}</td>
                  </tr>
                ))}
                <tr className="section">
                  <td>L. Paid Already by or on Behalf of Borrower at Closing</td>
                  <td className="num">{money(ctc.total_paid_already_by_borrower ?? t.totalPaidAlreadyByBorrower)}</td>
                </tr>
                {ctc.paid_already_by_borrower.map((l, i) => (
                  <tr key={`l${i}`}>
                    <td>
                      <N i={i + 1} /> {l.item}
                    </td>
                    <td className="num">{money(l.amount)}</td>
                  </tr>
                ))}
                <tr className="section">
                  <td colSpan={2}>CALCULATION</td>
                </tr>
                <tr>
                  <td>Total Due from Borrower at Closing (K)</td>
                  <td className="num">{money(ctc.total_due_from_borrower ?? t.totalDueFromBorrower)}</td>
                </tr>
                <tr>
                  <td>Total Paid Already by or on Behalf of Borrower at Closing (L)</td>
                  <td className="num">
                    &minus;{money(ctc.total_paid_already_by_borrower ?? t.totalPaidAlreadyByBorrower)}
                  </td>
                </tr>
                <tr className="total">
                  <td>
                    Cash to Close <CK on={ctc.direction_to_borrower === "From Borrower"} /> From{" "}
                    <CK on={ctc.direction_to_borrower === "To Borrower"} /> To Borrower
                  </td>
                  <td className="num">{money(ctc.cash_to_close_borrower ?? t.cashToCloseBorrower)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <div className="cd-subbar">SELLER'S TRANSACTION</div>
            <table className="cd-table">
              <tbody>
                <tr className="section">
                  <td>M. Due to Seller at Closing</td>
                  <td className="num" style={{ width: "1.1in" }}>
                    {money(ctc.total_due_to_seller ?? t.totalDueToSeller)}
                  </td>
                </tr>
                {ctc.due_to_seller.map((l, i) => (
                  <tr key={`m${i}`}>
                    <td>
                      <N i={i + 1} /> {l.item}
                    </td>
                    <td className="num">{money(l.amount)}</td>
                  </tr>
                ))}
                <tr className="section">
                  <td>N. Due from Seller at Closing</td>
                  <td className="num">{money(ctc.total_due_from_seller ?? t.totalDueFromSeller)}</td>
                </tr>
                {ctc.due_from_seller.map((l, i) => (
                  <tr key={`n${i}`}>
                    <td>
                      <N i={i + 1} /> {l.item}
                    </td>
                    <td className="num">{money(l.amount)}</td>
                  </tr>
                ))}
                <tr className="section">
                  <td colSpan={2}>CALCULATION</td>
                </tr>
                <tr>
                  <td>Total Due to Seller at Closing (M)</td>
                  <td className="num">{money(ctc.total_due_to_seller ?? t.totalDueToSeller)}</td>
                </tr>
                <tr>
                  <td>Total Due from Seller at Closing (N)</td>
                  <td className="num">&minus;{money(ctc.total_due_from_seller ?? t.totalDueFromSeller)}</td>
                </tr>
                <tr className="total">
                  <td>
                    Cash to Close <CK on={ctc.direction_to_seller === "From Seller"} /> From{" "}
                    <CK on={ctc.direction_to_seller === "To Seller"} /> To Seller
                  </td>
                  <td className="num">{money(ctc.cash_to_close_seller ?? t.cashToCloseSeller)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <table className="cd-table" style={{ marginTop: 8 }}>
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
        <div className="cd-pagehead">Additional Information About This Loan</div>
        <div className="cd-bar">Loan Disclosures</div>
        <div className="cd-cols2" style={{ marginTop: 6 }}>
          <div className="cd-stack">
            <div className="cd-box">
              <b>Assumption</b>
              <p>If you sell or transfer this property to another person, your lender</p>
              <div>
                <CK on={d.assumption_allowed} /> will allow, under certain conditions, this person to assume this loan on
                the original terms.
              </div>
              <div>
                <CK on={!d.assumption_allowed} /> will not allow assumption of this loan on the original terms.
              </div>
              {d.assumption_conditions ? <div className="cd-note">{d.assumption_conditions}</div> : null}
            </div>
            <div className="cd-box">
              <b>Demand Feature</b>
              <p>Your loan</p>
              <div>
                <CK on={d.has_demand_feature} /> has a demand feature, which permits your lender to require early
                repayment of the loan. You should review your note for details.
              </div>
              <div>
                <CK on={!d.has_demand_feature} /> does not have a demand feature.
              </div>
            </div>
            <div className="cd-box">
              <b>Late Payment</b>
              <p>
                If your payment is more than {d.late_payment_days ?? 0} days late, your lender will charge a late fee of{" "}
                {money(d.late_payment_fee_amount)}.
              </p>
            </div>
            <div className="cd-box">
              <b>Negative Amortization (Increase in Loan Amount)</b>
              <p>Under your loan terms, you</p>
              <div>
                <CK on={d.negative_amortization_type === "scheduled"} /> are scheduled to make monthly payments that do
                not pay all of the interest due that month. As a result, your loan amount will increase (negatively
                amortize).
              </div>
              <div>
                <CK on={d.negative_amortization_type === "may"} /> may have monthly payments that do not pay all of the
                interest due that month.
              </div>
              <div>
                <CK on={d.negative_amortization_type === "none"} /> do not have a negative amortization feature.
              </div>
            </div>
            <div className="cd-box">
              <b>Partial Payments</b>
              <p>Your lender</p>
              <div>
                <CK on={d.partial_payments_policy === "accept"} /> may accept payments that are less than the full
                amount due (partial payments) and apply them to your loan.
              </div>
              <div>
                <CK on={d.partial_payments_policy === "hold"} /> may hold them in a separate account until you pay the
                rest of the payment, and then apply the full payment to your loan.
              </div>
              <div>
                <CK on={d.partial_payments_policy === "does_not_accept"} /> does not accept any partial payments.
              </div>
            </div>
            <div className="cd-box">
              <b>Security Interest</b>
              <p>You are granting a security interest in</p>
              <p>{d.security_interest_description || pr.property_address}</p>
              <p className="cd-note">
                You may lose this property if you do not make your payments or satisfy other obligations for this loan.
              </p>
            </div>
          </div>

          <div className="cd-stack">
            <div className="cd-box">
              <b>Escrow Account</b>
              <p className="cd-note">
                For now, your loan{" "}
                {d.escrow.will_have_escrow_account
                  ? "will have an escrow account (also called an “impound” or “trust” account)."
                  : "will not have an escrow account."}
              </p>
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
                <>
                  <div>
                    <CK on /> will not have an escrow account because{" "}
                    <CK on={d.escrow.escrow_waiver_reason === "declined"} /> you declined it{" "}
                    <CK on={d.escrow.escrow_waiver_reason !== "declined"} /> your lender does not offer one. You must
                    directly pay your property costs, such as taxes and homeowner's insurance.
                  </div>
                  <table className="cd-table" style={{ marginTop: 3 }}>
                    <tbody>
                      <tr className="section">
                        <td colSpan={2}>No Escrow</td>
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
                </>
              )}
              <p className="cd-note" style={{ marginTop: 3 }}>
                In the future, your property costs may change and, as a result, your escrow payment may change. If you
                fail to pay your property costs, your lender may add the amounts to your loan balance, add an escrow
                account to your loan, or require you to pay for property insurance that the lender buys on your behalf.
              </p>
              {d.escrow.escrow_notes ? <p className="cd-note">{d.escrow.escrow_notes}</p> : null}
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
                    <td colSpan={2}>Monthly Principal and Interest Payments</td>
                  </tr>
                  <tr>
                    <td>First Change/Amount</td>
                    <td className="num">{d.adjustable_payment.monthly_principal_interest_changes.first_change_amount}</td>
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
                    <td colSpan={2}>Limits on Interest Rate Changes</td>
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
        <div className="cd-pagehead">Loan Calculations</div>
        <div className="cd-cols2">
          <table className="cd-table">
            <tbody>
              <tr>
                <td>
                  <b>Total of Payments.</b> Total you will have paid after you make all payments of principal, interest,
                  mortgage insurance, and loan costs, as scheduled.
                </td>
                <td className="num" style={{ width: "1in" }}>
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
                  <b>Annual Percentage Rate (APR).</b> Your costs over the loan term expressed as a rate. This is not
                  your interest rate.
                </td>
                <td className="num">
                  <b>{pct(form.loanCalculations.apr)}</b>
                </td>
              </tr>
              <tr>
                <td>
                  <b>Total Interest Percentage (TIP).</b> The total amount of interest that you will pay over the loan
                  term as a percentage of your loan amount.
                </td>
                <td className="num">
                  <b>{pct(form.loanCalculations.tip)}</b>
                </td>
              </tr>
            </tbody>
          </table>
          <div>
            <div className="cd-bar">Other Disclosures</div>
            <div className="cd-stack" style={{ marginTop: 6 }}>
              <div className="cd-box">
                <b>Appraisal</b>
                <p className="cd-note">
                  If the property was appraised for your loan, your lender is required to give you a copy at no
                  additional cost at least 3 days before closing.
                </p>
              </div>
              <div className="cd-box">
                <b>Contract Details</b>
                <p className="cd-note">
                  See your note and security instrument for information about what happens if you fail to make your
                  payments, what is a default on the loan, and the rules for making payments before they are due.
                </p>
              </div>
              <div className="cd-box">
                <b>Liability after Foreclosure</b>
                <div>
                  <CK on={form.otherDisclosures.liability_after_foreclosure_protected} /> state law may protect you from
                  liability for the unpaid balance.
                </div>
                <div>
                  <CK on={!form.otherDisclosures.liability_after_foreclosure_protected} /> state law does not protect you
                  from liability for the unpaid balance.
                </div>
              </div>
              <div className="cd-box">
                <b>Refinance</b>
                <p className="cd-note">
                  Refinancing this loan will depend on your future financial situation, the property value, and market
                  conditions. You may not be able to refinance this loan.
                </p>
              </div>
              <div className="cd-box">
                <b>Tax Deductions</b>
                <p className="cd-note">
                  {form.otherDisclosures.tax_deductions_note ||
                    "If you borrow more than this property is worth, the interest on the loan amount above this property's fair market value is not deductible from your federal income taxes."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="cd-note" style={{ marginTop: 8 }}>
          <b>Questions?</b> If you have questions about the loan terms or costs on this form, use the contact
          information below. To get more information or make a complaint, contact the Consumer Financial Protection
          Bureau at www.consumerfinance.gov/mortgage-closing
        </p>

        <div className="cd-pagehead" style={{ marginTop: 8 }}>
          Contact Information
        </div>
        <table className="cd-table">
          <thead>
            <tr>
              <th style={{ width: "0.9in" }} />
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

        <div className="cd-bar" style={{ marginTop: 10 }}>
          Confirm Receipt
        </div>
        <p className="cd-note" style={{ marginTop: 4 }}>
          By signing, you are only confirming that you have received this form. You do not have to accept this loan
          because you have signed or received this form.
        </p>
        <div className="cd-cols2" style={{ marginTop: 18 }}>
          <div>
            <div className="cd-sig">
              {form.signatures.applicant_signature_data_url && (
                <img src={form.signatures.applicant_signature_data_url} alt="Applicant signature" />
              )}
            </div>
            <div className="cd-note">Applicant Signature — Date {dateUS(form.signatures.applicant_signature_date)}</div>
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

      {/* ================= PAGE 6 — ADDENDUM ================= */}
      <section className="cd-page">
        <div className="cd-pagehead">Addendum</div>
        <div className="cd-bar">Transaction Information</div>
        <div className="cd-cols2" style={{ marginTop: 6 }}>
          <div className="cd-box">
            <b>Borrower</b>
            <p>{ti.borrower_name}</p>
            <p>{ti.borrower_address}</p>
          </div>
          <div className="cd-box">
            <b>Seller</b>
            <p>{ti.seller_name}</p>
            <p>{ti.seller_address}</p>
          </div>
        </div>

        <div className="cd-bar" style={{ marginTop: 10 }}>
          Additional Closing Details
        </div>
        <div className="cd-box" style={{ marginTop: 6, minHeight: "1.6in" }}>
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
        <Footer page={6} loanId={loanId} />
      </section>
    </div>
  );
});
