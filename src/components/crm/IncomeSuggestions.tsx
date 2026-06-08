import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Check, X, FileText, Loader2 } from "lucide-react";
import {
  fetchPendingExtractions,
  dismissExtraction,
  markApplied,
  mergeIntoPaymentDetails,
  type IncomeExtraction,
} from "@/lib/crm/incomeExtractions";
import type { PaymentDetails } from "@/lib/crm/paymentDetails";

interface Props {
  leadId: string;
  contactId?: string | null;
  /** Apply: receives the merged PaymentDetails. Parent persists + updates its form state. */
  onApply: (next: PaymentDetails) => Promise<void> | void;
  /** Current form state used as base for merging. */
  currentForm: PaymentDetails;
  /** Refresh trigger when parent saves. */
  refreshKey?: string | number;
}

const DOC_LABEL: Record<string, string> = {
  pay_stub: "Pay stub",
  w2: "W-2",
  form_1099: "1099",
  form_1040: "1040",
  business_return: "Business return",
  unknown: "Document",
};

const fmt = (n: any) =>
  typeof n === "number" ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—";

function summary(e: IncomeExtraction): string {
  const x = e.extracted ?? {};
  if (e.doc_type === "pay_stub" && x.pay_stub) {
    return `base ${fmt(x.pay_stub.gross_base_ytd)} · OT ${fmt(x.pay_stub.overtime_ytd)} · bonus ${fmt(x.pay_stub.bonus_ytd)} · comm ${fmt(x.pay_stub.commission_ytd)}`;
  }
  if (e.doc_type === "w2" && x.w2) {
    return `${e.tax_year ?? ""} wages ${fmt(x.w2.box1_wages)}`.trim();
  }
  if (e.doc_type === "form_1099" && x.form_1099) {
    return `${e.tax_year ?? ""} NEC ${fmt(x.form_1099.nonemployee_compensation)}`.trim();
  }
  if (e.doc_type === "form_1040" && x.form_1040) {
    return `${e.tax_year ?? ""} AGI ${fmt(x.form_1040.agi)}`.trim();
  }
  if (e.doc_type === "business_return" && x.business_return) {
    return `${e.tax_year ?? ""} ${x.business_return.form ?? ""} ord. inc. ${fmt(x.business_return.ordinary_business_income)}`.trim();
  }
  return "no values extracted";
}

export function IncomeSuggestions({ leadId, contactId, onApply, currentForm, refreshKey }: Props) {
  const [items, setItems] = useState<IncomeExtraction[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchPendingExtractions(leadId, contactId ?? null);
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }, [leadId, contactId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const apply = async (ext: IncomeExtraction) => {
    setBusy(ext.id);
    try {
      const next = mergeIntoPaymentDetails(currentForm, ext);
      await onApply(next);
      await markApplied(ext.id);
      toast.success("suggestion applied");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "apply failed");
    } finally { setBusy(null); }
  };

  const dismiss = async (ext: IncomeExtraction) => {
    setBusy(ext.id);
    try {
      await dismissExtraction(ext.id);
      await load();
    } finally { setBusy(null); }
  };

  const applyAll = async () => {
    setBusy("all");
    try {
      let merged = currentForm;
      for (const ext of items) {
        if (ext.status === "failed") continue;
        merged = mergeIntoPaymentDetails(merged, ext);
      }
      await onApply(merged);
      for (const ext of items) {
        if (ext.status === "pending") await markApplied(ext.id);
      }
      toast.success("all suggestions applied");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "apply failed");
    } finally { setBusy(null); }
  };

  if (loading) return null;
  if (items.length === 0) return null;

  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <Card className="border-primary/30 bg-primary/[0.04] p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium">Suggested from uploaded documents</span>
        <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
        {pendingCount > 1 && (
          <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={applyAll} disabled={busy !== null}>
            {busy === "all" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
            Apply all
          </Button>
        )}
      </div>
      <ul className="space-y-1.5">
        {items.map((ext) => (
          <li key={ext.id} className="rounded-md border bg-background p-2 text-xs flex items-start gap-2">
            <FileText className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{DOC_LABEL[ext.doc_type]}</Badge>
                {ext.status === "failed" && <Badge variant="destructive" className="text-[10px]">failed</Badge>}
                <span className="truncate text-muted-foreground">{ext.attachment?.file_name}</span>
              </div>
              <div className="text-foreground mt-0.5">
                {ext.status === "failed" ? (ext.error ?? "extraction failed") : summary(ext)}
              </div>
            </div>
            {ext.status === "pending" && (
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => apply(ext)} disabled={busy !== null}>
                  {busy === ext.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => dismiss(ext)} disabled={busy !== null}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            {ext.status === "failed" && (
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => dismiss(ext)} disabled={busy !== null}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}