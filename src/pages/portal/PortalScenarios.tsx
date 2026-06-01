import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePortalBinding } from "@/hooks/usePortalBinding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

export default function PortalScenarios() {
  const { user } = useAuth();
  const { binding } = usePortalBinding();
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [acks, setAcks] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const load = async () => {
    if (!binding?.lead_id) { setScenarios([]); return; }
    const [{ data: s }, { data: a }] = await Promise.all([
      supabase.from("loan_scenarios").select("*").eq("lead_id", binding.lead_id).order("created_at"),
      supabase.from("loan_scenario_acknowledgements").select("scenario_id, acknowledged_at").eq("user_id", user!.id),
    ]);
    setScenarios(s ?? []);
    setAcks(Object.fromEntries((a ?? []).map((r: any) => [r.scenario_id, r.acknowledged_at])));
  };
  useEffect(() => { if (binding && user) load(); }, [binding, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const ack = async (scenarioId: string) => {
    if (!binding || !user) return;
    const { error } = await supabase.from("loan_scenario_acknowledgements").insert({
      scenario_id: scenarioId,
      deal_id: binding.deal_id,
      user_id: user.id,
      user_agent: navigator.userAgent,
    });
    if (error) {
      toast({ title: "Could not acknowledge", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Acknowledged" });
    load();
  };

  const fmt = (n: number | null | undefined) => n == null ? "—" : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const pct = (n: number | null | undefined) => n == null ? "—" : `${Number(n).toFixed(3)}%`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Loan Options</h1>
        <p className="text-muted-foreground text-sm">Review the options your loan officer prepared.</p>
      </div>
      {scenarios.length === 0 && (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No options shared yet — your loan officer will publish them here.</CardContent></Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {scenarios.map((s) => {
          const acked = acks[s.id];
          return (
            <Card key={s.id} className={acked ? "border-success/50" : ""}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-base">{s.label}</CardTitle>
                  {s.sublabel && <p className="text-xs text-muted-foreground">{s.sublabel}</p>}
                </div>
                {acked && <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />Acknowledged</Badge>}
              </CardHeader>
              <CardContent className="text-sm space-y-1.5">
                <Row label="Loan amount" value={fmt(s.loan_amount)} />
                <Row label="Rate" value={pct(s.bought_down_rate ?? s.interest_rate)} />
                <Row label="Term" value={s.loan_term_years ? `${s.loan_term_years} yr` : "—"} />
                <Row label="Principal & Interest" value={fmt(s.pi)} />
                <Row label="Estimated total PITI" value={fmt(s.total_piti)} />
                {!acked && (
                  <Button size="sm" className="w-full mt-3" onClick={() => ack(s.id)}>
                    Acknowledge this option
                  </Button>
                )}
                {acked && <p className="text-xs text-muted-foreground mt-2">Acknowledged {new Date(acked).toLocaleString()}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/40 last:border-0 pb-1 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}