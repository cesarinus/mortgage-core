import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Calculator, DollarSign, Save } from "lucide-react";
import { fetchLatestIncome, IncomeCalc } from "@/lib/crm/income";
import {
  PaymentDetails,
  calculateIncomeFromInputs,
  fetchPaymentDetails,
  savePaymentDetails,
} from "@/lib/crm/paymentDetails";

interface Props {
  leadId?: string;
  editable?: boolean;
  /** Hides the borrower-type selector (use when embedded inside an existing classification UI). */
  hideClassification?: boolean;
  /** Hides the wrapping Card chrome (use when embedded inside another card/section). */
  compact?: boolean;
}

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/** Corrected current-year-fraction: preceding_months + day / days_in_month. */
function computeYearFraction(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return d.getMonth() + d.getDate() / dim;
}

const empty = (leadId: string): PaymentDetails => ({
  lead_id: leadId,
  borrower_type: "employed",
  pay_period_type: "biweekly",
  pay_stub_ending_date: null,
  pay_stub_period_days: 14,
  pay_stub_gross_base: 0,
  pay_stub_overtime: 0,
  pay_stub_bonus: 0,
  pay_stub_commission: 0,
  w2_year_1: new Date().getFullYear() - 1,
  w2_year_1_wages: 0,
  w2_year_2: new Date().getFullYear() - 2,
  w2_year_2_wages: 0,
  ytd_total: 0,
  ytd_as_of_date: null,
  se_avg_monthly_net: 0,
});

export function IncomeCard({ leadId, editable = true, hideClassification = false, compact = false }: Props) {
  const [latest, setLatest] = useState<IncomeCalc | null>(null);
  const [form, setForm] = useState<PaymentDetails>(empty(leadId ?? ""));
  const [busy, setBusy] = useState<null | "save" | "calc">(null);

  const load = useCallback(async () => {
    if (!leadId) return;
    const [pd, calc] = await Promise.all([
      fetchPaymentDetails(leadId).catch(() => null),
      fetchLatestIncome(leadId).catch(() => null),
    ]);
    setForm(pd ? { ...empty(leadId), ...pd } : empty(leadId));
    setLatest(calc);
  }, [leadId]);

  useEffect(() => { load(); }, [load]);

  const setNum = (k: keyof PaymentDetails) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value === "" ? 0 : Number(e.target.value);
    if (Number.isNaN(v)) return;
    setForm((f) => ({ ...f, [k]: v as any }));
  };
  const setVal = (k: keyof PaymentDetails, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const isSE = form.borrower_type === "self_employed";

  const save = async () => {
    if (!leadId) return;
    setBusy("save");
    const t = toast.loading("saving inputs…");
    try {
      await savePaymentDetails({ ...form, lead_id: leadId });
      toast.success("income inputs saved", { id: t });
    } catch (e: any) {
      toast.error(e?.message ?? "save failed", { id: t });
    } finally { setBusy(null); }
  };

  const calc = async () => {
    if (!leadId) return;
    setBusy("calc");
    const t = toast.loading("calculating income…");
    try {
      await savePaymentDetails({ ...form, lead_id: leadId });
      const res = await calculateIncomeFromInputs(leadId);
      setLatest(res.calculation ?? null);
      toast.success("income calculated", { id: t });
    } catch (e: any) {
      toast.error(e?.message ?? "calculation failed", { id: t });
    } finally { setBusy(null); }
  };

  if (!leadId) return null;

  const disabled = !editable || isSE;

  const body = (
    <div className="space-y-4">
      {!hideClassification && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Borrower Income Classification</Label>
            <Select
              value={form.borrower_type}
              onValueChange={(v) => setVal("borrower_type", v)}
              disabled={!editable}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employed">Employee</SelectItem>
                <SelectItem value="self_employed">Self-Employed</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Employee borrowers use standard W-2 income fields. Switch to Self-Employed to enable P&amp;L,
              Balance Sheet, and Cash Flow analysis.
            </p>
          </div>

          {isSE && (
            <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-2 text-[11px] text-muted-foreground">
              self-employed financial analysis coming soon — p&amp;l, balance sheet, cash flow.
            </div>
          )}

          <Separator />
        </>
      )}

      <div className="space-y-2">
        <Label className="text-xs font-medium">Current pay stub</Label>
        <div className="grid grid-cols-2 gap-2">
          <FieldNum label="Base" value={form.pay_stub_gross_base} onChange={setNum("pay_stub_gross_base")} disabled={disabled} />
          <FieldNum label="Overtime" value={form.pay_stub_overtime} onChange={setNum("pay_stub_overtime")} disabled={disabled} />
          <FieldNum label="Bonus" value={form.pay_stub_bonus} onChange={setNum("pay_stub_bonus")} disabled={disabled} />
          <FieldNum label="Commission" value={form.pay_stub_commission} onChange={setNum("pay_stub_commission")} disabled={disabled} />
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Pay stub ending</Label>
            <Input
              type="date"
              disabled={disabled}
              value={form.pay_stub_ending_date ?? ""}
              onChange={(e) => setVal("pay_stub_ending_date", e.target.value || null)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Period fraction (auto)</Label>
            <Input
              type="text"
              readOnly
              value={(() => {
                const f = computeYearFraction(form.pay_stub_ending_date);
                return f == null ? "—" : f.toFixed(2);
              })()}
              className="h-8 text-xs bg-muted/40"
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs font-medium">W-2 / YTD (years average)</Label>
        <div className="grid grid-cols-2 gap-2">
          <FieldNum label="W-2 Yr 1" value={form.w2_year_1 ?? 0} onChange={setNum("w2_year_1")} disabled={disabled} />
          <FieldNum label="Yr 1 wages" value={form.w2_year_1_wages} onChange={setNum("w2_year_1_wages")} disabled={disabled} />
          <FieldNum label="W-2 Yr 2" value={form.w2_year_2 ?? 0} onChange={setNum("w2_year_2")} disabled={disabled} />
          <FieldNum label="Yr 2 wages" value={form.w2_year_2_wages} onChange={setNum("w2_year_2_wages")} disabled={disabled} />
          <FieldNum label="YTD total" value={form.ytd_total} onChange={setNum("ytd_total")} disabled={disabled} />
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">YTD as-of</Label>
            <Input
              type="date"
              disabled={disabled}
              value={form.ytd_as_of_date ?? ""}
              onChange={(e) => setVal("ytd_as_of_date", e.target.value || null)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="rounded-md bg-muted/40 p-2 text-xs space-y-1">
        <Row label="Monthly income" value={fmt(latest?.monthly_income)} />
        <Row label="Annual income" value={fmt(latest?.annual_income)} />
        <Row label="Years average" value={fmt((latest as any)?.years_average)} />
      </div>

      {editable && (
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={save} disabled={busy !== null}>
            <Save className="h-3.5 w-3.5 mr-1" /> {busy === "save" ? "saving…" : "save"}
          </Button>
          <Button size="sm" onClick={calc} disabled={busy !== null}>
            <Calculator className="h-3.5 w-3.5 mr-1" /> {busy === "calc" ? "calculating…" : "calculate"}
          </Button>
        </div>
      )}
    </div>
  );

  if (compact) return body;

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4" /> Income Analysis
          <Badge variant="outline" className="ml-auto text-[10px] capitalize">
            {latest?.source ?? "manual"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

function FieldNum({ label, value, onChange, disabled }: {
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        disabled={disabled}
        value={String(value ?? 0)}
        onChange={onChange}
        className="h-8 text-xs"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}