import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DollarSign } from "lucide-react";
import {
  IncomeCalc,
  IncomeInput,
  computeMonthly,
  fetchLatestIncome,
  saveIncome,
} from "@/lib/crm/income";

interface Props {
  leadId?: string;
  editable?: boolean;
}

const FIELDS: { key: keyof IncomeInput; label: string }[] = [
  { key: "base_income", label: "Base income" },
  { key: "overtime", label: "Overtime" },
  { key: "bonus", label: "Bonus" },
  { key: "commission", label: "Commission" },
  { key: "self_employment_income", label: "Self-employment" },
  { key: "other_income", label: "Other" },
];

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function IncomeCard({ leadId, editable = true }: Props) {
  const [latest, setLatest] = useState<IncomeCalc | null>(null);
  const [form, setForm] = useState<IncomeInput>({
    lead_id: leadId ?? "",
    borrower_type: "employed",
    base_income: 0, overtime: 0, bonus: 0, commission: 0, self_employment_income: 0, other_income: 0,
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!leadId) return;
    const r = await fetchLatestIncome(leadId).catch(() => null);
    setLatest(r);
    setForm({
      lead_id: leadId,
      borrower_type: (r?.borrower_type as any) ?? "employed",
      base_income: Number(r?.base_income ?? 0),
      overtime: Number(r?.overtime ?? 0),
      bonus: Number(r?.bonus ?? 0),
      commission: Number(r?.commission ?? 0),
      self_employment_income: Number(r?.self_employment_income ?? 0),
      other_income: Number(r?.other_income ?? 0),
    });
  }, [leadId]);

  useEffect(() => { load(); }, [load]);

  const monthly = computeMonthly(form);
  const annual = monthly * 12;

  const setField = (k: keyof IncomeInput, v: string) => {
    const num = v === "" ? 0 : Number(v);
    if (Number.isNaN(num)) return;
    setForm((f) => ({ ...f, [k]: num }));
  };

  const save = async () => {
    if (!leadId) return;
    setBusy(true);
    const t = toast.loading("Saving income…");
    try {
      const saved = await saveIncome({ ...form, lead_id: leadId });
      setLatest(saved);
      toast.success("Income saved", { id: t });
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed", { id: t });
    } finally {
      setBusy(false);
    }
  };

  if (!leadId) return null;

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4" /> Income
          <Badge variant="outline" className="ml-auto text-[10px] capitalize">
            {latest?.source ?? "manual"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Borrower type</Label>
          <Select
            value={form.borrower_type}
            onValueChange={(v) => setForm((f) => ({ ...f, borrower_type: v as any }))}
            disabled={!editable}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="employed">Employed</SelectItem>
              <SelectItem value="self_employed">Self-employed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {FIELDS.map((f) => (
            <div key={String(f.key)} className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{f.label}</Label>
              <Input
                type="number"
                inputMode="decimal"
                disabled={!editable}
                value={String(form[f.key] ?? 0)}
                onChange={(e) => setField(f.key, e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          ))}
        </div>

        <div className="rounded-md bg-muted/40 p-2 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Monthly</span><span className="font-medium">{fmt(monthly)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Annual</span><span className="font-medium">{fmt(annual)}</span></div>
        </div>

        {editable && (
          <Button size="sm" className="w-full" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save income"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}