import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentRateMeta, clearMortgageRateCache, type MarketRate } from "@/lib/mortgage/rateService";
import { TrendingUp, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export default function MarketRatesSettings() {
  const { toast } = useToast();
  const [meta, setMeta] = useState<MarketRate | null>(null);
  const [override, setOverride] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    clearMortgageRateCache();
    const m = await getCurrentRateMeta(true).catch(() => null);
    setMeta(m);
  };
  useEffect(() => { load(); }, []);

  const callFunction = async (body: Record<string, any> = {}) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-mortgage-rates", { body });
      if (error) throw error;
      if ((data as any)?.success === false) throw new Error((data as any).error || "Failed");
      toast({ title: "Market rate updated" });
      await load();
    } catch (e: any) {
      toast({ title: "Refresh failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const onRefresh = () => callFunction({});
  const onSaveOverride = () => {
    const v = parseFloat(override);
    if (isNaN(v) || v <= 0 || v > 25) {
      toast({ title: "Invalid rate", description: "Enter the base rate (e.g. 6.74).", variant: "destructive" });
      return;
    }
    callFunction({ manual_rate: v });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Mortgage Market Rates
        </CardTitle>
        <CardDescription>
          Daily 30-Year Fixed rate used across Mortgage Snapshot, DTI, Affordability, and Lock/Float.
          Includes a +0.125% pricing buffer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Source" value={meta?.source ?? "—"} />
          <Stat label="Market 30Y" value={meta ? `${meta.rate_30yr.toFixed(3)}%` : "—"} />
          <Stat label="Adjusted (+0.125%)" value={meta ? `${meta.adjusted_rate.toFixed(3)}%` : "—"} highlight />
          <Stat
            label="Last update"
            value={meta ? format(new Date(meta.fetched_at), "MMM d, p") : "—"}
          />
        </div>
        {meta?.is_manual_override && (
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
            Manual override active
          </Badge>
        )}
        <div className="flex flex-wrap items-end gap-3 border-t pt-4">
          <Button onClick={onRefresh} disabled={busy} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${busy ? "animate-spin" : ""}`} /> Refresh now
          </Button>
          <div className="space-y-1">
            <Label className="text-xs">Manual override (base %)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 6.74"
                value={override}
                onChange={(e) => setOverride(e.target.value)}
                className="w-32"
              />
              <Button onClick={onSaveOverride} disabled={busy || !override}>Save</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-primary/40 bg-primary/5" : "border-border"}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-semibold tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}