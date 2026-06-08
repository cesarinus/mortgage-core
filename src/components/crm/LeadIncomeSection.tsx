import { useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { fetchDealBorrowers, type DealBorrower } from "@/lib/crm/borrowers";
import { fetchAllLatestIncome, type IncomeCalc } from "@/lib/crm/income";
import { IncomeAiAnalysis } from "@/components/crm/IncomeAiAnalysis";

const fmt = (n: number | null | undefined) =>
  n == null || Number(n) === 0
    ? "—"
    : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

interface Props {
  leadId: string;
  fallbackName?: string;
}

/**
 * Compact, expanded Income Analysis surface used in the Leads side panel.
 * Mirrors the Deal workspace card but optimized for narrower containers
 * (no horizontal overflow; AI tabs scroll horizontally instead of bleeding).
 */
export function LeadIncomeSection({ leadId, fallbackName = "Borrower" }: Props) {
  const [borrowers, setBorrowers] = useState<DealBorrower[]>([]);
  const [selected, setSelected] = useState<string>("__primary__");
  const [allIncome, setAllIncome] = useState<IncomeCalc[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fetchDealBorrowers(leadId, fallbackName).catch(() => []);
      if (cancelled) return;
      setBorrowers(list);
      setSelected((prev) =>
        list.some((b) => (b.contactId ?? "__primary__") === prev)
          ? prev
          : list[0]?.contactId ?? "__primary__",
      );
    })();
    return () => { cancelled = true; };
  }, [leadId, fallbackName]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const rows = await fetchAllLatestIncome(leadId).catch(() => []);
      if (!cancelled) setAllIncome(rows);
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => { cancelled = true; clearInterval(id); };
  }, [leadId]);

  const selectedObj = borrowers.find((b) => (b.contactId ?? "__primary__") === selected);
  const selectedName = selectedObj?.name ?? fallbackName;
  const income = useMemo(() => {
    const key = selected === "__primary__" ? null : selected;
    return allIncome.find((c) => (c.contact_id ?? null) === key) ?? null;
  }, [allIncome, selected]);
  const incomeForBorrower = (b: DealBorrower) =>
    allIncome.find((c) => (c.contact_id ?? null) === (b.contactId ?? null)) ?? null;
  const totalMonthly = allIncome.reduce((s, c) => s + Number(c.monthly_income ?? 0), 0);
  const totalAnnual = allIncome.reduce((s, c) => s + Number(c.annual_income ?? 0), 0);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <BarChart3 className="h-4 w-4" /> Income Analysis
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Borrower income summary &amp; AI analysis.
        </p>
      </div>

      <div className="p-4 space-y-4 min-w-0">
        {borrowers.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Borrowers</div>
            <div className="flex flex-wrap gap-1.5">
              {borrowers.map((b) => {
                const val = b.contactId ?? "__primary__";
                const active = selected === val;
                const roleLabel = b.isPrimary
                  ? "Primary"
                  : (b.role && b.role !== "co_borrower" ? b.role.replace(/_/g, " ") : "Co-Borrower");
                const base = "text-[11px] h-6 px-2.5 rounded-full border transition-colors cursor-pointer";
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
                    onClick={() => setSelected(val)}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:items-stretch min-w-0">
          <div className="space-y-3 min-w-0 flex flex-col">
            <div className="rounded-lg bg-muted/40 border border-border p-3 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 truncate">
                {selectedName}
              </div>
              <div className="divide-y divide-border/60">
                <div className="flex items-center justify-between py-1.5 text-xs">
                  <span className="text-muted-foreground">Monthly income</span>
                  <span className="font-medium tabular-nums">{fmt(income?.monthly_income)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 text-xs">
                  <span className="text-muted-foreground">Annual income</span>
                  <span className="font-medium tabular-nums">{fmt(income?.annual_income)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 text-xs">
                  <span className="text-muted-foreground">Years average</span>
                  <span className="font-medium tabular-nums">{fmt((income as any)?.years_average)}</span>
                </div>
              </div>
            </div>

            {borrowers.length > 1 && (
              <div className="rounded-lg border border-border overflow-hidden min-w-0 flex-1">
                <div className="px-3 py-2 bg-muted/40 border-b border-border">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Borrower Income Summary</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="px-3 py-1.5 font-medium">Borrower</th>
                        <th className="px-3 py-1.5 font-medium text-right">Monthly</th>
                        <th className="px-3 py-1.5 font-medium text-right">Annual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {borrowers.map((b) => {
                        const c = incomeForBorrower(b);
                        return (
                          <tr key={b.contactId ?? "__primary__"}>
                            <td className="px-3 py-1.5 truncate">{b.name}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{fmt(c?.monthly_income)}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{fmt(c?.annual_income)}</td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 font-semibold bg-muted/30">
                        <td className="px-3 py-1.5">Total</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fmt(totalMonthly)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fmt(totalAnnual)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0 flex flex-col [&>*]:h-full">
            <IncomeAiAnalysis
              leadId={leadId}
              audience="admin"
              wide
              refreshKey={allIncome.map((c) => c.id).join("|") || "none"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}