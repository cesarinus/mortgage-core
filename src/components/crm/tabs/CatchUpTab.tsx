import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail,
  MessageSquare,
  FileText,
  PhoneMissed,
  Phone,
  CheckSquare,
  CalendarDays,
  AlertTriangle,
  Sparkles,
  Info,
  BarChart3,
  Calculator,
} from "lucide-react";
import { SentimentGauge } from "../SentimentGauge";
import { format } from "date-fns";
import FinancialWorkspace from "@/components/crm/finance/FinancialWorkspace";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useEffect, useMemo, useState } from "react";
import { fetchAllLatestIncome, IncomeCalc } from "@/lib/crm/income";
import { fetchDealBorrowers, type DealBorrower } from "@/lib/crm/borrowers";
import { IncomeAiAnalysis } from "@/components/crm/IncomeAiAnalysis";
import { formatOptionLabel } from "@/lib/format/labels";
import { getCurrentRateMeta, type MarketRate } from "@/lib/mortgage/rateService";
import { estimatePayment } from "@/lib/mortgage/estimatePayment";
import { calcLeadQualification, parseCreditScore } from "@/lib/mortgage/leadQualification";

interface Props {
  activities: any[];
  emailLogs: any[];
  sentiment?: any | null;
  mortgage?: any | null;
  record: any;
  onRefreshSentiment?: () => void;
  leadId?: string;
  contactId?: string;
  /** When true, omit the Income Analysis card (rendered full-width elsewhere). */
  hideIncomeAnalysis?: boolean;
  /**
   * When true, this workspace is opened from the Pipeline. The lead-page
   * pre-qualification engine (HE/DTI/LTV/Readiness) must be hidden — those
   * stages display ARIVE LOS values as the source of truth.
   */
  pipelineMode?: boolean;
}

export function CatchUpTab({
  activities,
  emailLogs,
  sentiment,
  mortgage,
  record,
  onRefreshSentiment,
  leadId,
  contactId,
  hideIncomeAnalysis,
  pipelineMode = false,
}: Props) {
  const inbound = activities
    .filter((a) => ["form_submit", "chat", "inbound_call"].includes(a.activity_type))
    .slice(0, 5);
  const outbound = activities.filter((a) => ["email", "call", "task", "meeting"].includes(a.activity_type)).slice(0, 6);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const borrowerName = `${record?.first_name ?? ""} ${record?.last_name ?? ""}`.trim() || "Borrower";

  // Multi-borrower
  const [borrowers, setBorrowers] = useState<DealBorrower[]>([]);
  const [selectedBorrower, setSelectedBorrower] = useState<string>("__primary__");
  const [allIncome, setAllIncome] = useState<IncomeCalc[]>([]);

  // Load lead_contacts (with contact info)
  useEffect(() => {
    if (!leadId) {
      setBorrowers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const list = await fetchDealBorrowers(leadId, borrowerName).catch(() => []);
      if (cancelled) return;
      setBorrowers(list);
      setSelectedBorrower((prev) => {
        if (prev && list.some((b) => (b.contactId ?? "__primary__") === prev)) return prev;
        return list[0]?.contactId ?? "__primary__";
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId, borrowerName]);

  const refreshIncome = async () => {
    if (!leadId) return;
    const all = await fetchAllLatestIncome(leadId).catch(() => []);
    setAllIncome(all);
  };

  useEffect(() => {
    if (!leadId) {
      setAllIncome([]);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      const all = await fetchAllLatestIncome(leadId).catch(() => []);
      if (cancelled) return;
      setAllIncome(all);
    };
    tick();
    const i = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, [leadId, incomeModalOpen]);

  const selectedBorrowerObj = borrowers.find((b) => (b.contactId ?? "__primary__") === selectedBorrower);
  const selectedContactId = selectedBorrowerObj?.contactId ?? null;
  // Do NOT fall back to the lead's own name — the lead may be a referrer/partner.
  const selectedName = selectedBorrowerObj?.name ?? borrowerName;
  const hasBorrowers = borrowers.length > 0;
  const income = useMemo(() => {
    const key = selectedBorrower === "__primary__" ? null : selectedBorrower;
    return allIncome.find((c) => (c.contact_id ?? null) === key) ?? null;
  }, [allIncome, selectedBorrower]);
  const incomeForBorrower = (borrower: DealBorrower) =>
    allIncome.find((c) => (c.contact_id ?? null) === (borrower.contactId ?? null)) ?? null;

  // Combined totals
  const totalMonthly = allIncome.reduce((s, c) => s + Number(c.monthly_income ?? 0), 0);
  const totalAnnual = allIncome.reduce((s, c) => s + Number(c.annual_income ?? 0), 0);

  // Live market rate
  const [marketRate, setMarketRate] = useState<MarketRate | null>(null);
  useEffect(() => {
    let cancelled = false;
    getCurrentRateMeta()
      .then((m) => { if (!cancelled) setMarketRate(m); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const nameForCalc = (c: IncomeCalc): string => {
    if (c.borrower_name) return c.borrower_name;
    const b = borrowers.find((x) => (x.contactId ?? null) === (c.contact_id ?? null));
    return b?.name ?? "Borrower";
  };

  const challenges: string[] = sentiment?.challenges ?? deriveChallenges(record);
  const positives: string[] = sentiment?.positives ?? derivePositives(record);
  const recommendations: string[] = sentiment?.recommendations ?? [];

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Inbound
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {emailLogs.slice(0, 3).map((l) => (
              <Row
                key={l.id}
                icon={<Mail className="h-3.5 w-3.5" />}
                label={l.subject || "Email"}
                sub={format(new Date(l.sent_at), "PPp")}
              />
            ))}
            {inbound.map((a) => (
              <Row
                key={a.id}
                icon={<FileText className="h-3.5 w-3.5" />}
                label={a.title}
                sub={format(new Date(a.created_at), "PPp")}
              />
            ))}
            {inbound.length === 0 && emailLogs.length === 0 && <Empty text="No inbound activity yet." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" /> Outbound
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {outbound.length === 0 && <Empty text="No outbound activity yet." />}
            {outbound.map((a) => (
              <Row
                key={a.id}
                icon={iconFor(a.activity_type)}
                label={a.title}
                sub={format(new Date(a.created_at), "PPp")}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Lead health & sentiment
          </CardTitle>
          {onRefreshSentiment && (
            <Button size="sm" variant="outline" onClick={onRefreshSentiment}>
              Refresh AI summary
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <SentimentGauge temperature={sentiment?.temperature} />
            {sentiment?.generated_at && (
              <span className="text-xs text-muted-foreground">
                Updated {format(new Date(sentiment.generated_at), "PPp")}
              </span>
            )}
          </div>
          {sentiment?.summary && <p className="text-sm">{sentiment.summary}</p>}
          {!sentiment && (
            <p className="text-sm text-muted-foreground">
              No AI summary yet — click "Refresh AI summary" to generate one.
            </p>
          )}

          {recommendations.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Recommended next actions
              </div>
              <ul className="list-disc list-inside text-sm space-y-1">
                {recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Challenges
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            {challenges.length === 0 ? (
              <Empty text="No challenges identified." />
            ) : (
              challenges.map((c, i) => (
                <Badge key={i} variant="outline" className="mr-1 mb-1 border-amber-300 bg-amber-50 text-amber-800">
                  {c}
                </Badge>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-emerald-600" /> Positive signals
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            {positives.length === 0 ? (
              <Empty text="No positive signals yet." />
            ) : (
              positives.map((c, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="mr-1 mb-1 border-emerald-300 bg-emerald-50 text-emerald-800"
                >
                  {c}
                </Badge>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mortgage snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {marketRate && (
            <div className="col-span-2 md:col-span-4 -mb-1 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold uppercase tracking-wide text-primary">Live Market Rate</span>
                <span className="text-muted-foreground">
                  30Y Fixed (incl. +0.125% buffer):{" "}
                  <span className="text-foreground font-semibold tabular-nums">
                    {marketRate.adjusted_rate.toFixed(3)}%
                  </span>
                </span>
              </div>
              <div className="text-muted-foreground">
                {marketRate.is_manual_override ? "Admin override" : `Source: ${marketRate.source}`} ·{" "}
                {format(new Date(marketRate.fetched_at), "MMM d, p")}
              </div>
            </div>
          )}
          {(() => {
            let mpExtras: any = {};
            try {
              mpExtras = mortgage?.notes ? JSON.parse(mortgage.notes) : {};
            } catch {}
            const loanType = (mpExtras.loan_type ?? "").toString().toLowerCase();
            const price = Number(mortgage?.purchase_price ?? record?.property_value ?? 0);
            const dp = Number(mortgage?.down_payment ?? 0);
            let total: number | null = null;
            if (price > 0) {
              if (loanType === "fha") total = price * 0.9825;
              else if (loanType === "usda") total = price / 0.99;
              else total = Math.max(0, price - dp);
            }
            const dpDisplay =
              loanType === "fha" ? "3.5%" : loanType === "usda" ? "0%" : fmtMoney(mortgage?.down_payment);
            const totalDisplay =
              total !== null
                ? new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(total)
                : "---";
            return (
              <>
                <Stat
                  label="Loan program"
                  value={formatOptionLabel(mortgage?.loan_program ?? record?.loan_purpose) || null}
                />
                <Stat
                  label="Loan type"
                  value={
                    loanType
                      ? ["fha", "va", "usda", "arm", "heloc"].includes(loanType)
                        ? loanType.toUpperCase()
                        : formatOptionLabel(loanType)
                      : null
                  }
                />
                <Stat label="Purchase price" value={fmtMoney(mortgage?.purchase_price ?? record?.property_value)} />
                <Stat label="Down payment" value={dpDisplay} />
                <Stat label="Total loan amount" value={totalDisplay} />
                <Stat
                  label="Estimated income"
                  value={
                    totalMonthly > 0
                      ? `${fmtMoney(totalMonthly, 0)}/mo`
                      : fmtMoney(mortgage?.est_income ?? record?.annual_income, 0)
                  }
                />
                <Stat
                  label="Monthly payment"
                  value={(() => {
                    const p = Number(mortgage?.purchase_price ?? record?.property_value ?? 0);
                    const d = Number(mortgage?.down_payment ?? 0);
                    if (p > 0 && marketRate) {
                      const res = estimatePayment({
                        price: p,
                        downPayment: d,
                        annualRatePct: marketRate.adjusted_rate,
                        loanType: loanType,
                      });
                      return fmtMoney(res.totalMonthly, 0);
                    }
                    return fmtMoney(mortgage?.est_monthly_payment, 0);
                  })()}
                />
                <Stat
                  label="Property type"
                  value={formatOptionLabel(mortgage?.property_type ?? record?.property_type) || null}
                />
                <Stat label="Occupancy" value={formatOptionLabel(mortgage?.occupancy_type) || null} />
                {!pipelineMode && marketRate && price > 0 && (() => {
                  const propertyValue = Number(record?.property_value ?? price) || price;
                  const loanAmount =
                    loanType === "fha" ? price * 0.9825
                    : loanType === "usda" ? price / 0.99
                    : Math.max(0, price - dp);
                  const liabilities = Number(
                    mpExtras.monthly_liabilities ??
                    (Number(mpExtras.car_payment ?? 0) +
                     Number(mpExtras.student_loans ?? 0) +
                     Number(mpExtras.credit_cards ?? 0) +
                     Number(mpExtras.personal_loans ?? 0) +
                     Number(mpExtras.child_support ?? 0) +
                     Number(mpExtras.alimony ?? 0) +
                     Number(mpExtras.other_debts ?? 0))
                  ) || 0;
                  const q = calcLeadQualification({
                    purchasePrice: price,
                    propertyValue,
                    downPayment: dp,
                    loanAmount,
                    loanType,
                    annualRatePct: marketRate.adjusted_rate,
                    annualPropertyTax: mpExtras.annual_property_tax,
                    annualInsurance: mpExtras.annual_insurance,
                    hoaMonthly: mpExtras.hoa_monthly,
                    floodInsuranceMonthly: mpExtras.flood_insurance_monthly,
                    pmiMonthlyOverride: mpExtras.pmi_monthly,
                    totalMonthlyIncome: totalMonthly,
                    monthlyLiabilities: liabilities,
                    creditScore: parseCreditScore(record?.credit_range),
                    incomeStabilityYears: mpExtras.income_stability_years,
                    reservesMonths: mpExtras.reserves_months,
                  });
                  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
                  const statusCls =
                    q.readinessStatus === "Excellent" ? "text-emerald-600"
                    : q.readinessStatus === "Strong" ? "text-emerald-700"
                    : q.readinessStatus === "Review" ? "text-amber-600"
                    : "text-rose-600";
                  return (
                    <>
                      <Stat label="Housing expense" value={fmtMoney(Math.round(q.housingExpense), 0)} />
                      <Stat label="Front-End DTI" value={totalMonthly > 0 ? pct(q.frontEndDTI) : null} />
                      <Stat label="Back-End DTI" value={totalMonthly > 0 ? pct(q.backEndDTI) : null} />
                      <Stat label="LTV" value={pct(q.ltv)} />
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Readiness score</div>
                        <div className="font-medium">
                          {q.readinessScore}
                          <span className={`ml-2 text-xs ${statusCls}`}>{q.readinessStatus}</span>
                        </div>
                      </div>
                      <div className="col-span-2 md:col-span-4 -mt-1 text-[11px] text-muted-foreground italic">
                        Pre-qualification estimates only. Once a loan is created in ARIVE LOS, Pipeline values will be the source of truth.
                      </div>
                    </>
                  );
                })()}
              </>
            );
          })()}
        </CardContent>
      </Card>

      {!hideIncomeAnalysis && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Income Analysis
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {leadId
                    ? "Classify the borrower as Employee or Self-Employed and build P&L, Balance Sheet, and Cash Flow statements."
                    : "Open a lead workspace to use Income Analysis."}
                </p>
              </div>
              {leadId && (
                <Button size="sm" variant="outline" onClick={() => setIncomeModalOpen(true)} className="gap-2 shrink-0">
                  <Calculator className="h-4 w-4" /> Borrower Income Classification
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {leadId && borrowers.length > 0 && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Borrowers
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {borrowers.map((b) => {
                    const val = b.contactId ?? "__primary__";
                    const active = selectedBorrower === val;
                    const roleLabel = b.isPrimary
                      ? "Primary"
                      : b.role && b.role !== "co_borrower"
                        ? b.role.replace(/_/g, " ")
                        : "Co-Borrower";
                    const base = "text-xs h-7 px-3 rounded-full border transition-colors cursor-pointer";
                    const cls = b.isPrimary
                      ? active
                        ? "bg-[#F97316] text-white border-[#F97316] hover:bg-[#F97316]/90"
                        : "border-[#F97316]/40 text-[#F97316] bg-[#F97316]/10 hover:bg-[#F97316]/20"
                      : active
                        ? "bg-secondary text-secondary-foreground border-foreground/30"
                        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted";
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSelectedBorrower(val)}
                        className={`${base} ${cls} capitalize`}
                        aria-pressed={active}
                      >
                        {b.name} <span className="opacity-80">({roleLabel})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {leadId && (
              <div className={`grid gap-4 min-w-0 ${borrowers.length > 1 ? "lg:grid-cols-2" : "grid-cols-1"}`}>
                <div className="rounded-xl bg-muted/40 border border-border p-4 min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 truncate">
                    {selectedName}
                  </div>
                  <div className="divide-y divide-border/60">
                    <div className="flex items-center justify-between py-2 text-sm">
                      <span className="text-muted-foreground">Monthly income</span>
                      <span className="font-medium tabular-nums">{fmtIncome(income?.monthly_income)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 text-sm">
                      <span className="text-muted-foreground">Annual income</span>
                      <span className="font-medium tabular-nums">{fmtIncome(income?.annual_income)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 text-sm">
                      <span className="text-muted-foreground">Years average</span>
                      <span className="font-medium tabular-nums">{fmtIncome((income as any)?.years_average)}</span>
                    </div>
                  </div>
                </div>

                {borrowers.length > 1 && (
                  <div className="rounded-xl border border-border overflow-hidden min-w-0">
                    <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Borrower Income Summary
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="px-4 py-2 font-medium">Borrower</th>
                            <th className="px-4 py-2 font-medium text-right">Monthly</th>
                            <th className="px-4 py-2 font-medium text-right">Annual</th>
                            <th className="px-4 py-2 font-medium text-right">Years Avg</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {borrowers.map((b) => {
                            const c = incomeForBorrower(b);
                            return (
                              <tr key={b.contactId ?? "__primary__"}>
                                <td className="px-4 py-2 truncate">{c ? nameForCalc(c) : b.name}</td>
                                <td className="px-4 py-2 text-right tabular-nums">{fmtIncome(c?.monthly_income)}</td>
                                <td className="px-4 py-2 text-right tabular-nums">{fmtIncome(c?.annual_income)}</td>
                                <td className="px-4 py-2 text-right tabular-nums">
                                  {fmtIncome((c as any)?.years_average)}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="border-t-2 font-semibold bg-muted/30">
                            <td className="px-4 py-2">Total</td>
                            <td className="px-4 py-2 text-right tabular-nums">{fmtIncome(totalMonthly)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{fmtIncome(totalAnnual)}</td>
                            <td className="px-4 py-2 text-right text-muted-foreground">—</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {leadId && (
              <div className="min-w-0">
                <IncomeAiAnalysis
                  leadId={leadId}
                  audience="admin"
                  wide
                  refreshKey={allIncome.map((c) => c.id).join("|") || "none"}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Sheet open={incomeModalOpen} onOpenChange={setIncomeModalOpen}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" /> Borrower Income Classification
            </SheetTitle>
            <SheetDescription>
              {selectedName} — categorize income, enter financials, and generate statements.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            {leadId && (
              <>
                {borrowers.length > 1 && (
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground mr-1">Borrower:</span>
                    {borrowers.map((b) => {
                      const val = b.contactId ?? "__primary__";
                      const active = selectedBorrower === val;
                      const roleLabel = b.isPrimary
                        ? "Primary"
                        : b.role && b.role !== "co_borrower"
                          ? b.role.replace(/_/g, " ")
                          : "Co-Borrower";
                      const base = "text-xs h-7 px-2.5 rounded-full border transition-colors cursor-pointer";
                      const cls = b.isPrimary
                        ? active
                          ? "bg-[#F97316] text-white border-[#F97316] hover:bg-[#F97316]/90"
                          : "border-[#F97316]/40 text-[#F97316] bg-[#F97316]/10 hover:bg-[#F97316]/20"
                        : active
                          ? "bg-secondary text-secondary-foreground border-foreground/30"
                          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted";
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setSelectedBorrower(val)}
                          className={`${base} ${cls} capitalize`}
                          aria-pressed={active}
                        >
                          {b.name} <span className="opacity-80">({roleLabel})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <FinancialWorkspace
                  key={selectedContactId ?? "__primary__"}
                  leadId={leadId}
                  contactId={selectedContactId}
                  borrowerName={selectedName}
                />
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ icon, label, sub }: { icon: any; label: string; sub: string }) {
  return (
    <div className="flex items-start gap-2 border-b last:border-0 pb-1.5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="truncate">{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 first:pt-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function fmtIncome(n: number | null | undefined) {
  return n == null ? "—" : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
function Stat({ label, value }: { label: string; value?: any }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{value || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}
function fmtMoney(v: any, maxFractionDigits?: number) {
  if (!v) return null;
  const opts: Intl.NumberFormatOptions = {};
  if (maxFractionDigits !== undefined) opts.maximumFractionDigits = maxFractionDigits;
  return `$${Number(v).toLocaleString(undefined, opts)}`;
}
function iconFor(type: string) {
  if (type === "email") return <Mail className="h-3.5 w-3.5" />;
  if (type === "call") return <Phone className="h-3.5 w-3.5" />;
  if (type === "task") return <CheckSquare className="h-3.5 w-3.5" />;
  if (type === "meeting") return <CalendarDays className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
}
function deriveChallenges(r: any): string[] {
  const out: string[] = [];
  if (r?.credit_range && /<\s*620|under|low/i.test(r.credit_range)) out.push("Low credit range");
  if (!r?.email) out.push("Missing email");
  if (!r?.phone) out.push("Missing phone");
  if (r?.is_stuck) out.push("Stuck > 72h");
  return out;
}
function derivePositives(r: any): string[] {
  const out: string[] = [];
  if ((r?.lead_score ?? 0) >= 60) out.push("High lead score");
  if (r?.annual_income && r.annual_income > 100000) out.push("Strong income");
  if (r?.credit_range && /740|750|excellent|Excellent|strong/i.test(r.credit_range)) out.push("Strong credit");
  return out;
}
