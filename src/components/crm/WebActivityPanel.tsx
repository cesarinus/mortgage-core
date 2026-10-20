import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, MousePointerClick, Calculator, Eye } from "lucide-react";

const ICONS: Record<string, any> = { page_view: Eye, calculator_use: Calculator, cta_click: MousePointerClick };
const LABELS: Record<string, string> = { page_view: "Viewed", calculator_use: "Used calculator", cta_click: "Clicked", identify: "Identified" };

export function WebActivityPanel({ leadId }: { leadId: string }) {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [v, e] = await Promise.all([
        supabase.from("website_visitors").select("*").eq("lead_id", leadId),
        supabase.from("website_events").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(200),
      ]);
      setVisitors(v.data ?? []);
      setEvents(e.data ?? []);
      setLoading(false);
    })();
  }, [leadId]);

  if (loading) return <Skeleton className="h-40 w-full" />;
  if (events.length === 0)
    return <Card className="p-6 text-sm text-muted-foreground">No website visits recorded for this lead yet.</Card>;

  const visits = visitors.reduce((s, v) => s + (v.visit_count ?? 0), 0);
  const score = visitors.reduce((s, v) => s + (v.intent_score ?? 0), 0);
  const last = visitors.map((v) => v.last_seen_at).sort().pop();
  const first = visitors[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Visits" value={visits} />
        <Stat label="Page views" value={events.filter((e) => e.event_type === "page_view").length} />
        <Stat label="Web intent points" value={score} />
        <Stat label="Last seen" value={last ? new Date(last).toLocaleString() : "—"} />
      </div>
      {first?.utm_source || first?.first_referrer ? (
        <p className="text-xs text-muted-foreground">
          First came from: {[first.utm_source, first.utm_medium, first.utm_campaign].filter(Boolean).join(" / ") || first.first_referrer}
        </p>
      ) : null}
      <Card className="divide-y">
        {events.map((e) => {
          const Icon = ICONS[e.event_type] ?? Globe;
          const meta = e.metadata ?? {};
          return (
            <div key={e.id} className="flex items-start gap-3 p-3 text-sm">
              <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate">
                  <span className="text-muted-foreground">{LABELS[e.event_type] ?? e.event_type} </span>
                  <span className="font-medium">{meta.title || e.path}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {e.site ?? ""} · {e.path}
                  {meta.calculator ? ` · ${meta.calculator}` : ""}
                  {meta.price_range ? ` · price ${meta.price_range}` : ""}
                  {meta.cta ? ` · ${meta.cta}` : ""}
                </div>
              </div>
              <div className="text-right shrink-0">
                {e.points > 0 && <Badge variant="secondary">+{e.points}</Badge>}
                <div className="text-xs text-muted-foreground mt-1">{new Date(e.created_at).toLocaleString()}</div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-lg font-semibold leading-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
