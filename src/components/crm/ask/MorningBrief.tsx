import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Flame, CheckSquare, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Brief = {
  stuck: any[];
  hot: any[];
  dueToday: any[];
  recentMoves: any[];
};

export function MorningBrief() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const [stuck, hot, due, moves] = await Promise.all([
        supabase.from("leads").select("id, first_name, last_name, lead_score").eq("is_stuck", true).order("lead_score", { ascending: false }).limit(5),
        supabase.from("leads").select("id, first_name, last_name, lead_score").gte("lead_score", 60).order("lead_score", { ascending: false }).limit(5),
        (supabase as any).from("crm_tasks").select("id, title, due_at, lead_id").neq("status", "done").gte("due_at", todayStart.toISOString()).lte("due_at", todayEnd.toISOString()).limit(5),
        (supabase as any).from("deal_stage_history").select("deal_id, new_stage, created_at").gte("created_at", yesterday).order("created_at", { ascending: false }).limit(5),
      ]);
      setBrief({
        stuck: stuck.data ?? [],
        hot: hot.data ?? [],
        dueToday: due.data ?? [],
        recentMoves: moves.data ?? [],
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <Skeleton className="h-32 w-full rounded-xl" />;
  if (!brief) return null;

  const total = brief.stuck.length + brief.hot.length + brief.dueToday.length + brief.recentMoves.length;
  if (total === 0) {
    return (
      <Card className="p-4 bg-gradient-to-br from-muted/40 to-background">
        <p className="text-sm text-muted-foreground">All quiet. No stuck leads, no overdue tasks. Good morning ✨</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 via-background to-background border-primary/20">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Your morning brief</span>
        <span className="text-xs text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <BriefStat icon={<AlertTriangle className="h-4 w-4" />} label="Stuck leads" count={brief.stuck.length} tone="warning" />
        <BriefStat icon={<Flame className="h-4 w-4" />} label="High-score leads" count={brief.hot.length} tone="primary" />
        <BriefStat icon={<CheckSquare className="h-4 w-4" />} label="Tasks due today" count={brief.dueToday.length} tone="info" />
        <BriefStat icon={<ArrowRight className="h-4 w-4" />} label="Pipeline moves (24h)" count={brief.recentMoves.length} tone="success" />
      </div>
      {brief.stuck.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {brief.stuck.slice(0, 3).map((l) => (
            <Link key={l.id} to={`/crm/leads/${l.id}`}>
              <Badge variant="outline" className="hover:bg-muted">
                {l.first_name} {l.last_name} · {l.lead_score ?? 0}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

function BriefStat({ icon, label, count, tone }: { icon: React.ReactNode; label: string; count: number; tone: string }) {
  const toneClass = {
    warning: "text-amber-600 bg-amber-500/10",
    primary: "text-primary bg-primary/10",
    info: "text-blue-600 bg-blue-500/10",
    success: "text-emerald-600 bg-emerald-500/10",
  }[tone] ?? "text-foreground bg-muted";
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${toneClass} mb-2`}>{icon}</div>
      <div className="text-2xl font-semibold leading-none">{count}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}