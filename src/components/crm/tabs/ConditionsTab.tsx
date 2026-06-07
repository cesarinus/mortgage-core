import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Circle, MinusCircle, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import {
  CONDITION_CATEGORIES,
  LoanCondition,
  fetchConditions,
  updateConditionStatus,
} from "@/lib/crm/conditions";
import { MarkReceivedDrawer } from "@/components/crm/conditions/MarkReceivedDrawer";

interface Props {
  leadId?: string;
}

const statusBadge: Record<string, { label: string; cls: string; Icon: any }> = {
  pending: { label: "Pending", cls: "bg-muted text-muted-foreground", Icon: Circle },
  received: { label: "Received", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", Icon: CheckCircle2 },
  waived: { label: "Waived", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30", Icon: MinusCircle },
};

export function ConditionsTab({ leadId }: Props) {
  const [items, setItems] = useState<LoanCondition[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerFor, setDrawerFor] = useState<LoanCondition | null>(null);

  const load = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      setItems(await fetchConditions(leadId));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load conditions");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, LoanCondition[]>();
    for (const c of items) {
      const key = CONDITION_CATEGORIES.find((g) => g.key === c.category) ? c.category : "other";
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    return map;
  }, [items]);

  const changeStatus = async (c: LoanCondition, next: string) => {
    if (next === "received") {
      setDrawerFor(c);
      return;
    }
    try {
      await updateConditionStatus(c.id, next as any);
      toast.success("Status updated");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update");
    }
  };

  if (!leadId) {
    return <div className="text-sm text-muted-foreground p-6">Lead context required.</div>;
  }

  return (
    <div className="space-y-4">
      {items.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No conditions yet. Conditions are seeded automatically when this loan enters the pipeline.
          </CardContent>
        </Card>
      )}

      {CONDITION_CATEGORIES.map(({ key, label }) => {
        const rows = grouped.get(key) ?? [];
        if (rows.length === 0) return null;
        const received = rows.filter((r) => r.status === "received").length;
        return (
          <Card key={key}>
            <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileCheck2 className="h-4 w-4" /> {label}
              </CardTitle>
              <span className="text-xs text-muted-foreground">{received}/{rows.length} received</span>
            </CardHeader>
            <CardContent className="pt-0 divide-y divide-border/60">
              {rows.map((c) => {
                const meta = statusBadge[c.status] ?? statusBadge.pending;
                const Icon = meta.Icon;
                return (
                  <div key={c.id} className="py-3 flex items-start gap-3">
                    <Icon className={`h-4 w-4 mt-0.5 ${c.status === "received" ? "text-emerald-600" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{c.title}</span>
                        {c.required && <Badge variant="outline" className="text-[10px]">Required</Badge>}
                        <Badge variant="outline" className={`text-[10px] ${meta.cls}`}>{meta.label}</Badge>
                      </div>
                      {c.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                      )}
                      {c.status === "received" && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Received{c.received_via ? ` via ${c.received_via}` : ""}
                          {c.received_at ? ` on ${new Date(c.received_at).toLocaleDateString()}` : ""}
                          {c.document_name ? ` · ${c.document_name}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={c.status} onValueChange={(v) => changeStatus(c, v)}>
                        <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="received">Received</SelectItem>
                          <SelectItem value="waived">Waived</SelectItem>
                        </SelectContent>
                      </Select>
                      {c.status !== "received" && (
                        <Button size="sm" variant="outline" onClick={() => setDrawerFor(c)}>
                          Mark complete
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      <MarkReceivedDrawer
        open={!!drawerFor}
        onOpenChange={(v) => { if (!v) setDrawerFor(null); }}
        condition={drawerFor}
        onSaved={load}
      />
    </div>
  );
}