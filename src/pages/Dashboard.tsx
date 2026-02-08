import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Contact, Kanban, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({ leads: 0, contacts: 0, activeDeals: 0, closedDeals: 0 });

  useEffect(() => {
    const load = async () => {
      const [leads, contacts, active, closed] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("deals").select("id", { count: "exact", head: true }).not("stage", "in", '("closed","lost")'),
        supabase.from("deals").select("id", { count: "exact", head: true }).eq("stage", "closed"),
      ]);
      setStats({
        leads: leads.count ?? 0,
        contacts: contacts.count ?? 0,
        activeDeals: active.count ?? 0,
        closedDeals: closed.count ?? 0,
      });
    };
    load();
  }, []);

  const cards = [
    { title: "Total Leads", value: stats.leads, icon: Users, color: "text-primary" },
    { title: "Contacts", value: stats.contacts, icon: Contact, color: "text-accent" },
    { title: "Active Deals", value: stats.activeDeals, icon: Kanban, color: "text-warning" },
    { title: "Closed Deals", value: stats.closedDeals, icon: TrendingUp, color: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your Mortgage CRM overview.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
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
    </div>
  );
}
