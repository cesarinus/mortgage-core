import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Download, FileText, Building2 } from "lucide-react";
import {
  computeBalanceSheet,
  computeCashFlow,
  computePnL,
  DEFAULT_TEMPLATE,
  fmtCurrency,
  LineItem,
  makeDefaultLineItems,
  SECTION_LABELS,
  type FinanceSection,
} from "@/lib/finance/lineItems";
import {
  downloadPdf,
  generateBalanceSheetPdf,
  generateCombinedPdf,
  generatePnlPdf,
} from "@/lib/finance/pdf";

type BorrowerType = "employee" | "self_employed";

interface Profile {
  id: string;
  deal_id: string | null;
  lead_id: string | null;
  contact_id: string | null;
  borrower_type: BorrowerType;
  business_name: string | null;
  tax_id: string | null;
  business_type: string | null;
  line_items: LineItem[];
}

interface Props {
  dealId?: string | null;
  leadId?: string | null;
  contactId: string | null;
  borrowerName: string;
}

const SECTIONS: FinanceSection[] = [
  "income",
  "expense",
  "asset_current",
  "asset_fixed",
  "liability_current",
  "liability_long",
  "equity",
];

export default function FinancialWorkspace({ dealId, leadId, contactId, borrowerName }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snapshots, setSnapshots] = useState<any[]>([]);

  const scopeColumn: "deal_id" | "lead_id" = dealId ? "deal_id" : "lead_id";
  const scopeId = dealId ?? leadId ?? null;

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId, leadId]);

  async function load() {
    if (!scopeId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("self_employed_profiles")
      .select("*")
      .eq(scopeColumn, scopeId)
      .maybeSingle();
    if (error) {
      toast({ title: "Could not load financial profile", description: error.message, variant: "destructive" });
    }
    if (data) {
      setProfile({
        ...data,
        line_items: Array.isArray(data.line_items) && data.line_items.length
          ? (data.line_items as LineItem[])
          : makeDefaultLineItems(),
      });
    } else {
      setProfile({
        id: "",
        deal_id: dealId ?? null,
        lead_id: leadId ?? null,
        contact_id: contactId,
        borrower_type: "employee",
        business_name: null,
        tax_id: null,
        business_type: null,
        line_items: makeDefaultLineItems(),
      });
    }
    const { data: snaps } = await (supabase as any)
      .from("financial_statements")
      .select("id, statement_type, created_at, period_start, period_end")
      .eq(scopeColumn, scopeId)
      .order("created_at", { ascending: false })
      .limit(20);
    setSnapshots(snaps ?? []);
    setLoading(false);
  }

  async function persist(patch: Partial<Profile>) {
    if (!profile || !user || !scopeId) return;
    const next = { ...profile, ...patch };
    setProfile(next);
    setSaving(true);
    const payload: any = {
      deal_id: dealId ?? null,
      lead_id: leadId ?? null,
      contact_id: contactId,
      borrower_type: next.borrower_type,
      business_name: next.business_name,
      tax_id: next.tax_id,
      business_type: next.business_type,
      line_items: next.line_items,
      created_by: user.id,
    };
    const { data, error } = await (supabase as any)
      .from("self_employed_profiles")
      .upsert(payload, { onConflict: scopeColumn })
      .select()
      .maybeSingle();
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else if (data) {
      setProfile((p) => (p ? { ...p, id: data.id } : p));
    }
  }

  function updateItem(id: string, patch: Partial<LineItem>) {
    if (!profile) return;
    const next = profile.line_items.map((i) => (i.id === id ? { ...i, ...patch } : i));
    void persist({ line_items: next });
  }

  function addRow(section: FinanceSection) {
    if (!profile) return;
    const item: LineItem = {
      id: crypto.randomUUID(),
      section,
      category: "Custom",
      label: "New line",
      amount: 0,
    };
    void persist({ line_items: [...profile.line_items, item] });
  }

  function removeRow(id: string) {
    if (!profile) return;
    void persist({ line_items: profile.line_items.filter((i) => i.id !== id) });
  }

  function resetToTemplate() {
    void persist({ line_items: makeDefaultLineItems() });
  }

  async function logActivity(title: string) {
    if (!user) return;
    await (supabase as any).from("crm_activities").insert({
      deal_id: dealId ?? null,
      lead_id: leadId ?? null,
      contact_id: contactId,
      activity_type: "financial",
      actor_id: user.id,
      title,
      body: dealId ? `Deal ${dealId.slice(0, 8).toUpperCase()}` : `Lead ${(leadId ?? "").slice(0, 8).toUpperCase()}`,
    });
  }

  async function saveSnapshot(type: "pnl" | "balance_sheet" | "cash_flow" | "combined", data: any) {
    if (!user) return;
    await (supabase as any).from("financial_statements").insert({
      deal_id: dealId ?? null,
      lead_id: leadId ?? null,
      contact_id: contactId,
      statement_type: type,
      json_data: data,
      created_by: user.id,
    });
    void logActivity(`Financial statement generated (${type})`);
    void load();
  }

  const items = profile?.line_items ?? [];
  const pnl = useMemo(() => computePnL(items), [items]);
  const bs = useMemo(() => computeBalanceSheet(items), [items]);
  const cf = useMemo(() => computeCashFlow(items), [items]);

  if (loading || !profile) {
    return <div className="p-6 text-sm text-muted-foreground">Loading financial profile…</div>;
  }

  const pdfCtx = {
    borrowerName,
    businessName: profile.business_name,
    dealId: dealId ?? leadId ?? "",
    loanOfficer: user?.email ?? null,
    periodLabel: "Year to Date",
  };

  function exportPnl() {
    const doc = generatePnlPdf(items, pdfCtx);
    downloadPdf(doc, `PnL-${borrowerName.replace(/\s+/g, "_")}.pdf`);
    void saveSnapshot("pnl", pnl);
  }
  function exportBs() {
    const doc = generateBalanceSheetPdf(items, pdfCtx);
    downloadPdf(doc, `BalanceSheet-${borrowerName.replace(/\s+/g, "_")}.pdf`);
    void saveSnapshot("balance_sheet", bs);
  }
  function exportCombined() {
    const doc = generateCombinedPdf(items, pdfCtx);
    downloadPdf(doc, `Financials-${borrowerName.replace(/\s+/g, "_")}.pdf`);
    void saveSnapshot("combined", { pnl, bs, cf });
  }

  return (
    <div className="space-y-4">
      {/* Borrower Type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Borrower Income Classification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="inline-flex rounded-md border bg-muted p-1">
            {(["employee", "self_employed"] as BorrowerType[]).map((t) => (
              <button
                key={t}
                onClick={() => persist({ borrower_type: t })}
                className={`px-4 py-1.5 text-sm rounded transition-colors ${
                  profile.borrower_type === t
                    ? "bg-background shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "employee" ? "Employee" : "Self-Employed"}
              </button>
            ))}
          </div>

          {profile.borrower_type === "self_employed" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div>
                <Label className="text-xs">Business Name</Label>
                <Input
                  defaultValue={profile.business_name ?? ""}
                  onBlur={(e) => persist({ business_name: e.target.value || null })}
                />
              </div>
              <div>
                <Label className="text-xs">Tax ID / EIN</Label>
                <Input
                  defaultValue={profile.tax_id ?? ""}
                  onBlur={(e) => persist({ tax_id: e.target.value || null })}
                />
              </div>
              <div>
                <Label className="text-xs">Business Type</Label>
                <Input
                  placeholder="LLC, Sole Prop, S-Corp…"
                  defaultValue={profile.business_type ?? ""}
                  onBlur={(e) => persist({ business_type: e.target.value || null })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {profile.borrower_type === "employee" ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Employee borrowers use standard W-2 income fields collected in the loan application.
            Switch to <span className="font-medium">Self-Employed</span> to enable the financial
            analysis workspace (P&amp;L, Balance Sheet, Cash Flow).
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="input">
          <TabsList>
            <TabsTrigger value="input">Financial Input</TabsTrigger>
            <TabsTrigger value="statements">Statements</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {saving ? "Saving…" : "All changes saved automatically"}
              </p>
              <Button variant="ghost" size="sm" onClick={resetToTemplate}>
                Reset to template
              </Button>
            </div>

            {SECTIONS.map((section) => {
              const sectionItems = items.filter((i) => i.section === section);
              const total = sectionItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
              return (
                <Card key={section}>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">{SECTION_LABELS[section]}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{fmtCurrency(total)}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => addRow(section)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {sectionItems.length === 0 && (
                        <p className="px-4 py-3 text-xs text-muted-foreground">No line items</p>
                      )}
                      {sectionItems.map((it) => (
                        <div key={it.id} className="flex items-center gap-2 px-3 py-2">
                          <Input
                            className="h-8 flex-1"
                            defaultValue={it.label}
                            onBlur={(e) => updateItem(it.id, { label: e.target.value })}
                          />
                          <Input
                            className="h-8 w-32 text-right"
                            type="number"
                            step="0.01"
                            defaultValue={it.amount}
                            onBlur={(e) => updateItem(it.id, { amount: Number(e.target.value) || 0 })}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeRow(it.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="statements" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">YTD P&amp;L</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <Row label="Gross Revenue" value={fmtCurrency(pnl.grossRevenue)} />
                  <Row label="Total Expenses" value={fmtCurrency(pnl.totalExpenses)} />
                  <Row label="Net Profit" value={fmtCurrency(pnl.netProfit)} bold />
                  <Button size="sm" className="w-full mt-2" onClick={exportPnl}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Export P&amp;L
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Balance Sheet</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <Row label="Total Assets" value={fmtCurrency(bs.totalAssets)} />
                  <Row label="Total Liabilities" value={fmtCurrency(bs.totalLiabilities)} />
                  <Row label="Equity" value={fmtCurrency(bs.equity)} />
                  <Row label="L + E" value={fmtCurrency(bs.totalLiabilitiesAndEquity)} bold />
                  {!bs.balanced && (
                    <p className="text-xs text-destructive">⚠ Does not balance</p>
                  )}
                  <Button size="sm" className="w-full mt-2" onClick={exportBs}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Export Balance Sheet
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Cash Flow</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <Row label="Total Deposits" value={fmtCurrency(cf.totalDeposits)} />
                  <Row label="Total Expenses" value={fmtCurrency(cf.totalExpenses)} />
                  <Row label="Avg Monthly" value={fmtCurrency(cf.averageMonthlyDeposits)} />
                  <Row label="Net Cash Flow" value={fmtCurrency(cf.netCashFlow)} bold />
                  <Button size="sm" className="w-full mt-2" onClick={exportCombined}>
                    <FileText className="h-3.5 w-3.5 mr-1" /> Export Full Package
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-2">
            {snapshots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No statements generated yet.</p>
            ) : (
              snapshots.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium capitalize">{String(s.statement_type).replace("_", " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline">Snapshot</Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold border-t pt-1 mt-1" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}