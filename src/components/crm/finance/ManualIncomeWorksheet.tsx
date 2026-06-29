import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Building2, Calculator } from "lucide-react";
import { slotsByEntity } from "@/lib/income-analysis/spec/sections";
import { previewCalculation } from "@/lib/income-analysis/engine";
import type { BusinessEntity, CaseInputs } from "@/lib/income-analysis/engine/types";

type LineValues = { year_1: number | null; year_2: number | null };

interface ManualBusiness {
  id: string;
  name: string;
  entity: BusinessEntity;
  ein?: string;
  ownership_pct?: number | null;
  months_in_service?: number | null;
  borrower_role?: string;
  years_in_business?: number | null;
  lines: Record<string, LineValues>;
}

interface ManualWorksheet {
  tax_years: { year_1: number; year_2: number };
  businesses: ManualBusiness[];
}

interface Props {
  profileId: string;
  leadId?: string | null;
  contactId: string | null;
  borrowerName: string;
  initial: ManualWorksheet | null;
}

const ENTITY_LABELS: Record<BusinessEntity, string> = {
  sole_prop: "Sole Proprietor (Schedule C)",
  single_member_llc: "Single-Member LLC (Schedule C)",
  partnership: "Partnership (Form 1065)",
  s_corp: "S Corporation (Form 1120-S)",
  c_corp: "C Corporation (Form 1120)",
  schedule_e_rental: "Rental Real Estate (Schedule E)",
  schedule_f_farm: "Farm Income (Schedule F)",
  interest_div: "Interest & Dividends (Schedule B)",
  capital_gains: "Capital Gains (Schedule D)",
};

const SELECTABLE_ENTITIES: BusinessEntity[] = [
  "sole_prop",
  "single_member_llc",
  "partnership",
  "s_corp",
  "c_corp",
  "schedule_e_rental",
  "schedule_f_farm",
];

const DEFAULT_YEARS = (() => {
  const now = new Date().getFullYear();
  return { year_1: now - 1, year_2: now - 2 };
})();

function makeBusiness(entity: BusinessEntity = "sole_prop", index = 1): ManualBusiness {
  return {
    id: crypto.randomUUID(),
    name: `Business #${index}`,
    entity,
    ein: "",
    ownership_pct: 100,
    months_in_service: null,
    borrower_role: "",
    years_in_business: null,
    lines: {},
  };
}

function emptyWorksheet(): ManualWorksheet {
  return { tax_years: { ...DEFAULT_YEARS }, businesses: [makeBusiness("sole_prop", 1)] };
}

function toCaseInputs(ws: ManualWorksheet): CaseInputs {
  return {
    case_id: "preview",
    tax_years: ws.tax_years,
    personal_lines: [],
    businesses: ws.businesses.map((b) => ({
      business_id: b.id,
      business_name: b.name,
      entity: b.entity,
      ownership_pct: b.ownership_pct ?? null,
      lines: Object.entries(b.lines).map(([line_number, v]) => ({
        line_number,
        year_1: v.year_1,
        year_2: v.year_2,
      })),
    })),
  };
}

function fmtMoney(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `$${Math.round(Number(n)).toLocaleString()}`;
}

export default function ManualIncomeWorksheet({
  profileId,
  leadId,
  contactId,
  borrowerName,
  initial,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ws, setWs] = useState<ManualWorksheet>(() => {
    if (initial && Array.isArray(initial.businesses) && initial.businesses.length) return initial;
    return emptyWorksheet();
  });
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const lastPushTimer = useRef<number | null>(null);

  // Persist worksheet (debounced) to self_employed_profiles.manual_worksheet.
  useEffect(() => {
    if (!profileId) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaving(true);
      const { error } = await (supabase as any)
        .from("self_employed_profiles")
        .update({ manual_worksheet: ws, income_source_mode: "manual" })
        .eq("id", profileId);
      setSaving(false);
      if (error) {
        toast({ title: "Auto-save failed", description: error.message, variant: "destructive" });
      }
    }, 600);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [ws, profileId, toast]);

  const result = useMemo(() => {
    try {
      return previewCalculation(toCaseInputs(ws));
    } catch {
      return null;
    }
  }, [ws]);

  // Push qualifying income into borrower_income_calculations so the summary
  // card & downstream consumers stay in sync. Debounced.
  useEffect(() => {
    if (!leadId || !user || !result) return;
    if (lastPushTimer.current) window.clearTimeout(lastPushTimer.current);
    lastPushTimer.current = window.setTimeout(async () => {
      const monthly = result.totals.average_monthly_income ?? 0;
      const annual = result.totals.average_annual_income ?? 0;
      const row = {
        lead_id: leadId,
        contact_id: contactId,
        borrower_name: borrowerName,
        borrower_type: "self_employed",
        base_income: 0,
        overtime: 0,
        bonus: 0,
        commission: 0,
        self_employment_income: monthly,
        other_income: 0,
        monthly_income: monthly,
        annual_income: annual,
        years_average: result.totals.average_annual_income,
        source: "manual",
        calculated_by: user.id,
        income_breakdown: {
          mode: "manual_worksheet",
          formula_version: result.formula_version,
          tax_years: result.tax_years,
          totals: result.totals,
          summaries: result.summaries,
        },
      };
      await (supabase as any).from("borrower_income_calculations").insert(row);
    }, 1500);
    return () => {
      if (lastPushTimer.current) window.clearTimeout(lastPushTimer.current);
    };
  }, [result, leadId, user, contactId, borrowerName]);

  function patchBiz(id: string, patch: Partial<ManualBusiness>) {
    setWs((prev) => ({
      ...prev,
      businesses: prev.businesses.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  }

  function patchLine(bizId: string, line: string, patch: Partial<LineValues>) {
    setWs((prev) => ({
      ...prev,
      businesses: prev.businesses.map((b) => {
        if (b.id !== bizId) return b;
        const prevLine = b.lines[line] ?? { year_1: null, year_2: null };
        return { ...b, lines: { ...b.lines, [line]: { ...prevLine, ...patch } } };
      }),
    }));
  }

  function addBusiness() {
    setWs((prev) => ({
      ...prev,
      businesses: [...prev.businesses, makeBusiness("sole_prop", prev.businesses.length + 1)],
    }));
  }

  function removeBusiness(id: string) {
    setWs((prev) => ({ ...prev, businesses: prev.businesses.filter((b) => b.id !== id) }));
  }

  return (
    <div className="space-y-4">
      {/* Tax years + global controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2"><Calculator className="h-4 w-4" /> Manual Income Worksheet</span>
            <Badge variant="outline" className="font-normal">
              {saving ? "Saving…" : "All changes saved"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <Label className="text-xs">Tax Year 1 (most recent)</Label>
            <Input
              type="number"
              value={ws.tax_years.year_1}
              onChange={(e) => setWs((p) => ({ ...p, tax_years: { ...p.tax_years, year_1: Number(e.target.value) || p.tax_years.year_1 } }))}
            />
          </div>
          <div>
            <Label className="text-xs">Tax Year 2 (prior)</Label>
            <Input
              type="number"
              value={ws.tax_years.year_2}
              onChange={(e) => setWs((p) => ({ ...p, tax_years: { ...p.tax_years, year_2: Number(e.target.value) || p.tax_years.year_2 } }))}
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button size="sm" onClick={addBusiness} variant="outline" className="gap-1">
              <Plus className="h-4 w-4" /> Add Business
            </Button>
          </div>
        </CardContent>
      </Card>

      {ws.businesses.map((biz, idx) => (
        <BusinessBlock
          key={biz.id}
          index={idx + 1}
          business={biz}
          taxYears={ws.tax_years}
          summary={result?.summaries.find((s) => s.business_id === biz.id) ?? null}
          onPatch={(p) => patchBiz(biz.id, p)}
          onLine={(line, p) => patchLine(biz.id, line, p)}
          onRemove={ws.businesses.length > 1 ? () => removeBusiness(biz.id) : undefined}
        />
      ))}

      {/* Borrower-level summary */}
      <Card className="border-primary/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Borrower Mortgage Income Summary — {borrowerName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <SummaryStat label={`${ws.tax_years.year_1} Income`} value={fmtMoney(result?.totals.year_1_income)} />
            <SummaryStat label={`${ws.tax_years.year_2} Income`} value={fmtMoney(result?.totals.year_2_income)} />
            <SummaryStat label="2-Year Average (Annual)" value={fmtMoney(result?.totals.average_annual_income)} highlight />
            <SummaryStat label="Monthly Qualifying" value={fmtMoney(result?.totals.average_monthly_income)} highlight />
          </div>
          {result && (
            <p className="text-xs text-muted-foreground mt-3">
              Trend: <span className="capitalize font-medium">{result.totals.trend}</span> · Formula version {result.formula_version}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${highlight ? "bg-primary/5 border-primary/30" : "bg-muted/30"}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

interface BusinessBlockProps {
  index: number;
  business: ManualBusiness;
  taxYears: { year_1: number; year_2: number };
  summary: ReturnType<typeof previewCalculation>["summaries"][number] | null;
  onPatch: (p: Partial<ManualBusiness>) => void;
  onLine: (line: string, p: Partial<LineValues>) => void;
  onRemove?: () => void;
}

function BusinessBlock({ index, business, taxYears, summary, onPatch, onLine, onRemove }: BusinessBlockProps) {
  const slot = slotsByEntity(business.entity)[0] ?? null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Business #{index}
          </CardTitle>
          {onRemove && (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onRemove}>
              <Trash2 className="h-4 w-4 mr-1" /> Remove
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Business info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Business Name</Label>
            <Input value={business.name} onChange={(e) => onPatch({ name: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Entity / IRS Form</Label>
            <Select value={business.entity} onValueChange={(v) => onPatch({ entity: v as BusinessEntity })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SELECTABLE_ENTITIES.map((e) => (
                  <SelectItem key={e} value={e}>{ENTITY_LABELS[e]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">EIN</Label>
            <Input value={business.ein ?? ""} onChange={(e) => onPatch({ ein: e.target.value })} placeholder="XX-XXXXXXX" />
          </div>
          <div>
            <Label className="text-xs">Ownership %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={business.ownership_pct ?? ""}
              onChange={(e) => onPatch({ ownership_pct: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
          <div>
            <Label className="text-xs">Months in Service</Label>
            <Input
              type="number"
              value={business.months_in_service ?? ""}
              onChange={(e) => onPatch({ months_in_service: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
          <div>
            <Label className="text-xs">Years in Business</Label>
            <Input
              type="number"
              value={business.years_in_business ?? ""}
              onChange={(e) => onPatch({ years_in_business: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs">Borrower Role</Label>
            <Input
              value={business.borrower_role ?? ""}
              onChange={(e) => onPatch({ borrower_role: e.target.value })}
              placeholder="Owner, Partner, Shareholder…"
            />
          </div>
        </div>

        <Separator />

        {/* Worksheet blocks */}
        {!slot && (
          <p className="text-sm text-muted-foreground">No worksheet defined for this entity type.</p>
        )}
        {slot?.blocks.map((block, bIdx) => (
          <div key={`${block.row}-${bIdx}`} className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {block.label.replace(/\s+Name:\s*$/i, "").trim()}
              </h4>
              <Badge variant="secondary" className="text-[10px]">{block.form_code.toUpperCase()}</Badge>
            </div>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">IRS Line</th>
                    <th className="text-left px-3 py-2 font-medium">Description</th>
                    <th className="text-right px-3 py-2 font-medium w-32">{taxYears.year_1}</th>
                    <th className="text-right px-3 py-2 font-medium w-32">{taxYears.year_2}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {block.input_lines.filter((il) => !il.is_computed).map((il) => {
                    const v = business.lines[il.line_number] ?? { year_1: null, year_2: null };
                    return (
                      <tr key={il.line_number}>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {il.irs_line_ref ?? `Line ${il.line_number}`}
                        </td>
                        <td className="px-3 py-2">{il.label}</td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            className="h-8 text-right tabular-nums"
                            type="number"
                            step="0.01"
                            value={v.year_1 ?? ""}
                            onChange={(e) => onLine(il.line_number, { year_1: e.target.value === "" ? null : Number(e.target.value) })}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            className="h-8 text-right tabular-nums"
                            type="number"
                            step="0.01"
                            value={v.year_2 ?? ""}
                            onChange={(e) => onLine(il.line_number, { year_2: e.target.value === "" ? null : Number(e.target.value) })}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Per-business calculated summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <SummaryStat label={`${taxYears.year_1} Qualifying`} value={fmtMoney(summary?.year_1_income)} />
          <SummaryStat label={`${taxYears.year_2} Qualifying`} value={fmtMoney(summary?.year_2_income)} />
          <SummaryStat label="Annual Average" value={fmtMoney(summary?.average_annual_income)} highlight />
          <SummaryStat label="Monthly" value={fmtMoney(summary?.average_monthly_income)} highlight />
        </div>
      </CardContent>
    </Card>
  );
}