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
  /** When true, hides the borrower type selector (used when embedded inside an existing classification UI). */
  hideClassification?: boolean;
}

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

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

export function IncomeCard({ leadId, editable = true, borrowerName }: Props) {
  const [latest, setLatest] = useState<IncomeCalc | null>(null);
  const [form, setForm] = useState<PaymentDetails>(empty(leadId ?? ""));
  const [busy, setBusy] = useState<null | "save" | "calc">(null);
  const [open, setOpen] = useState(false);

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
    const t = toast.loading("Saving inputs…");
    try {
      await savePaymentDetails({ ...form, lead_id: leadId });
      toast.success("Income inputs saved", { id: t });
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed", { id: t });
    } finally { setBusy(null); }
  };

  const calc = async () => {
    if (!leadId) return;
    setBusy("calc");
    const t = toast.loading("Calculating income…");
    try {
      await savePaymentDetails({ ...form, lead_id: leadId });
      const res = await calculateIncomeFromInputs(leadId);
      setLatest(res.calculation ?? null);
      toast.success("Income calculated", { id: t });
    } catch (e: any) {
      toast.error(e?.message ?? "Calculation failed", { id: t });
    } finally { setBusy(null); }
  };

  if (!leadId) return null;

  const hasCalc = latest?.monthly_income != null || latest?.annual_income != null;

  return (
    <>
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Income Analysis
            <Badge variant="outline" className="ml-auto text-[10px] capitalize">
              {latest?.source ?? "manual"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between h-9 text-xs"
            onClick={() => setOpen(true)}
            disabled={!editable}
          >
            <span>Borrower Income Classification</span>
            <span className="capitalize text-muted-foreground">
              {form.borrower_type === "self_employed" ? "self-employed" : "employee"}
            </span>
          </Button>

          <div className="rounded-md bg-muted/40 p-2 text-xs space-y-1">
            {hasCalc ? (
              <>
                <Row label="Monthly" value={fmt(latest?.monthly_income)} />
                <Row label="Annual" value={fmt(latest?.annual_income)} />
                <Row label="Years average" value={fmt((latest as any)?.years_average)} />
              </>
            ) : (
              <div className="text-muted-foreground text-center py-1">not calculated</div>
            )}
          </div>

          {editable && (
            <Button size="sm" variant="ghost" className="w-full h-8 text-xs" onClick={() => setOpen(true)}>
              <Pencil className="h-3 w-3 mr-1" /> {hasCalc ? "update" : "edit"}
            </Button>
          )}
        </CardContent>
      </Card>

      <ClassificationModal
        open={open}
        onOpenChange={setOpen}
        borrowerName={borrowerName}
        form={form}
        setForm={setForm}
        setVal={setVal}
        setNum={setNum}
        latest={latest}
        busy={busy}
        editable={editable}
        onSave={save}
        onCalc={calc}
      />
    </>
  );
}

function ClassificationModal({
  open, onOpenChange, borrowerName, form, setForm, setVal, setNum, latest, busy, editable, onSave, onCalc,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  borrowerName?: string;
  form: PaymentDetails;
  setForm: React.Dispatch<React.SetStateAction<PaymentDetails>>;
  setVal: (k: keyof PaymentDetails, v: any) => void;
  setNum: (k: keyof PaymentDetails) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  latest: IncomeCalc | null;
  busy: null | "save" | "calc";
  editable: boolean;
  onSave: () => void;
  onCalc: () => void;
}) {
  const tab = form.borrower_type === "self_employed" ? "self_employed" : "employed";
  const setTab = (v: string) => setVal("borrower_type", v);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Borrower Income Classification{borrowerName ? ` — ${borrowerName}` : ""}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Employee borrowers use standard W-2 income fields. Switch to Self-Employed to enable P&amp;L,
            Balance Sheet, and Cash Flow analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Borrower type</Label>
          <Select value={form.borrower_type} onValueChange={(v) => setVal("borrower_type", v)} disabled={!editable}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="employed">Employee</SelectItem>
              <SelectItem value="self_employed">Self-Employed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="employed">Employee</TabsTrigger>
            <TabsTrigger value="self_employed">Self-Employed</TabsTrigger>
          </TabsList>

          <TabsContent value="employed" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Current pay stub</Label>
              <div className="grid grid-cols-2 gap-3">
                <FieldNum label="Base" value={form.pay_stub_gross_base} onChange={setNum("pay_stub_gross_base")} disabled={!editable} />
                <FieldNum label="Overtime" value={form.pay_stub_overtime} onChange={setNum("pay_stub_overtime")} disabled={!editable} />
                <FieldNum label="Bonus" value={form.pay_stub_bonus} onChange={setNum("pay_stub_bonus")} disabled={!editable} />
                <FieldNum label="Commission" value={form.pay_stub_commission} onChange={setNum("pay_stub_commission")} disabled={!editable} />
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Pay stub ending</Label>
                  <Input
                    type="date"
                    disabled={!editable}
                    value={form.pay_stub_ending_date ?? ""}
                    onChange={(e) => setVal("pay_stub_ending_date", e.target.value || null)}
                    className="h-9 text-xs"
                  />
                </div>
                <FieldNum label="Period days" value={form.pay_stub_period_days ?? 0} onChange={setNum("pay_stub_period_days")} disabled={!editable} />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs font-medium">W-2 / YTD (years average)</Label>
              <div className="grid grid-cols-2 gap-3">
                <FieldNum label="W-2 Yr 1" value={form.w2_year_1 ?? 0} onChange={setNum("w2_year_1")} disabled={!editable} />
                <FieldNum label="Yr 1 wages" value={form.w2_year_1_wages} onChange={setNum("w2_year_1_wages")} disabled={!editable} />
                <FieldNum label="W-2 Yr 2" value={form.w2_year_2 ?? 0} onChange={setNum("w2_year_2")} disabled={!editable} />
                <FieldNum label="Yr 2 wages" value={form.w2_year_2_wages} onChange={setNum("w2_year_2_wages")} disabled={!editable} />
                <FieldNum label="YTD total" value={form.ytd_total} onChange={setNum("ytd_total")} disabled={!editable} />
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">YTD as-of</Label>
                  <Input
                    type="date"
                    disabled={!editable}
                    value={form.ytd_as_of_date ?? ""}
                    onChange={(e) => setVal("ytd_as_of_date", e.target.value || null)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
              <Row label="Monthly income" value={fmt(latest?.monthly_income)} />
              <Row label="Annual income" value={fmt(latest?.annual_income)} />
              <Row label="Years average" value={fmt((latest as any)?.years_average)} />
            </div>

            {editable && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={onSave} disabled={busy !== null}>
                  <Save className="h-4 w-4 mr-1" /> {busy === "save" ? "saving…" : "save"}
                </Button>
                <Button onClick={onCalc} disabled={busy !== null}>
                  <Calculator className="h-4 w-4 mr-1" /> {busy === "calc" ? "calculating…" : "calculate"}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="self_employed" className="space-y-4 mt-4">
            <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-xs text-muted-foreground">
              self-employed financial analysis coming soon — p&amp;l, balance sheet, cash flow.
            </div>
            <div className="grid grid-cols-2 gap-3 opacity-60">
              <FieldNum label="Avg monthly net" value={form.se_avg_monthly_net} onChange={setNum("se_avg_monthly_net")} disabled />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
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