import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  listPipelineStages, savePipelineStage, deletePipelineStage, reorderPipelineStages,
  listStageRequirements, saveStageRequirement, deleteStageRequirement,
  listStageRules, saveStageRule, deleteStageRule,
  type PipelineStage, type StageRequirement, type StageRule,
} from "@/lib/admin/pipelineStages";
import { supabase } from "@/integrations/supabase/client";

function StageRow({ s, onEdit, onDelete }: { s: PipelineStage; onEdit: () => void; onDelete: () => void; }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-3 rounded-md border bg-card p-3">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground"><GripVertical className="h-4 w-4" /></button>
      <span className="h-4 w-4 rounded" style={{ background: s.color ?? "#94A3B8" }} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{s.name}</div>
        <div className="text-xs text-muted-foreground">{s.probability_pct}% • {s.expected_days}d expected</div>
      </div>
      {s.is_terminal && <Badge variant="outline" className="text-[10px]">Terminal</Badge>}
      {!s.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
      <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
      <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
    </div>
  );
}

function RequirementsPanel({ stage }: { stage: PipelineStage }) {
  const [reqs, setReqs] = useState<StageRequirement[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const load = async () => setReqs(await listStageRequirements(stage.id));
  useEffect(() => {
    load();
    (async () => {
      const { data } = await (supabase as any).from("crm_fields").select("id,key,label").order("label");
      setFields(data ?? []);
    })();
  }, [stage.id]);
  const [pick, setPick] = useState("");
  return (
    <div className="space-y-2">
      <Label>Required fields to enter "{stage.name}"</Label>
      <div className="flex gap-2">
        <select className="flex-1 border rounded-md px-2 py-1 bg-background text-sm" value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Pick a field…</option>
          {fields.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <Button size="sm" disabled={!pick} onClick={async () => {
          const f = fields.find((x) => x.id === pick);
          await saveStageRequirement({ stage_id: stage.id, field_id: pick, field_key: f?.key, required: true, sort: reqs.length });
          setPick(""); load();
        }}>Add</Button>
      </div>
      <div className="space-y-1">
        {reqs.map((r) => {
          const f = fields.find((x) => x.id === r.field_id);
          return (
            <div key={r.id} className="flex items-center justify-between border rounded-md px-2 py-1.5 text-sm">
              <span>{f?.label ?? r.field_key ?? "field"}</span>
              <Button size="sm" variant="ghost" onClick={async () => { await deleteStageRequirement(r.id); load(); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          );
        })}
        {reqs.length === 0 && <p className="text-xs text-muted-foreground">No required fields. Deals can move into this stage without validation.</p>}
      </div>
    </div>
  );
}

function RulesPanel({ stage }: { stage: PipelineStage }) {
  const [rules, setRules] = useState<StageRule[]>([]);
  const load = async () => setRules(await listStageRules(stage.id));
  useEffect(() => { load(); }, [stage.id]);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Automation rules</Label>
        <Button size="sm" variant="outline" onClick={async () => { await saveStageRule({ stage_id: stage.id, name: "New rule", trigger: "on_enter", actions: [], is_active: true, sort: rules.length }); load(); }}><Plus className="h-3.5 w-3.5 mr-1" /> Rule</Button>
      </div>
      {rules.map((r) => (
        <Card key={r.id}><CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input value={r.name} onChange={(e) => setRules((rs) => rs.map((x) => x.id === r.id ? { ...x, name: e.target.value } : x))} onBlur={() => saveStageRule({ id: r.id, name: r.name })} />
            <select value={r.trigger} onChange={(e) => { const t = e.target.value as any; setRules((rs) => rs.map((x) => x.id === r.id ? { ...x, trigger: t } : x)); saveStageRule({ id: r.id, trigger: t }); }} className="border rounded-md px-2 py-1 text-sm bg-background">
              <option value="on_enter">On enter</option><option value="on_exit">On exit</option>
            </select>
            <Switch checked={r.is_active} onCheckedChange={(v) => { setRules((rs) => rs.map((x) => x.id === r.id ? { ...x, is_active: v } : x)); saveStageRule({ id: r.id, is_active: v }); }} />
            <Button size="sm" variant="ghost" onClick={async () => { await deleteStageRule(r.id); load(); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          </div>
          <Textarea rows={4} value={JSON.stringify(r.actions ?? [], null, 2)}
            placeholder='[{"type":"create_task","title":"Order appraisal"},{"type":"notify","user_id":"...","title":"New stage"}]'
            onChange={(e) => { try { const v = JSON.parse(e.target.value); setRules((rs) => rs.map((x) => x.id === r.id ? { ...x, actions: v } : x)); } catch {} }}
            onBlur={() => saveStageRule({ id: r.id, actions: r.actions })} />
        </CardContent></Card>
      ))}
      {rules.length === 0 && <p className="text-xs text-muted-foreground">No rules. Add automations to create tasks, notify users, or send emails when deals reach this stage.</p>}
    </div>
  );
}

export default function PipelineStagesManager() {
  const { toast } = useToast();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [editing, setEditing] = useState<PipelineStage | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => setStages(await listPipelineStages({ includeArchived: true }));
  useEffect(() => { load(); }, []);

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = stages.findIndex((s) => s.id === e.active.id);
    const newIdx = stages.findIndex((s) => s.id === e.over!.id);
    const next = arrayMove(stages, oldIdx, newIdx);
    setStages(next);
    await reorderPipelineStages(next.map((s) => s.id));
  };

  const drawer = editing ?? (creating ? ({ id: "", key: "", name: "", probability_pct: 0, expected_days: 0, is_active: true, is_archived: false, is_terminal: false, sort: stages.length, color: "#3B82F6" } as any) : null);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline Stages</h1>
          <p className="text-muted-foreground text-sm">Reorder, configure required fields, and automate the mortgage pipeline.</p>
        </div>
        <Button onClick={() => { setCreating(true); setEditing(null); }}><Plus className="h-4 w-4 mr-1" /> New stage</Button>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {stages.map((s) => (
              <StageRow key={s.id} s={s} onEdit={() => { setEditing(s); setCreating(false); }} onDelete={async () => { if (confirm(`Delete "${s.name}"?`)) { await deletePipelineStage(s.id); load(); } }} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Sheet open={!!drawer} onOpenChange={(v) => { if (!v) { setEditing(null); setCreating(false); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {drawer && (
            <>
              <SheetHeader><SheetTitle>{editing ? "Edit stage" : "New stage"}</SheetTitle></SheetHeader>
              <Tabs defaultValue="general" className="mt-4">
                <TabsList><TabsTrigger value="general">General</TabsTrigger><TabsTrigger value="reqs" disabled={!editing}>Required</TabsTrigger><TabsTrigger value="rules" disabled={!editing}>Automation</TabsTrigger></TabsList>
                <TabsContent value="general" className="space-y-3 mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Name</Label><Input value={drawer.name} onChange={(e) => setEditing((d) => ({ ...(d ?? drawer), name: e.target.value } as any))} /></div>
                    <div><Label>Key (slug)</Label><Input value={drawer.key} disabled={!!editing} onChange={(e) => setEditing((d) => ({ ...(d ?? drawer), key: e.target.value } as any))} /></div>
                  </div>
                  <div><Label>Description</Label><Textarea rows={2} value={drawer.description ?? ""} onChange={(e) => setEditing((d) => ({ ...(d ?? drawer), description: e.target.value } as any))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Color</Label><Input type="color" value={drawer.color ?? "#3B82F6"} onChange={(e) => setEditing((d) => ({ ...(d ?? drawer), color: e.target.value } as any))} /></div>
                    <div><Label>Icon (lucide)</Label><Input value={drawer.icon ?? ""} onChange={(e) => setEditing((d) => ({ ...(d ?? drawer), icon: e.target.value } as any))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Probability %</Label><Input type="number" min={0} max={100} value={drawer.probability_pct} onChange={(e) => setEditing((d) => ({ ...(d ?? drawer), probability_pct: parseInt(e.target.value || "0") } as any))} /></div>
                    <div><Label>Expected days</Label><Input type="number" min={0} value={drawer.expected_days} onChange={(e) => setEditing((d) => ({ ...(d ?? drawer), expected_days: parseInt(e.target.value || "0") } as any))} /></div>
                  </div>
                  <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={drawer.is_active} onCheckedChange={(v) => setEditing((d) => ({ ...(d ?? drawer), is_active: v } as any))} /></div>
                  <div className="flex items-center justify-between"><Label>Terminal stage</Label><Switch checked={drawer.is_terminal} onCheckedChange={(v) => setEditing((d) => ({ ...(d ?? drawer), is_terminal: v } as any))} /></div>
                  <Button className="w-full" onClick={async () => {
                    try {
                      const payload: any = { ...drawer }; if (!payload.id) delete payload.id;
                      await savePipelineStage(payload);
                      toast({ title: editing ? "Stage updated" : "Stage created" });
                      setEditing(null); setCreating(false); load();
                    } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
                  }}>Save</Button>
                </TabsContent>
                <TabsContent value="reqs" className="mt-3">{editing && <RequirementsPanel stage={editing} />}</TabsContent>
                <TabsContent value="rules" className="mt-3">{editing && <RulesPanel stage={editing} />}</TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}