import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users, Contact, Kanban, TrendingUp, Flame, BarChart3, Target, DollarSign } from "lucide-react";

interface DashboardStats {
  leads: number;
  contacts: number;
  activeDeals: number;
  closedDeals: number;
  hotLeads: number;
  conversionRate: number;
  pipelineValue: number;
  leadsBySource: { source: string; count: number }[];
  hotLeadsList: { id: string; first_name: string; last_name: string; lead_score: number; source: string | null; created_at: string }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    leads: 0, contacts: 0, activeDeals: 0, closedDeals: 0,
    hotLeads: 0, conversionRate: 0, pipelineValue: 0,
    leadsBySource: [], hotLeadsList: [],
  });

  useEffect(() => {
    const load = async () => {
      const [leads, contacts, active, closed, allLeads, deals] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("deals").select("id", { count: "exact", head: true }).not("stage", "in", '("closed","lost")'),
        supabase.from("deals").select("id", { count: "exact", head: true }).eq("stage", "closed"),
        supabase.from("leads").select("id, first_name, last_name, lead_score, source, status, created_at").order("lead_score", { ascending: false }),
        supabase.from("deals").select("loan_amount, stage").not("stage", "eq", "lost"),
      ]);

      const allLeadData = allLeads.data ?? [];
      const hotList = allLeadData.filter(l => (l.lead_score ?? 0) > 70);
      const converted = allLeadData.filter(l => l.status === "converted").length;
      const total = allLeadData.length;

      // Leads by source
      const sourceMap: Record<string, number> = {};
      allLeadData.forEach(l => {
        const s = l.source || "unknown";
        sourceMap[s] = (sourceMap[s] || 0) + 1;
      });
      const leadsBySource = Object.entries(sourceMap)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      // Pipeline value
      const pipelineValue = (deals.data ?? [])
        .filter(d => d.stage !== "closed" && d.stage !== "lost")
        .reduce((sum, d) => sum + (Number(d.loan_amount) || 0), 0);

      setStats({
        leads: leads.count ?? 0,
        contacts: contacts.count ?? 0,
        activeDeals: active.count ?? 0,
        closedDeals: closed.count ?? 0,
        hotLeads: hotList.length,
        conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
        pipelineValue,
        leadsBySource,
        hotLeadsList: hotList.slice(0, 5).map(l => ({
          id: l.id, first_name: l.first_name, last_name: l.last_name,
          lead_score: l.lead_score ?? 0, source: l.source, created_at: l.created_at,
        })),
      });
    };
    load();
  }, []);

  const summaryCards = [
    { title: "Total Leads", value: stats.leads, icon: Users, color: "text-primary" },
    { title: "Contacts", value: stats.contacts, icon: Contact, color: "text-accent" },
    { title: "Active Deals", value: stats.activeDeals, icon: Kanban, color: "text-amber-500" },
    { title: "Closed Deals", value: stats.closedDeals, icon: TrendingUp, color: "text-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your Mortgage CRM overview.</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hot Leads</CardTitle>
            <Flame className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.hotLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">Score &gt; 70</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
            <Target className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Leads → Converted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline Value</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${stats.pipelineValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Active deals total</p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Hot Leads List + Leads by Source */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Hot Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4 text-red-500" /> Hot Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.hotLeadsList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hot leads yet</p>
            ) : (
              <div className="space-y-3">
                {stats.hotLeadsList.map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="font-medium text-sm">{l.first_name} {l.last_name}</p>
                      <p className="text-xs text-muted-foreground">{l.source ?? "unknown"} · {new Date(l.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge className="bg-red-500/15 text-red-600 font-mono">{l.lead_score}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leads by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" /> Leads by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.leadsBySource.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No lead data yet</p>
            ) : (
              <div className="space-y-3">
                {stats.leadsBySource.map((s) => {
                  const maxCount = stats.leadsBySource[0]?.count || 1;
                  return (
                    <div key={s.source} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize">{s.source}</span>
                        <span className="font-mono text-muted-foreground">{s.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${(s.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
