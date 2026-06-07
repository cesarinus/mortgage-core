import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePortalBinding } from "@/hooks/usePortalBinding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, DollarSign } from "lucide-react";
import { fetchLatestIncome, type IncomeCalc } from "@/lib/crm/income";
import { fetchPaymentDetails, type PaymentDetails } from "@/lib/crm/paymentDetails";
import { IncomeAiAnalysis } from "@/components/crm/IncomeAiAnalysis";

const fmtMoney = (n: number | null | undefined) =>
  n == null || Number.isNaN(Number(n))
    ? "—"
    : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const fmtDate = (s: string | null | undefined) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
};

function computeYearFraction(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return d.getMonth() + d.getDate() / dim;
}

export default function PortalIncome() {
  const { binding, loading } = usePortalBinding();
  const [calc, setCalc] = useState<IncomeCalc | null>(null);
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!binding?.lead_id) return;
      const contactId = binding.contact_id ?? null;
      const [c, d] = await Promise.all([
        fetchLatestIncome(binding.lead_id, contactId).catch(() => null),
        fetchPaymentDetails(binding.lead_id, contactId).catch(() => null),
      ]);
      if (cancelled) return;
      setCalc(c);
      setDetails(d);
      setFetched(true);
    })();
    return () => { cancelled = true; };
  }, [binding?.lead_id]);

  if (loading) return null;

  if (!binding?.lead_id) {
    return (
      <Card><CardContent className="p-6 text-sm text-muted-foreground">
        Income information will be available once your loan is set up.
      </CardContent></Card>
    );
  }

  const borrowerType = (details?.borrower_type ?? calc?.borrower_type ?? "employed") as string;
  const isSE = borrowerType === "self_employed";
  const hasVariable =
    Number(details?.pay_stub_overtime ?? 0) > 0 ||
    Number(details?.pay_stub_bonus ?? 0) > 0 ||
    Number(details?.pay_stub_commission ?? 0) > 0;
  const periodFraction = computeYearFraction(details?.pay_stub_ending_date);

  return (
    <div className="space-y-6">
      {/* breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/portal" className="hover:text-foreground">Overview</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Income</span>
      </nav>

      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Income Information</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSE
              ? "self-employed analysis in progress — p&l, balance sheet, and cash flow will be available soon."
              : "your income has been calculated by your loan officer."}
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-[#F97316]/40 bg-[#F97316]/10 text-[#9a4a10] capitalize"
        >
          {isSE ? "self-employed" : "employee"}
        </Badge>
      </header>

      {!fetched ? null : !calc && !details ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            income calculation pending — your loan officer will complete this shortly.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Highlighted results */}
          <div className="grid gap-3 sm:grid-cols-3">
            <ResultCard label="monthly income" value={fmtMoney(calc?.monthly_income)} />
            <ResultCard label="annual income" value={fmtMoney(calc?.annual_income)} />
            {hasVariable && (
              <ResultCard
                label="years average"
                value={fmtMoney((calc as any)?.years_average)}
              />
            )}
          </div>

          {/* Pay stub details */}
          {details && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#F97316]" /> Current pay stub
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <ReadField label="base" value={fmtMoney(details.pay_stub_gross_base)} />
                  <ReadField label="overtime" value={fmtMoney(details.pay_stub_overtime)} />
                  <ReadField label="bonus" value={fmtMoney(details.pay_stub_bonus)} />
                  <ReadField label="commission" value={fmtMoney(details.pay_stub_commission)} />
                  <ReadField label="pay stub ending" value={fmtDate(details.pay_stub_ending_date)} />
                  <ReadField
                    label="period days"
                    value={periodFraction == null ? "—" : periodFraction.toFixed(2)}
                  />
                </div>

                <Separator />

                <div className="text-xs font-medium text-muted-foreground">W-2 / YTD</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <ReadField
                    label={`W-2 year 1${details.w2_year_1 ? ` — ${details.w2_year_1}` : ""}`}
                    value={fmtMoney(details.w2_year_1_wages)}
                  />
                  <ReadField
                    label={`W-2 year 2${details.w2_year_2 ? ` — ${details.w2_year_2}` : ""}`}
                    value={fmtMoney(details.w2_year_2_wages)}
                  />
                  <ReadField
                    label={`ytd total (as of ${fmtDate(details.ytd_as_of_date)})`}
                    value={fmtMoney(details.ytd_total)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <IncomeAiAnalysis leadId={binding.lead_id} audience="borrower" refreshKey={calc?.id ?? "none"} />
        </>
      )}
    </div>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground lowercase">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[#F97316] tabular-nums">{value}</div>
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-2.5">
      <div className="text-[11px] text-muted-foreground lowercase">{label}</div>
      <div className="text-sm font-medium tabular-nums mt-0.5">{value}</div>
    </div>
  );
}