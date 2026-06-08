import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { BarChart3, Calculator } from "lucide-react";
import { fetchAllLatestIncome, type IncomeCalc } from "@/lib/crm/income";
import { fetchDealBorrowers, type DealBorrower } from "@/lib/crm/borrowers";
import { IncomeAiAnalysis } from "@/components/crm/IncomeAiAnalysis";
import FinancialWorkspace from "@/components/crm/finance/FinancialWorkspace";

interface Props {
  leadId?: string;
  contactId?: string;
  record: any;
}

function fmtIncome(n: number | null | undefined) {
  return n == null ? "—" : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function IncomeAnalysisCard({ leadId, contactId, record }: Props) {
  const borrowerName = `${record?.first_name ?? ""} ${record?.last_name ?? ""}`.trim() || "Borrower";
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [borrowers, setBorrowers] = useState<DealBorrower[]>([]);
  const [selectedBorrower, setSelectedBorrower] = useState<string>("__primary__");
  const [allIncome, setAllIncome] = useState<IncomeCalc[]>([]);

  useEffect(() => {
    if (!leadId) { setBorrowers([]); return; }
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
    return () => { cancelled = true; };
  }, [leadId, borrowerName]);

  useEffect(() => {
    if (!leadId) { setAllIncome([]); return; }
    let cancelled = false;
    const tick = async () => {
      const all = await fetchAllLatestIncome(leadId).catch(() => []);
      if (cancelled) return;
      setAllIncome(all);
    };
    tick();
    const i = setInterval(tick, 5000);
    return () => { cancelled = true; clearInterval(i); };
  }, [leadId, incomeModalOpen]);

  const selectedBorrowerObj = borrowers.find((b) => (b.contactId ?? "__primary__") === selectedBorrower);
  const selectedContactId = selectedBorrowerObj?.contactId ?? null;
  const selectedName = selectedBorrowerObj?.name ?? borrowerName;
  const income = useMemo(() => {
    const key = selectedBorrower === "__primary__" ? null : selectedBorrower;
    return allIncome.find((c) => (c.contact_id ?? null) === key) ?? null;
  }, [allIncome, selectedBorrower]);
  const incomeForBorrower = (borrower: DealBorrower) =>
    allIncome.find((c) => (c.contact_id ?? null) === (borrower.contactId ?? null)) ?? null;
  const totalMonthly = allIncome.reduce((s, c) => s + Number(c.monthly_income ?? 0), 0);
  const totalAnnual = allIncome.reduce((s, c) => s + Number(c.annual_income ?? 0), 0);
  const nameForCalc = (c: IncomeCalc): string => {
    if (c.borrower_name) return c.borrower_name;
    const b = borrowers.find((x) => (x.contactId ?? null) === (c.contact_id ?? null));
    return b?.name ?? "Borrower";
  };

  return (
    <>
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
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Borrowers</div>
              <div className="flex flex-wrap items-center gap-2">
                {borrowers.map((b) => {
                  const val = b.contactId ?? "__primary__";
                  const active = selectedBorrower === val;
                  const roleLabel = b.isPrimary
                    ? "Primary"
                    : (b.role && b.role !== "co_borrower" ? b.role.replace(/_/g, " ") : "Co-Borrower");
                  const base = "text-xs h-7 px-3 rounded-full border transition-colors cursor-pointer";
                  const cls = b.isPrimary
                    ? (active
                        ? "bg-[#F97316] text-white border-[#F97316] hover:bg-[#F97316]/90"
                        : "border-[#F97316]/40 text-[#F97316] bg-[#F97316]/10 hover:bg-[#F97316]/20")
                    : (active
                        ? "bg-secondary text-secondary-foreground border-foreground/30"
                        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted");
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
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Borrower Income Summary</div>
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
                              <td className="px-4 py-2 text-right tabular-nums">{fmtIncome((c as any)?.years_average)}</td>
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
                        : (b.role && b.role !== "co_borrower" ? b.role.replace(/_/g, " ") : "Co-Borrower");
                      const base = "text-xs h-7 px-2.5 rounded-full border transition-colors cursor-pointer";
                      const cls = b.isPrimary
                        ? (active
                            ? "bg-[#F97316] text-white border-[#F97316] hover:bg-[#F97316]/90"
                            : "border-[#F97316]/40 text-[#F97316] bg-[#F97316]/10 hover:bg-[#F97316]/20")
                        : (active
                            ? "bg-secondary text-secondary-foreground border-foreground/30"
                            : "border-border bg-muted/40 text-muted-foreground hover:bg-muted");
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
    </>
  );
}