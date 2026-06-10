import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User, Palette, Bell, Calendar, Bot, Brain, Cpu, Workflow, Sparkles,
  Database, FileSliders, Layers, ListChecks, Settings2, FlaskConical, FileSearch,
  Building, Users, CreditCard, Shield, Plug, Phone, Search,
  Activity, History, HardDriveDownload, ChevronRight, Upload, type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { label: string; path: string; icon: LucideIcon; soon?: boolean };
type Group = { label: string; items: Item[] };

const NAV: Group[] = [
  { label: "Personal", items: [
    { label: "Profile", path: "/settings/profile", icon: User },
    { label: "Appearance", path: "/settings/appearance", icon: Palette },
    { label: "Notifications", path: "/settings/notifications", icon: Bell, soon: true },
    { label: "Calendar", path: "/settings/calendar", icon: Calendar },
  ]},
  { label: "AI & Automation", items: [
    { label: "AI Assistant", path: "/settings/ai-assistant", icon: Bot },
    { label: "Digital Twin", path: "/settings/digital-twin", icon: Brain, soon: true },
    { label: "AI Agents", path: "/settings/ai-agents", icon: Cpu, soon: true },
    { label: "Automations", path: "/settings/automations", icon: Workflow, soon: true },
    { label: "Predictions", path: "/settings/predictions", icon: Sparkles, soon: true },
  ]},
  { label: "Mortgage", items: [
    { label: "CRM Fields", path: "/settings/crm-fields", icon: FileSliders },
    { label: "Loan Settings", path: "/settings/loan-settings", icon: Layers, soon: true },
    { label: "Pipeline Stages", path: "/settings/pipeline-stages", icon: Workflow, soon: true },
    { label: "Lead Sources", path: "/settings/lead-sources", icon: Database, soon: true },
    { label: "LOS Mapping", path: "/settings/los-mappings", icon: Settings2 },
    { label: "Compliance", path: "/settings/compliance", icon: Shield, soon: true },
  ]},
  { label: "Business", items: [
    { label: "Company", path: "/settings/company", icon: Building, soon: true },
    { label: "Team", path: "/settings/team", icon: Users, soon: true },
    { label: "Billing", path: "/settings/billing", icon: CreditCard, soon: true },
    { label: "Security", path: "/settings/security", icon: Shield, soon: true },
  ]},
  { label: "Integrations", items: [
    { label: "ARIVE LOS", path: "/settings/integrations/arive", icon: Plug },
    { label: "Twilio", path: "/settings/integrations/twilio", icon: Phone, soon: true },
    { label: "OpenAI", path: "/settings/integrations/openai", icon: Sparkles, soon: true },
    { label: "Supabase", path: "/settings/integrations/supabase", icon: Database, soon: true },
    { label: "Zapier", path: "/settings/integrations/zapier", icon: Plug },
    { label: "Email", path: "/settings/integrations/email", icon: Bell },
    { label: "Google", path: "/settings/integrations/google", icon: Plug, soon: true },
    { label: "Outlook", path: "/settings/integrations/outlook", icon: Plug, soon: true },
  ]},
  { label: "System", items: [
    { label: "Health Center", path: "/settings/health", icon: Activity, soon: true },
    { label: "Audit Logs", path: "/settings/los-logs", icon: History },
    { label: "Backups", path: "/settings/backups", icon: HardDriveDownload, soon: true },
    { label: "Import ARIVE", path: "/settings/import-arive", icon: Upload },
    { label: "Payload Tester", path: "/settings/los-tester", icon: FlaskConical },
    { label: "Schema Gap", path: "/settings/los-gap-report", icon: FileSearch },
  ]},
];

export default function SettingsLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return NAV;
    const needle = q.toLowerCase();
    return NAV
      .map(g => ({ ...g, items: g.items.filter(i =>
        i.label.toLowerCase().includes(needle) || g.label.toLowerCase().includes(needle)
      )}))
      .filter(g => g.items.length > 0);
  }, [q]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full">
      {/* Left nav */}
      <aside className="w-64 shrink-0 border-r bg-sidebar/40 overflow-y-auto">
        <div className="p-3 border-b sticky top-0 bg-sidebar/80 backdrop-blur">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search settings..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtered[0]?.items[0]) {
                  navigate(filtered[0].items[0].path);
                }
              }}
              className="h-8 pl-7 text-xs"
            />
          </div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2 px-1">Settings</p>
        </div>
        <nav className="p-2 space-y-4">
          {filtered.map((g) => (
            <div key={g.label}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-1">{g.label}</div>
              <div className="space-y-0.5">
                {g.items.map((it) => {
                  const active = pathname === it.path || (it.path !== "/settings" && pathname.startsWith(it.path));
                  const Icon = it.icon;
                  return (
                    <NavLink
                      key={it.path}
                      to={it.path}
                      className={cn(
                        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground/80 hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("h-3.5 w-3.5", active ? "text-primary" : "text-muted-foreground")} />
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.soon && <span className="text-[9px] px-1 py-px rounded bg-muted text-muted-foreground">SOON</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Center content */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <Outlet />
      </main>

      {/* Right advisor */}
      <aside className="hidden xl:block w-80 shrink-0 border-l bg-sidebar/30 overflow-y-auto p-4 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" /> NG Agent OS Advisor
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>AI recommendations to optimize your CRM.</p>
            <div className="rounded-md border p-2 hover:bg-muted/40 cursor-default">
              <div className="font-medium text-foreground">3 recommendations</div>
              <div className="text-[11px]">to improve your workflow</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="font-medium text-foreground">2 automations</div>
              <div className="text-[11px]">can be optimized</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-emerald-500" /> System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5">
            {[
              ["Database", "Healthy", "emerald"],
              ["ARIVE LOS", "Connected", "emerald"],
              ["Resend", "Connected", "emerald"],
              ["AI Gateway", "Healthy", "emerald"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-emerald-500">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <History className="h-4 w-4" /> Recent Changes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <div>Field builder enabled · today</div>
            <div>ARIVE mapping updated · today</div>
            <div>LOS logs dashboard added · yesterday</div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}