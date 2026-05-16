import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { BarChart2, Pencil, Trash2, Plus, Download, Mail, Star, ArrowDown, ArrowUp, RotateCcw, Zap, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { calculatePI, getMndRate } from "@/lib/calculatePI";

interface Props {
  leadId: string;
  lead: any;
  onActivity?: () => void;
}

type Scenario = {
  id: string;
  lead_id: string;
  label: string;
  sublabel: string | null;
  purchase_price: number | null;
  property_address: string | null;
  down_payment_amt: number | null;
  down_payment_pct: number | null;
  loan_amount: number | null;
  ltv: number | null;
  mortgage_type: string | null;
  lien_position: string | null;
  pi: number | null;
  hoi: number | null;
  supplemental: number | null;
    property_taxes: number | null;
  mi: number | null;
  dues: number | null;
  other_amount: number | null;
  other_label: string | null;
  total_piti: number | null;
  created_at: string;
  loan_term_years: number | null;
  interest_rate: number | null;
  rate_source: string | null;
  buydown_mode?: boolean | null;
  points_budget?: number | null;
  points_purchasable?: number | null;
  rate_reduction_pct?: number | null;
  reduction_per_point?: number | null;
  bought_down_rate?: number | null;
  breakeven_vs_a_months?: number | null;
  breakeven_vs_b_months?: number | null;
};

const DEFAULTS = {
  hoi: 166.67, supplemental: 47.67, property_taxes: 240.75,
  mi: 0, dues: 0, other_amount: 0, pi: 0,
};

const fmt = (n: number | null | undefined) =>
  typeof n === "number" && !isNaN(n)
    ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
    : "$0.00";

const num = (v: any) => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
};

function calcTotal(s: Partial<Scenario>) {
  return (
    num(s.pi) + num(s.hoi) + num(s.supplemental) + num(s.property_taxes) +
    num(s.mi) + num(s.dues) + num(s.other_amount)
  );
}

export function LoanScenariosTab({ leadId, lead, onActivity }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Scenario | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("loan_scenarios")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setScenarios((data ?? []) as Scenario[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [leadId]);

  const openNew = () => {
    if (scenarios.length >= 3) return;
    const nextLabel = ["Option A", "Option B", "Option C"][scenarios.length];
    setEditing({
      id: "", lead_id: leadId, label: nextLabel, sublabel: "",
      purchase_price: lead?.property_value ?? null,
      property_address: lead?.address ?? scenarios[0]?.property_address ?? "",
      down_payment_amt: null, down_payment_pct: null,
      loan_amount: null, ltv: null,
      mortgage_type: "Conventional", lien_position: "First Lien",
      pi: 0, hoi: DEFAULTS.hoi, supplemental: DEFAULTS.supplemental,
      property_taxes: DEFAULTS.property_taxes, mi: 0, dues: 0,
      other_amount: 0, other_label: "", total_piti: 0,
      created_at: new Date().toISOString(),
      loan_term_years: 30, interest_rate: null, rate_source: "mnd_live",
    });
    setDrawerOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this scenario?")) return;
    const { error } = await supabase.from("loan_scenarios").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Scenario deleted" }); load(); }
  };

  const lowestPI = useMemo(() => {
    if (!scenarios.length) return null;
    return scenarios.reduce((min, s) => (num(s.pi) < num(min.pi) ? s : min), scenarios[0]);
  }, [scenarios]);

  const leadName = `${lead?.first_name ?? ""} ${lead?.last_name ?? ""}`.trim() || "Lead";
  const propAddress = scenarios.find(s => s.property_address)?.property_address ?? "";

  const buildPDF = () => {
    const pdf = new jsPDF({ unit: "pt", format: "letter" });
    const W = pdf.internal.pageSize.getWidth();

    // Header banner
    pdf.setFillColor(15, 27, 61);
    pdf.rect(0, 0, W, 90, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("Loan Scenario Comparison", 40, 38);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(212, 175, 55);
    pdf.text(`${leadName}${propAddress ? "  •  " + propAddress : ""}`, 40, 58);
    pdf.text(`Prepared ${new Date().toLocaleDateString()}`, 40, 74);

    let y = 120;
    pdf.setTextColor(15, 27, 61);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("At a Glance", 40, y);
    y += 8;

    const cols = ["Metric", ...scenarios.map(s => `${s.label}${s.sublabel ? " – " + s.sublabel : ""}`)];
    const glanceRows = [
      ["Down Payment", ...scenarios.map(s => `${fmt(s.down_payment_amt)} (${(s.down_payment_pct ?? 0).toFixed(2)}%)`)],
      ["Loan Amount", ...scenarios.map(s => fmt(s.loan_amount))],
      ["LTV", ...scenarios.map(s => `${(s.ltv ?? 0).toFixed(2)}%`)],
      ["P&I", ...scenarios.map(s => fmt(s.pi))],
      ["Total PITI", ...scenarios.map(s => fmt(s.total_piti))],
    ];
    autoTable(pdf, {
      startY: y + 5, head: [cols], body: glanceRows,
      headStyles: { fillColor: [15, 27, 61], textColor: 255 },
      styles: { fontSize: 10 },
    });

    y = (pdf as any).lastAutoTable.finalY + 30;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("Full Monthly Payment Breakdown", 40, y);

    const base = scenarios[0];
    const diff = (val: number, idx: number, baseVal: number) => {
      if (idx === 0) return fmt(val);
      const d = val - baseVal;
      const sign = d > 0 ? "+" : "";
      return `${fmt(val)} (${sign}${fmt(d)})`;
    };
    const components: [string, keyof Scenario][] = [
      ["Principal & Interest", "pi"], ["Homeowner's Insurance", "hoi"],
      ["Supplemental Insurance", "supplemental"], ["Property Taxes", "property_taxes"],
      ["Mortgage Insurance", "mi"], ["Association Dues", "dues"],
      ["Other", "other_amount"], ["Total PITI", "total_piti"],
    ];
    const bodyRows = components.map(([lbl, key]) => [
      lbl, ...scenarios.map((s, i) => diff(num(s[key] as any), i, num(base[key] as any))),
    ]);
    autoTable(pdf, {
      startY: y + 5, head: [cols], body: bodyRows,
      headStyles: { fillColor: [15, 27, 61], textColor: 255 },
      styles: { fontSize: 9 },
    });

    y = (pdf as any).lastAutoTable.finalY + 30;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("P&I Spotlight", 40, y);
    y += 20;
    scenarios.forEach((s, i) => {
      const x = 40 + i * 170;
      pdf.setDrawColor(220);
      pdf.setFillColor(248, 248, 250);
      pdf.roundedRect(x, y, 160, 70, 6, 6, "FD");
      pdf.setTextColor(15, 27, 61);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${s.label}${lowestPI?.id === s.id ? "  ★" : ""}`, x + 10, y + 18);
      pdf.setFontSize(16);
      pdf.text(fmt(s.pi), x + 10, y + 42);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100);
      pdf.text(s.sublabel ?? "", x + 10, y + 58);
    });
    y += 90;

    pdf.setTextColor(15, 27, 61);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("Cash at Closing (Estimated)", 40, y);
    const closingRows = scenarios.map(s => {
      const cc = num(s.purchase_price) * 0.03;
      return [s.label, fmt(s.down_payment_amt), fmt(cc), fmt(num(s.down_payment_amt) + cc)];
    });
    autoTable(pdf, {
      startY: y + 5,
      head: [["Scenario", "Down Payment", "Est. Closing Costs (~3%)", "Total Cash"]],
      body: closingRows,
      headStyles: { fillColor: [15, 27, 61], textColor: 255 },
      styles: { fontSize: 10 },
    });

    y = (pdf as any).lastAutoTable.finalY + 25;
    pdf.setDrawColor(212, 175, 55);
    pdf.setLineWidth(1.5);
    pdf.setFillColor(253, 248, 230);
    pdf.roundedRect(40, y, W - 80, 90, 6, 6, "FD");
    pdf.setTextColor(15, 27, 61);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Bottom Line Summary", 55, y + 22);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    let by = y + 40;
    scenarios.forEach(s => {
      const profile = num(s.down_payment_pct) < 5
        ? "Best for buyers minimizing cash to close."
        : num(s.mi) === 0
        ? "Best for buyers wanting to avoid mortgage insurance."
        : "Balanced option between cash outlay and monthly payment.";
      pdf.text(`• ${s.label} (${s.sublabel ?? ""}): ${profile}`, 55, by);
      by += 14;
    });

    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text(
      "Informational only. Not a Loan Estimate or commitment to lend. Rates and terms subject to change.",
      40, pdf.internal.pageSize.getHeight() - 30,
    );
    return pdf;
  };

  const downloadPDF = () => {
    const pdf = buildPDF();
    pdf.save(`Loan_Comparison_${leadName.replace(/\s+/g, "_")}.pdf`);
  };

  if (loading) return <Card><CardContent className="py-8 text-center text-muted-foreground">Loading…</CardContent></Card>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="h-4 w-4" /> Loan Scenarios
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {leadName}{propAddress ? ` • ${propAddress}` : ""} • Prepared {new Date().toLocaleDateString()}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {scenarios.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-muted-foreground">No scenarios built yet. Add your first scenario to get started.</p>
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Scenario</Button>
            </div>
          ) : (
            <>
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${scenarios.length}, minmax(0, 1fr))` }}>
                {scenarios.map(s => (
                  <div key={s.id} className="border rounded-lg p-4 bg-card relative">
                    {lowestPI?.id === s.id && scenarios.length > 1 && (
                      <Badge className="absolute -top-2 right-2 bg-amber-500 text-white">
                        <Star className="h-3 w-3 mr-1" /> Lowest P&I
                      </Badge>
                    )}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold">{s.label}</div>
                        <div className="text-xs text-muted-foreground">{s.sublabel}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setDrawerOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Down</span><span>{fmt(s.down_payment_amt)} ({(s.down_payment_pct ?? 0).toFixed(1)}%)</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Loan</span><span>{fmt(s.loan_amount)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">LTV</span><Badge variant="secondary">{(s.ltv ?? 0).toFixed(2)}%</Badge></div>
                      <div className="flex justify-between text-lg font-semibold mt-2"><span>P&I</span><span>{fmt(s.pi)}</span></div>
                      <div className="text-xs text-muted-foreground text-right">
                        {s.interest_rate != null
                          ? `@ ${Number(s.interest_rate).toFixed(3)}% · ${s.loan_term_years ?? 30}yr · ${s.rate_source === "manual" ? "Manual" : "Live rate"}`
                          : "—"}
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1"><span>PITI</span><span>{fmt(s.total_piti)}</span></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Breakdown table */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Component</th>
                      {scenarios.map(s => <th key={s.id} className="text-right p-2">{s.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      ["P&I", "pi"], ["HOI", "hoi"], ["Supplemental", "supplemental"],
                      ["Property Taxes", "property_taxes"], ["MI", "mi"], ["Dues", "dues"],
                      ["Other", "other_amount"], ["Total PITI", "total_piti"],
                    ] as [string, keyof Scenario][]).map(([lbl, key]) => {
                      const baseVal = num(scenarios[0][key] as any);
                      return (
                        <tr key={lbl} className="border-t">
                          <td className="p-2 font-medium">{lbl}</td>
                          {scenarios.map((s, i) => {
                            const v = num(s[key] as any);
                            const d = v - baseVal;
                            return (
                              <td key={s.id} className="p-2 text-right">
                                {fmt(v)}
                                {i > 0 && d !== 0 && (
                                  <span className={`ml-2 text-xs inline-flex items-center ${d < 0 ? "text-green-600" : "text-red-500"}`}>
                                    {d < 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                                    {fmt(Math.abs(d))}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-2 mt-6">
                <Button
                  onClick={openNew}
                  disabled={scenarios.length >= 3}
                  title={scenarios.length >= 3 ? "Maximum 3 scenarios" : ""}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Scenario
                </Button>
                <Button variant="outline" onClick={downloadPDF}>
                  <Download className="h-4 w-4 mr-1" /> Download PDF
                </Button>
                <Button variant="outline" onClick={() => setEmailOpen(true)} disabled={!lead?.email}>
                  <Mail className="h-4 w-4 mr-1" /> Email to Lead
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ScenarioDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditing(null); }}
        scenario={editing}
        leadId={leadId}
        userId={user?.id}
        allScenarios={scenarios}
        onSaved={() => { setDrawerOpen(false); setEditing(null); load(); }}
      />

      <EmailDialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        lead={lead}
        leadName={leadName}
        propAddress={propAddress}
        buildPDF={buildPDF}
        onSent={onActivity}
      />
    </div>
  );
}

function ScenarioDrawer({
  open, onClose, scenario, leadId, userId, onSaved,
}: {
  open: boolean; onClose: () => void; scenario: Scenario | null;
  leadId: string; userId?: string; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<Partial<Scenario>>({});
  const [piManual, setPiManual] = useState(false);

  useEffect(() => {
    setForm(scenario ?? {});
    setPiManual((scenario?.rate_source ?? "mnd_live") === "manual");
  }, [scenario]);

  const set = (k: keyof Scenario, v: any) => setForm(f => ({ ...f, [k]: v }));

  const rateInfo = useMemo(
    () => getMndRate(form.mortgage_type ?? "Conventional"),
    [form.mortgage_type],
  );
  const termYears = num(form.loan_term_years) || 30;
  const autoPI = useMemo(
    () => calculatePI(num(form.loan_amount), rateInfo.effectiveRate, termYears),
    [form.loan_amount, rateInfo.effectiveRate, termYears],
  );

  // Push auto-calculated P&I into form when not in manual mode
  useEffect(() => {
    if (!piManual) {
      setForm(f => ({ ...f, pi: +autoPI.toFixed(2) }));
    }
  }, [autoPI, piManual]);

  const onPriceOrDownChange = (price: number, dpAmt?: number, dpPct?: number) => {
    const p = num(price);
    let amt = dpAmt;
    let pct = dpPct;
    if (amt != null && pct == null) pct = p > 0 ? (amt / p) * 100 : 0;
    if (pct != null && dpAmt == null) amt = (p * pct) / 100;
    const loan = p - num(amt);
    const ltv = p > 0 ? (loan / p) * 100 : 0;
    setForm(f => ({
      ...f, purchase_price: p,
      down_payment_amt: amt != null ? +amt.toFixed(2) : f.down_payment_amt,
      down_payment_pct: pct != null ? +pct.toFixed(3) : f.down_payment_pct,
      loan_amount: +loan.toFixed(2), ltv: +ltv.toFixed(3),
    }));
  };

  const effectivePI = piManual ? num(form.pi) : autoPI;
  const total = useMemo(
    () => calcTotal({ ...form, pi: effectivePI }),
    [form, effectivePI],
  );

  const save = async () => {
    const payload = {
      lead_id: leadId,
      label: form.label ?? "Option A",
      sublabel: form.sublabel ?? null,
      purchase_price: num(form.purchase_price),
      property_address: form.property_address ?? null,
      down_payment_amt: num(form.down_payment_amt),
      down_payment_pct: num(form.down_payment_pct),
      loan_amount: num(form.loan_amount),
      ltv: num(form.ltv),
      mortgage_type: form.mortgage_type ?? "Conventional",
      lien_position: form.lien_position ?? "First Lien",
      pi: +effectivePI.toFixed(2),
      hoi: num(form.hoi), supplemental: num(form.supplemental),
      property_taxes: num(form.property_taxes), mi: num(form.mi),
      dues: num(form.dues), other_amount: num(form.other_amount),
      other_label: form.other_label ?? null,
      total_piti: total,
      created_by: userId,
      loan_term_years: termYears,
      interest_rate: +rateInfo.effectiveRate.toFixed(4),
      rate_source: piManual ? "manual" : "mnd_live",
    };
    const op = scenario?.id
      ? supabase.from("loan_scenarios").update(payload).eq("id", scenario.id)
      : supabase.from("loan_scenarios").insert(payload);
    const { error } = await op;
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: scenario?.id ? "Scenario updated" : "Scenario saved" });
    onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader><SheetTitle>{scenario?.id ? "Edit Loan Scenario" : "New Loan Scenario"}</SheetTitle></SheetHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Scenario Label</Label><Input value={form.label ?? ""} onChange={e => set("label", e.target.value)} /></div>
            <div><Label>Sublabel</Label><Input value={form.sublabel ?? ""} onChange={e => set("sublabel", e.target.value)} placeholder="e.g. 3% Down" /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Purchase Price</Label>
              <Input type="number" value={form.purchase_price ?? ""}
                onChange={e => onPriceOrDownChange(num(e.target.value), num(form.down_payment_amt), undefined)} />
            </div>
            <div>
              <Label>Property Address</Label>
              <Input value={form.property_address ?? ""} onChange={e => set("property_address", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Down Payment ($)</Label>
              <Input type="number" value={form.down_payment_amt ?? ""}
                onChange={e => onPriceOrDownChange(num(form.purchase_price), num(e.target.value), undefined)} />
            </div>
            <div>
              <Label>Down Payment (%)</Label>
              <Input type="number" step="0.01" value={form.down_payment_pct ?? ""}
                onChange={e => onPriceOrDownChange(num(form.purchase_price), undefined, num(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Base Loan Amount</Label>
              <Input type="number" value={form.loan_amount ?? ""} onChange={e => set("loan_amount", num(e.target.value))} />
            </div>
            <div>
              <Label>LTV (%)</Label>
              <Input value={form.ltv != null ? (form.ltv as number).toFixed(3) : ""} readOnly />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mortgage Type</Label>
              <Select value={form.mortgage_type ?? "Conventional"} onValueChange={v => set("mortgage_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Conventional", "FHA", "VA", "USDA"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lien Position</Label>
              <Select value={form.lien_position ?? "First Lien"} onValueChange={v => set("lien_position", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["First Lien", "Second Lien"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Loan Term</Label>
            <Select value={String(termYears)} onValueChange={v => set("loan_term_years", parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[30, 20, 15, 10].map(y => <SelectItem key={y} value={String(y)}>{y} Years</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md bg-muted/60 border px-3 py-2 text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
            <span><span className="text-muted-foreground">Current Rate (MND):</span> <strong>{rateInfo.baseRate.toFixed(3)}%</strong></span>
            <span className="text-muted-foreground">|</span>
            <span><span className="text-muted-foreground">Spread:</span> +{rateInfo.spread.toFixed(3)}%</span>
            <span className="text-muted-foreground">|</span>
            <span><span className="text-muted-foreground">Effective:</span> <strong>{rateInfo.effectiveRate.toFixed(3)}%</strong></span>
            <span className="ml-auto text-muted-foreground">As of {new Date(rateInfo.asOf).toLocaleString()}</span>
          </div>

          <div className="pt-2 border-t">
            <h4 className="font-semibold mb-2">Monthly Payment Breakdown</h4>
            <div className="mb-3">
              <Label>Principal & Interest</Label>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    step="0.01"
                    readOnly={!piManual}
                    value={piManual ? (form.pi ?? "") as any : autoPI.toFixed(2)}
                    onChange={e => piManual && set("pi", num(e.target.value))}
                    className={piManual ? "" : "bg-primary/5 border-primary/30"}
                  />
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    {piManual ? (
                      <><Pencil className="h-3 w-3" /> Manual override — click Restore Auto to revert</>
                    ) : (
                      <><Zap className="h-3 w-3" /> Auto — {rateInfo.effectiveRate.toFixed(3)}% · {termYears}yr</>
                    )}
                  </div>
                </div>
                {piManual ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setPiManual(false); }}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore Auto
                  </Button>
                ) : (
                  <Button type="button" size="icon" variant="ghost" onClick={() => { setPiManual(true); set("pi", +autoPI.toFixed(2)); }} title="Edit P&I">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                ["hoi", "Homeowner's Insurance"],
                ["supplemental", "Supplemental Insurance"], ["property_taxes", "Property Taxes"],
                ["mi", "Mortgage Insurance"], ["dues", "Association Dues"],
              ] as [keyof Scenario, string][]).map(([k, lbl]) => (
                <div key={k as string}>
                  <Label>{lbl}</Label>
                  <Input type="number" step="0.01" value={(form[k] as any) ?? ""} onChange={e => set(k, num(e.target.value))} />
                </div>
              ))}
              <div>
                <Label>Other (label)</Label>
                <Input value={form.other_label ?? ""} onChange={e => set("other_label", e.target.value)} />
              </div>
              <div>
                <Label>Other (amount)</Label>
                <Input type="number" step="0.01" value={form.other_amount ?? ""} onChange={e => set("other_amount", num(e.target.value))} />
              </div>
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/30 rounded-md p-3 flex items-center justify-between">
            <span className="font-semibold">Total PITI</span>
            <span className="text-xl font-bold">{fmt(total)}</span>
          </div>
        </div>

        <SheetFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save Scenario</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function EmailDialog({
  open, onClose, lead, leadName, propAddress, buildPDF, onSent,
}: {
  open: boolean; onClose: () => void; lead: any; leadName: string;
  propAddress: string; buildPDF: () => jsPDF; onSent?: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [to, setTo] = useState(lead?.email ?? "");
  const [subject, setSubject] = useState(`Loan Scenario Comparison – ${propAddress || leadName}`);
  const [message, setMessage] = useState(
    `Hi ${lead?.first_name ?? ""},\n\nPlease find attached your personalized loan scenario comparison. Feel free to reach out with any questions.\n\n— ${user?.email ?? "Your Loan Officer"}`,
  );
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setTo(lead?.email ?? "");
      setSubject(`Loan Scenario Comparison – ${propAddress || leadName}`);
    }
  }, [open, lead, propAddress, leadName]);

  const send = async () => {
    if (!to) return;
    setSending(true);
    try {
      const pdf = buildPDF();
      const b64 = pdf.output("datauristring").split(",")[1];
      const { error } = await supabase.functions.invoke("send-loan-comparison", {
        body: {
          to, subject, message,
          lead_id: lead?.id,
          pdf_base64: b64,
          filename: `Loan_Comparison_${leadName.replace(/\s+/g, "_")}.pdf`,
        },
      });
      if (error) throw error;
      toast({ title: `Comparison sent to ${to}` });
      onSent?.();
      onClose();
    } catch (e: any) {
      toast({ title: "Failed to send", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Email Comparison to Lead</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>To</Label><Input value={to} onChange={e => setTo(e.target.value)} /></div>
          <div><Label>Subject</Label><Input value={subject} onChange={e => setSubject(e.target.value)} /></div>
          <div><Label>Message</Label><Textarea rows={6} value={message} onChange={e => setMessage(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={sending || !to}>{sending ? "Sending…" : "Send Email"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}