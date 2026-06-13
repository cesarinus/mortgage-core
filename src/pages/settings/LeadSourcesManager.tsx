import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Archive, ArchiveRestore, GripVertical, Pencil, Plus, Trash2, BarChart3 } from "lucide-react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  listLeadSources, saveLeadSource, deleteLeadSource, archiveLeadSource, reorderLeadSources,
  listLeadSourceRules, saveLeadSourceRule, deleteLeadSourceRule,
  type LeadSource, type LeadSourceRule,
} from "@/lib/admin/leadSources";
import { supabase } from "@/integrations/supabase/client";

function SortableRow({ s, onEdit, onArchive, onDelete }: { s: LeadSource; onEdit: () => void; onArchive: () => void; onDelete: () => void; }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-3 rounded-md border bg-card p-3">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground"><GripVertical className="h-4 w-4" /></button>
      <span className="h-4 w-4 rounded-full border" style={{ background: s.color ?? "#94A3B8" }} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{s.name}</div>
        {s.description && <div className="text-xs text-muted-foreground truncate">{s.description}</div>}
      </div>
      <Badge variant="outline" className="text-[10px]">Score {s.default_lead_score}</Badge>
      {!s.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
      {s.is_archived && <Badge variant="outline" className="text-[10px]">Archived</Badge>}
      <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
      <Button size="sm" variant="ghost" onClick={onArchive}>
        {s.is_archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
      </Button>
      <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
    </div>
  );
}

function AnalyticsTab() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const sb = supabase as any;
      const { data: sources } = await sb.from("lead_sources").select("id,name,color").eq("is_archived", false);
      const { data: leads } = await sb.from("leads").select("id, source_id, status, created_at");
      const { data: opps } = await sb.from("pipeline_opportunities").select("id, lead_id, stage, loan_amount");
      const byLead: Record<string, any[]> = {};
      (opps ?? []).forEach((o: any) => { (byLead[o.lead_id] ||= []).push(o); });
      const out = (sources ?? []).map((s: any) => {
        const ls = (leads ?? []).filter((l: any) => l.source_id === s.id);
        const apps = ls.filter((l: any) => (byLead[l.id] ?? []).length).length;
        const funded = ls.filter((l: any) => (byLead[l.id] ?? []).some((o: any) => o.stage === "closed")).length;
        const revenue = ls.reduce((sum: number, l: any) => sum + ((byLead[l.id] ?? []).filter((o: any) => o.stage === "closed").reduce((a: number, o: any) => a + Number(o.loan_amount ?? 0), 0) * 0.01), 0);
        return { ...s, leads: ls.length, apps, funded, conv: ls.length ? Math.round((funded / ls.length) * 1000) / 10 : 0, revenue };
      }).sort((a: any, b: any) => b.leads - a.leads);
      setRows(out);
    })();
  }, []);
  const best = useMemo(() => [...rows].sort((a, b) => b.conv - a.conv)[0], [rows]);
  const top = useMemo(() => [...rows].sort((a, b) => b.revenue - a.revenue)[0], [rows]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardHeader className="pb-2"><CardDescription>Best Converting</CardDescription><CardTitle className="text-lg">{best?.name ?? "—"}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{best?.conv ?? 0}% conversion</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Highest Revenue</CardDescription><CardTitle className="text-lg">{top?.name ?? "—"}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">${Math.round(top?.revenue ?? 0).toLocaleString()}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Most Active</CardDescription><CardTitle className="text-lg">{rows[0]?.name ?? "—"}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{rows[0]?.leads ?? 0} leads</CardContent></Card>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-muted/40">
              <tr><th className="text-left p-2">Source</th><th className="text-right p-2">Leads</th><th className="text-right p-2">Apps</th><th className="text-right p-2">Funded</th><th className="text-right p-2">Conv %</th><th className="text-right p-2">Revenue</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t"><td className="p-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: r.color ?? "#94A3B8" }} />{r.name}</td><td className="p-2 text-right">{r.leads}</td><td className="p-2 text-right">{r.apps}</td><td className="p-2 text-right">{r.funded}</td><td className="p-2 text-right">{r.conv}%</td><td className="p-2 text-right">${Math.round(r.revenue).toLocaleString()}</td></tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No data yet.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function RulesPanel({ source }: { source: LeadSource }) {
  const [rules, setRules] = useState<LeadSourceRule[]>([]);
  const { toast } = useToast();
  const load = async () => setRules(await listLeadSourceRules(source.id));
  useEffect(() => { load(); }, [source.id]);
  const add = async () => {
    await saveLeadSourceRule({ source_id: source.id, name: "New rule", actions: [], conditions: {}, is_active: true, sort: rules.length });
    load();
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Automation rules</Label>
        <Button size="sm" variant="outline" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" /> Rule</Button>
      </div>
      {rules.length === 0 && <p className="text-xs text-muted-foreground">No rules yet. Use rules to auto-assign, score, tag, or create tasks for leads from this source.</p>}
      {rules.map((r) => (
        <Card key={r.id}><CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input value={r.name} onChange={(e) => setRules((rs) => rs.map((x) => x.id === r.id ? { ...x, name: e.target.value } : x))}
              onBlur={() => saveLeadSourceRule({ id: r.id, name: r.name })} />
            <Switch checked={r.is_active} onCheckedChange={(v) => { setRules((rs) => rs.map((x) => x.id === r.id ? { ...x, is_active: v } : x)); saveLeadSourceRule({ id: r.id, is_active: v }); }} />
            <Button size="sm" variant="ghost" onClick={async () => { await deleteLeadSourceRule(r.id); load(); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          </div>
          <Textarea
            placeholder='Actions JSON, e.g. [{"type":"set_score","value":85},{"type":"create_task","title":"Call within 5 min"}]'
            value={JSON.stringify(r.actions ?? [], null, 2)} rows={4}
            onChange={(e) => {
              try { const v = JSON.parse(e.target.value); setRules((rs) => rs.map((x) => x.id === r.id ? { ...x, actions: v } : x)); }
              catch { /* ignore parse */ }
            }}
            onBlur={async () => { try { await saveLeadSourceRule({ id: r.id, actions: r.actions }); toast({ title: "Rule saved" }); } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); } }}
          />
        </CardContent></Card>
      ))}
    </div>
  );
}

export default function LeadSourcesManager() {
  const { toast } = useToast();
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [editing, setEditing] = useState<LeadSource | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => setSources(await listLeadSources({ includeArchived: true }));
  useEffect(() => { load(); }, []);

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = sources.findIndex((s) => s.id === e.active.id);
    const newIdx = sources.findIndex((s) => s.id === e.over!.id);
    const next = arrayMove(sources, oldIdx, newIdx);
    setSources(next);
    await reorderLeadSources(next.map((s) => s.id));
  };

  const drawer = editing ?? (creating ? ({ id: "", name: "", default_lead_score: 0, is_active: true, is_archived: false, sort: sources.length, color: "#FF7A00" } as any) : null);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Sources</h1>
          <p className="text-muted-foreground text-sm">Manage where leads come from, automation rules, and performance analytics.</p>
        </div>
        <Button onClick={() => { setCreating(true); setEditing(null); }}><Plus className="h-4 w-4 mr-1" /> New source</Button>
      </div>

      <Tabs defaultValue="sources">
        <TabsList>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="sources" className="space-y-2 mt-4">
          <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={sources.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sources.map((s) => (
                  <SortableRow key={s.id} s={s}
                    onEdit={() => { setEditing(s); setCreating(false); }}
                    onArchive={async () => { await archiveLeadSource(s.id, !s.is_archived); load(); }}
                    onDelete={async () => { if (confirm(`Delete "${s.name}"?`)) { await deleteLeadSource(s.id); load(); } }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </TabsContent>
        <TabsContent value="analytics" className="mt-4"><AnalyticsTab /></TabsContent>
      </Tabs>

      <Sheet open={!!drawer} onOpenChange={(v) => { if (!v) { setEditing(null); setCreating(false); } }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {drawer && (
            <>
              <SheetHeader><SheetTitle>{editing ? "Edit source" : "New source"}</SheetTitle></SheetHeader>
              <div className="space-y-3 mt-4">
                <div><Label>Name</Label><Input value={drawer.name} onChange={(e) => setEditing((d) => d ? { ...d, name: e.target.value } : ({ ...drawer, name: e.target.value } as any))} /></div>
                <div><Label>Description</Label><Textarea rows={2} value={drawer.description ?? ""} onChange={(e) => setEditing((d) => ({ ...(d ?? drawer), description: e.target.value } as any))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Color</Label><Input type="color" value={drawer.color ?? "#FF7A00"} onChange={(e) => setEditing((d) => ({ ...(d ?? drawer), color: e.target.value } as any))} /></div>
                  <div><Label>Icon (lucide)</Label><Input value={drawer.icon ?? ""} placeholder="Home" onChange={(e) => setEditing((d) => ({ ...(d ?? drawer), icon: e.target.value } as any))} /></div>
                </div>
                <div><Label>Default lead score</Label><Input type="number" value={drawer.default_lead_score} onChange={(e) => setEditing((d) => ({ ...(d ?? drawer), default_lead_score: parseInt(e.target.value || "0") } as any))} /></div>
                <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={drawer.is_active} onCheckedChange={(v) => setEditing((d) => ({ ...(d ?? drawer), is_active: v } as any))} /></div>
                <Button className="w-full" onClick={async () => {
                  try {
                    const payload: any = { ...drawer }; if (!payload.id) delete payload.id;
                    await saveLeadSource(payload);
                    toast({ title: editing ? "Source updated" : "Source created" });
                    setEditing(null); setCreating(false); load();
                  } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
                }}>Save</Button>
                {editing && <div className="pt-4 border-t"><RulesPanel source={editing} /></div>}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}