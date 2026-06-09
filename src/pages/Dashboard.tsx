import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign, TrendingUp, CheckCircle2, Wallet, Sparkles, ArrowRight,
  Phone, FileText, Mail, Lock, AlertTriangle, Activity, Trophy, Target,
  Flame, ArrowUpRight, Plus,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

type Stage = "application_sent" | "underwriting" | "approved" | "clear_to_close" | "closed" | "lost";

const FUNNEL_DEF: { key: string; label: string; matcher: (l: any, p: any) => boolean }[] = [
  { key: "lead",          label: "Lead",            matcher: (l) => ["new_lead", "contacted"].includes(l.status) },
  { key: "application",   label: "Application",     matcher: (_, p) => p?.stage === "application_sent" },
  { key: "processing",    label: "Processing",      matcher: (l) => l.status === "qualified" },
  { key: "underwriting",  label: "Underwriting",    matcher: (_, p) => p?.stage === "underwriting" },
  { key: "ctc",           label: "Clear to Close",  matcher: (_, p) => p?.stage === "clear_to_close" || p?.stage === "approved" },
  { key: "funded",        label: "Funded",          matcher: (_, p) => p?.stage === "closed" },
];

const fmtMoney = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` :
  n >= 1_000     ? `$${(n / 1_000).toFixed(1)}K`     :
  `$${n.toLocaleString()}`;

export default function Dashboard() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState<string>("");
  const [leads, setLeads] = useState<any[]>([]);
  const [opps, setOpps] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [profileR, leadsR, oppsR, tasksR, actR] = await Promise.all([
        supabase.from("profiles").select("first_name").eq("id", user.id).maybeSingle(),
        supabase.from("leads").select("id,first_name,last_name,status,loan_amount,lead_score,is_stuck,last_activity_at,created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("pipeline_opportunities").select("id,lead_id,stage,loan_amount,close_date").limit(500),
        supabase.from("crm_tasks").select("id,title,priority,due_at,status,lead_id").eq("status", "open").order("due_at", { ascending: true, nullsFirst: false }).limit(8),
        supabase.from("crm_activities").select("id,activity_type,title,body,created_at,lead_id").order("created_at", { ascending: false }).limit(8),
      ]);
      setFirstName((profileR.data?.first_name as string) || "");
      setLeads(leadsR.data ?? []);
      setOpps(oppsR.data ?? []);
      setTasks(tasksR.data ?? []);
      setActivities(actR.data ?? []);
    })();
  }, [user]);

  const oppsByLead = useMemo(() => {
    const m = new Map<string, any>();
    opps.forEach((o) => m.set(o.lead_id, o));
    return m;
  }, [opps]);

  const funnel = useMemo(() => {
    return FUNNEL_DEF.map((stage) => {
      const matching = leads.filter((l) => stage.matcher(l, oppsByLead.get(l.id)));
      const volume = matching.reduce((s, l) => {
        const opp = oppsByLead.get(l.id);
        return s + Number(opp?.loan_amount ?? l.loan_amount ?? 0);
      }, 0);
      return { ...stage, count: matching.length, volume };
    });
  }, [leads, oppsByLead]);

  const pipelineValue = useMemo(
    () => opps.filter((o) => o.stage !== "closed" && o.stage !== "lost").reduce((s, o) => s + Number(o.loan_amount || 0), 0),
    [opps],
  );
  const expectedRevenue = Math.round(pipelineValue * 0.0125); // 1.25% commission baseline
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const closingThisMonth = opps.filter((o) => o.close_date && new Date(o.close_date) >= monthStart && o.stage !== "closed" && o.stage !== "lost");
  const fundedThisMonth = opps.filter((o) => o.stage === "closed" && o.close_date && new Date(o.close_date) >= monthStart);
  const fundedAmount = fundedThisMonth.reduce((s, o) => s + Number(o.loan_amount || 0), 0);

  const kpis = [
    { label: "Pipeline Value",       value: fmtMoney(pipelineValue),    delta: "+12.5%", icon: DollarSign, accent: "from-orange-500/20 to-orange-500/0" },
    { label: "Expected Revenue",     value: fmtMoney(expectedRevenue),  delta: "+8.3%",  icon: TrendingUp, accent: "from-emerald-500/20 to-emerald-500/0" },
    { label: "Closing This Month",   value: String(closingThisMonth.length), delta: "+20%", icon: CheckCircle2, accent: "from-violet-500/20 to-violet-500/0" },
    { label: "Funded This Month",    value: fmtMoney(fundedAmount),     delta: "+15.7%", icon: Wallet, accent: "from-sky-500/20 to-sky-500/0" },
  ];

  const hotLeads = leads.filter((l) => (l.lead_score ?? 0) >= 70).slice(0, 4);
  const stuckBorrowers = leads.filter((l) => l.is_stuck).slice(0, 4);

  // mock data (not yet backed by real sources, per scope decision)
  const rates = [
    { label: "Conventional 30Y", value: 6.625, delta: -0.05 },
    { label: "FHA 30Y",          value: 6.250, delta: -0.10 },
    { label: "VA 30Y",           value: 6.125, delta: -0.05 },
    { label: "USDA 30Y",         value: 6.375, delta:  0.00 },
  ];
  const aiOpportunities = [
    { label: "Refinance opportunities",        count: 3, revenue: 14_400 },
    { label: "HELOC opportunities",            count: 2, revenue:  6_200 },
    { label: "FHA streamline opportunities",   count: 5, revenue: 18_750 },
    { label: "Cash-out refinance",             count: 4, revenue: 22_800 },
  ];
  const partners = [
    { name: "Maria Gonzalez", company: "Coldwell Banker", loans: 14, volume: 4_820_000 },
    { name: "John Smith",     company: "Independent",     loans:  9, volume: 3_140_000 },
    { name: "ABC Realty",     company: "ABC Realty",      loans:  7, volume: 2_460_000 },
  ];
  const scorecard = [
    { label: "Calls Made",     value: 48,  target: 60 },
    { label: "Applications",   value: 22,  target: 25 },
    { label: "Pre-Approvals",  value: 17,  target: 20 },
    { label: "Loans Funded",   value: fundedThisMonth.length, target: 15 },
  ];
  const forecast = [
    { m: "Aug", revenue: 42_000 },
    { m: "Sep", revenue: 51_200 },
    { m: "Oct", revenue: 58_400 },
    { m: "Nov", revenue: 64_800 },
    { m: "Dec", revenue: 72_500 },
    { m: "Jan", revenue: 81_000 },
  ];

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
  })();

  const activityIcon = (t: string) => {
    switch (t) {
      case "call":       return <Phone className="h-3.5 w-3.5" />;
      case "note":       return <FileText className="h-3.5 w-3.5" />;
      case "attachment": return <FileText className="h-3.5 w-3.5" />;
      case "meeting":    return <CheckCircle2 className="h-3.5 w-3.5" />;
      default:           return <Activity className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {greeting}{firstName ? `, ${firstName}` : ""} <span className="inline-block animate-float">👋</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening with your mortgage business today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/5 text-primary">
            <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Live
          </Badge>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="kpi-card group">
            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${k.accent} blur-2xl`} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</p>
                <p className="mt-2 font-display text-3xl font-bold tracking-tight">{k.value}</p>
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
                  <ArrowUpRight className="h-3 w-3" /> {k.delta} vs last month
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/50 p-2 text-primary transition-transform group-hover:scale-110">
                <k.icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Copilot + Funnel */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
          <CardHeader className="relative pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-lg bg-gradient-to-br from-primary to-orange-dark p-1.5 text-primary-foreground shadow-orange">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              AI Copilot
              <Badge variant="outline" className="ml-auto border-primary/30 text-[10px] uppercase tracking-wider text-primary">
                Today
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Today's Priorities
            </p>
            <ul className="space-y-2.5">
              {[
                { t: "Call Carlos Betancourt", s: "Missing income docs", c: "text-rose-400" },
                { t: "Follow up with Realtor", s: "Guadalupe Martinez file", c: "text-amber-400" },
                { t: "Reprice FHA file", s: "Rates dropped 0.25%", c: "text-emerald-400" },
                { t: "2 leads likely to convert", s: "High intent · Last 24h", c: "text-sky-400" },
              ].map((p) => (
                <li key={p.t} className="flex gap-3 rounded-lg border border-border/60 bg-background/40 p-2.5">
                  <div className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${p.c.replace("text-", "bg-")}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{p.t}</p>
                    <p className="text-xs text-muted-foreground">{p.s}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Button asChild className="mt-2 w-full gap-2 bg-gradient-to-r from-violet-600 to-primary text-white shadow-lg hover:opacity-95">
              <Link to="/ask">
                <Sparkles className="h-4 w-4" /> Ask AI Assistant
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Pipeline funnel */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Mortgage Pipeline Funnel</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
              <Link to="/pipeline">View pipeline <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                const maxCount = Math.max(1, ...funnel.map((f) => f.count));
                return funnel.map((f, i) => {
                  const prev = funnel[i - 1]?.count;
                  const conv = prev && prev > 0 ? Math.round((f.count / prev) * 100) : null;
                  return (
                    <div key={f.key} className="grid grid-cols-12 items-center gap-3">
                      <div className="col-span-3 sm:col-span-2 text-sm font-medium">{f.label}</div>
                      <div className="col-span-7 sm:col-span-8">
                        <div className="h-7 overflow-hidden rounded-md bg-muted/60">
                          <div
                            className="flex h-full items-center justify-end gap-2 bg-gradient-to-r from-primary/80 to-primary px-2 text-xs font-medium text-primary-foreground transition-all"
                            style={{ width: `${Math.max(8, (f.count / maxCount) * 100)}%` }}
                          >
                            <span>{f.count}</span>
                            <span className="opacity-70">·</span>
                            <span className="opacity-80">{fmtMoney(f.volume)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 text-right text-xs text-muted-foreground">
                        {conv !== null ? `${conv}%` : "—"}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity + Partners + Scorecard */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" /> Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No recent activity</p>
            ) : (
              <ul className="space-y-3">
                {activities.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {activityIcon(a.activity_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{a.title || a.activity_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-amber-500" /> Top Referral Partners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {partners.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-2.5">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? "bg-amber-500/20 text-amber-500" :
                    i === 1 ? "bg-slate-400/20 text-slate-300" :
                              "bg-orange-700/20 text-orange-400"
                  }`}>
                    #{i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.company}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-medium">{p.loans}</p>
                    <p className="text-[10px] text-muted-foreground">{fmtMoney(p.volume)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-emerald-500" /> Loan Officer Scorecard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {scorecard.map((s) => {
              const pct = Math.min(100, Math.round((s.value / s.target) * 100));
              return (
                <div key={s.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{s.label}</span>
                    <span className="font-mono text-muted-foreground">{s.value}/{s.target}</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Alerts + Rates + Borrowers */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Alerts & Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {[
                { sev: "high", t: "VOE expired",         s: "Carlos Betancourt · loan #2841" },
                { sev: "high", t: "Missing W2",          s: "Guadalupe Martinez · loan #2839" },
                { sev: "med",  t: "DTI exceeds guidelines", s: "Julien Rodrigues · loan #2832" },
                { sev: "low",  t: "COE not uploaded",    s: "John Pierre · loan #2829" },
              ].map((a) => (
                <li key={a.t} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-2.5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    a.sev === "high" ? "bg-rose-500" : a.sev === "med" ? "bg-amber-500" : "bg-sky-500"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{a.t}</p>
                    <p className="text-xs text-muted-foreground">{a.s}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    {a.sev}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4 text-primary" /> Rate Monitor
              <Badge variant="outline" className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">Mock</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {rates.map((r) => (
                <li key={r.label} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 p-2.5">
                  <span className="text-sm">{r.label}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-base font-bold">{r.value.toFixed(3)}%</span>
                    <span className={`text-xs font-medium ${
                      r.delta < 0 ? "text-emerald-500" : r.delta > 0 ? "text-rose-500" : "text-muted-foreground"
                    }`}>
                      {r.delta === 0 ? "—" : `${r.delta > 0 ? "+" : ""}${r.delta.toFixed(2)}`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4 text-rose-500" /> Borrowers Requiring Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(stuckBorrowers.length === 0 && hotLeads.length === 0) ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No borrowers need action.</p>
            ) : (
              <ul className="space-y-2.5">
                {[...stuckBorrowers, ...hotLeads].slice(0, 5).map((l) => (
                  <li key={l.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {(l.first_name?.[0] ?? "?") + (l.last_name?.[0] ?? "")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link to={`/crm/leads/${l.id}`} className="truncate text-sm font-medium hover:underline">
                        {l.first_name} {l.last_name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {l.is_stuck ? "Stuck > 72h" : "High intent lead"} · score {l.lead_score ?? 0}
                      </p>
                    </div>
                    <Badge className={l.is_stuck ? "bg-rose-500/15 text-rose-500" : "bg-amber-500/15 text-amber-500"}>
                      {l.is_stuck ? "URGENT" : "HOT"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Opportunities + Tasks + Forecast */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> AI Opportunities
              <Badge variant="outline" className="ml-auto text-[10px] uppercase tracking-wider text-primary">Beta</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {aiOpportunities.map((o) => (
                <li key={o.label} className="flex items-center justify-between rounded-lg border border-border/60 bg-gradient-to-r from-background/40 to-primary/5 p-2.5">
                  <div>
                    <p className="text-sm font-medium">{o.count} {o.label}</p>
                    <p className="text-xs text-muted-foreground">Est. revenue {fmtMoney(o.revenue)}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="gap-1 text-xs text-primary hover:bg-primary/10">
                    Review <ArrowRight className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Tasks & Follow-Ups
            </CardTitle>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">All clear — no open tasks.</p>
            ) : (
              <ul className="space-y-2">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-2.5">
                    <Checkbox className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.due_at ? `Due ${new Date(t.due_at).toLocaleDateString()}` : "No due date"}
                      </p>
                    </div>
                    <Badge variant={t.priority === "high" ? "destructive" : "outline"} className="text-[10px] uppercase">
                      {t.priority}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> Revenue Forecast
              <Badge variant="outline" className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">Mock</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={forecast} margin={{ left: -20, right: 0, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`$${Number(v).toLocaleString()}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revG)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
