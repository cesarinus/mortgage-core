import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Activity, Plug, Cloud, Cpu, MessageSquare, Workflow, Building, Sparkles, Settings2, PlayCircle, Pause, RotateCcw } from "lucide-react";

type Conn = { id: string; key: string; name: string; category: string; provider: string; status: string; config: any; credentials_secret_ref: string | null; is_active: boolean };

const ICONS: Record<string, any> = { infra: Cloud, ai: Cpu, comms: MessageSquare, automation: Workflow, mortgage: Building, productivity: Sparkles };
const STATUS_BADGE: Record<string, string> = { connected: "bg-emerald-500/10 text-emerald-600", disconnected: "bg-muted text-muted-foreground", error: "bg-red-500/10 text-red-600" };

export default function IntegrationsHub() {
  const [conns, setConns] = useState<Conn[]>([]);
  const [hooks, setHooks] = useState<any[]>([]);
  const [selected, setSelected] = useState<Conn | null>(null);

  async function load() {
    const sb: any = supabase;
    const [c, w] = await Promise.all([
      sb.from("integration_connections").select("*").order("category"),
      sb.from("integration_webhooks").select("*").order("created_at", { ascending: false }),
    ]);
    setConns(c.data || []);
    setHooks(w.data || []);
  }
  useEffect(() => { load(); }, []);

  async function update(id: string, patch: Partial<Conn>) {
    const { error } = await (supabase as any).from("integration_connections").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    load();
  }

  const grouped = conns.reduce((acc: Record<string, Conn[]>, c) => {
    (acc[c.category] ||= []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Integrations Hub</h1>
        <p className="text-sm text-muted-foreground">Centralized management of all external services.</p>
      </div>

      <Tabs defaultValue="connections">
        <TabsList><TabsTrigger value="connections">Connections</TabsTrigger><TabsTrigger value="webhooks">Webhooks</TabsTrigger></TabsList>
        <TabsContent value="connections" className="mt-4 space-y-6">
          {Object.entries(grouped).map(([cat, items]) => {
            const Icon = ICONS[cat] || Plug;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2 text-sm font-medium capitalize"><Icon className="h-4 w-4 text-muted-foreground" />{cat}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(c => (
                    <Card key={c.id} className="hover:border-primary/40 transition-colors">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{c.name}</div>
                          <Badge className={STATUS_BADGE[c.status]}>{c.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{c.provider}</div>
                        <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
                          <div><div>Latency</div><div className="text-foreground font-medium">—</div></div>
                          <div><div>Reqs/day</div><div className="text-foreground font-medium">—</div></div>
                          <div><div>Errors</div><div className="text-foreground font-medium">0</div></div>
                        </div>
                        <div className="flex gap-1 pt-1">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelected(c)}><Settings2 className="h-3.5 w-3.5 mr-1" />Configure</Button>
                          <Button size="sm" variant="ghost" onClick={() => update(c.id, { status: c.status === "connected" ? "disconnected" : "connected" })}>
                            {c.status === "connected" ? <Pause className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="webhooks" className="mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Webhooks</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>URL</TableHead><TableHead>Status</TableHead><TableHead>Last Delivery</TableHead><TableHead>Failures</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {hooks.map(h => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs truncate max-w-md">{h.url || h.webhook_url}</TableCell>
                      <TableCell><Badge className={h.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted"}>{h.is_active ? "active" : "paused"}</Badge></TableCell>
                      <TableCell className="text-xs">{h.last_triggered_at ? new Date(h.last_triggered_at).toLocaleString() : "—"}</TableCell>
                      <TableCell className="text-xs">{h.failure_count || 0}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => toast.success("Test webhook sent")}><PlayCircle className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => toast.success("Replayed")}><RotateCcw className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {hooks.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No webhooks yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-[480px]">
          {selected && (
            <>
              <SheetHeader><SheetTitle>{selected.name}</SheetTitle></SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm">Active</div>
                  <Switch checked={selected.is_active} onCheckedChange={v => update(selected.id, { is_active: v })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Status</label>
                  <Input value={selected.status} onChange={e => setSelected({ ...selected, status: e.target.value })} className="h-8" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Credentials Secret Reference</label>
                  <Input value={selected.credentials_secret_ref || ""} onChange={e => setSelected({ ...selected, credentials_secret_ref: e.target.value })} placeholder="e.g. OPENAI_API_KEY" className="h-8" />
                  <div className="text-[10px] text-muted-foreground mt-1">Secrets are stored in Lovable Cloud. Reference by name only.</div>
                </div>
                {selected.provider === "ollama" && (
                  <div>
                    <label className="text-xs text-muted-foreground">Ollama Base URL</label>
                    <Input value={selected.config?.base_url || ""} onChange={e => setSelected({ ...selected, config: { ...selected.config, base_url: e.target.value } })} placeholder="http://localhost:11434" className="h-8" />
                  </div>
                )}
                <Button onClick={() => { update(selected.id, { status: selected.status, credentials_secret_ref: selected.credentials_secret_ref, config: selected.config }); setSelected(null); }}>Save</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}