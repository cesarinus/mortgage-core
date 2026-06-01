import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePortalBinding } from "@/hooks/usePortalBinding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Circle, MapPin, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Enums } from "@/integrations/supabase/types";
import { Constants } from "@/integrations/supabase/types";

type Stage = Enums<"deal_stage">;

const visibleStages: Stage[] = Constants.public.Enums.deal_stage
  .filter((s) => !["new_lead", "contacted", "lost"].includes(s)) as Stage[];

const stageLabels: Record<Stage, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  application_sent: "Application Sent",
  docs_received: "Docs Received",
  underwriting: "Underwriting",
  approved: "Approved",
  clear_to_close: "Clear to Close",
  closed: "Closed",
  lost: "Lost",
};

export default function PortalDashboard() {
  const { binding } = usePortalBinding();
  const [deal, setDeal] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!binding) return;
    (async () => {
      const [{ data: d }, { data: h }] = await Promise.all([
        supabase.from("deals").select("*").eq("id", binding.deal_id).maybeSingle(),
        supabase.from("deal_stage_history").select("*").eq("deal_id", binding.deal_id).order("changed_at"),
      ]);
      setDeal(d); setHistory(h ?? []);
    })();
  }, [binding]);

  if (!deal) return <div className="text-muted-foreground text-sm">Loading your loan…</div>;

  const currentIdx = visibleStages.indexOf(deal.stage as Stage);
  const stageReachedAt = (stage: Stage) => history.find((h) => h.new_stage === stage)?.changed_at;
  const fmt = (n: number | null) => n == null ? "—" : `$${Number(n).toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground text-sm">Here's where your loan stands today.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Your loan</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Current stage</div>
            <Badge variant="secondary" className="text-sm">{stageLabels[deal.stage as Stage] ?? deal.stage}</Badge>
          </div>
          <div>
            <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1 flex items-center gap-1"><DollarSign className="h-3 w-3" />Loan</div>
            <div className="font-medium">{fmt(deal.loan_amount)}{deal.loan_type ? ` · ${deal.loan_type}` : ""}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" />Property</div>
            <div className="font-medium truncate">{deal.property_address ?? "—"}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Progress</CardTitle></CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {visibleStages.map((s, idx) => {
              const reached = currentIdx >= idx;
              const current = currentIdx === idx;
              const at = stageReachedAt(s);
              return (
                <li key={s} className="flex items-start gap-3">
                  <div className={cn(
                    "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2",
                    reached ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40 text-muted-foreground"
                  )}>
                    {reached ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2 fill-current" />}
                  </div>
                  <div className="flex-1">
                    <div className={cn("font-medium text-sm", current && "text-primary")}>{stageLabels[s]}</div>
                    {at && <div className="text-xs text-muted-foreground">{new Date(at).toLocaleDateString()}</div>}
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}