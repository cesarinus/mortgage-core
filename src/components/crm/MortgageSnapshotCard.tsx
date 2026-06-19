import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Home, DollarSign, RefreshCw, MapPin, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function money(n?: number | null) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(n));
}
function pct(n?: number | null) {
  if (n === null || n === undefined) return "—";
  return `${Number(n).toFixed(1)}%`;
}

export function MortgageSnapshotCard({ personId, leadId }: { personId?: string | null; leadId?: string | null }) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [regen, setRegen] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    let q = (supabase as any).from("mortgage_snapshots").select("*").limit(1);
    if (personId) q = q.eq("person_id", personId);
    else if (leadId) q = q.eq("lead_id", leadId);
    else { setData(null); setLoading(false); return; }
    const { data: row } = await q.maybeSingle();
    setData(row);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [personId, leadId]);

  const regenerate = async () => {
    if (!personId) {
      toast({ title: "Link a person first", description: "Snapshot needs a Person record.", variant: "destructive" });
      return;
    }
    setRegen(true);
    try {
      const { error } = await (supabase as any).rpc("generate_mortgage_snapshot", { _person_id: personId });
      if (error) throw error;
      await load();
      toast({ title: "Snapshot refreshed" });
    } catch (e: any) {
      toast({ title: "Refresh failed", description: e?.message, variant: "destructive" });
    } finally { setRegen(false); }
  };

  if (loading) return null;
  if (!data) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Home className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Mortgage Snapshot</h3>
        </div>
        <div className="flex items-center gap-2">
          {data.loan_purpose && <Badge variant="outline" className="text-[10px] capitalize">{data.loan_purpose}</Badge>}
          <Button size="sm" variant="ghost" onClick={regenerate} disabled={regen}>
            <RefreshCw className={`h-3.5 w-3.5 ${regen ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {data.property_address && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">{data.property_address}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
        <Stat label="Purchase price" value={money(data.purchase_price)} />
        <Stat label="Loan amount" value={money(data.loan_amount)} />
        <Stat label="Down payment" value={`${money(data.down_payment)}${data.down_payment_pct ? ` (${pct(data.down_payment_pct)})` : ""}`} />
        <Stat label="LTV" value={pct(data.ltv)} />
        <Stat label="Occupancy" value={data.occupancy ?? "—"} />
        <Stat label="Program" value={data.loan_program ?? "—"} />
      </div>

      {data.documents_required > 0 && (
        <div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span>Application progress</span>
            <span className="font-medium text-foreground">{data.completion_pct}%</span>
          </div>
          <Progress value={data.completion_pct} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground mt-1">{data.documents_uploaded}/{data.documents_required} docs uploaded</p>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground truncate">{value}</p>
    </div>
  );
}