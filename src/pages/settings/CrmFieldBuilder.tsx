import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, GripVertical, Eye, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  listModules, listSections, listFields, listFieldOptions, saveField, deleteField,
  saveSection, deleteSection, replaceFieldOptions,
  type CrmModule, type CrmSection, type CrmField, type CrmFieldOption,
} from "@/lib/crm-fields/api";

const FIELD_TYPES = [
  "text","textarea","number","currency","percent","dropdown","multiselect",
  "checkbox","radio","date","datetime","phone","email","url","address","file","signature","ai","formula",
] as const;

export default function CrmFieldBuilder() {
  const { toast } = useToast();
  const [modules, setModules] = useState<CrmModule[]>([]);
  const [moduleId, setModuleId] = useState<string>("");
  const [sections, setSections] = useState<CrmSection[]>([]);
  const [fields, setFields] = useState<CrmField[]>([]);
  const [options, setOptions] = useState<CrmFieldOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<CrmField> | null>(null);
  const [editingOptions, setEditingOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    (async () => {
      const m = await listModules(); setModules(m);
      if (m.length) setModuleId(m[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!moduleId) return;
    (async () => {
      const [s, f] = await Promise.all([listSections(moduleId), listFields(moduleId)]);
      setSections(s); setFields(f);
      setOptions(await listFieldOptions(f.map(x => x.id)));
    })();
  }, [moduleId]);

  const sectionLabel = (id: string | null) => sections.find(s => s.id === id)?.label ?? "—";
  const currentModule = modules.find(m => m.id === moduleId);

  const openNew = () => {
    setEditing({
      module_id: moduleId, section_id: sections[0]?.id ?? null,
      internal_name: "", label: "", field_type: "text",
      required: false, hidden: false, read_only: false, active: true,
      default_value: null, placeholder: null, sort_order: (fields.at(-1)?.sort_order ?? 0) + 10,
    });
    setEditingOptions([]);
  };

  const openEdit = (f: CrmField) => {
    setEditing(f);
    setEditingOptions(options.filter(o => o.field_id === f.id).map(o => ({ value: o.value, label: o.label })));
  };

  const handleSaveField = async () => {
    if (!editing) return;
    try {
      await saveField(editing as any);
      const refreshed = await listFields(moduleId);
      // find the freshly saved field
      const saved = refreshed.find(f => f.internal_name === editing.internal_name && f.module_id === moduleId);
      if (saved && ["dropdown","multiselect","radio"].includes(editing.field_type || "")) {
        await replaceFieldOptions(saved.id, editingOptions);
      }
      setFields(refreshed);
      setOptions(await listFieldOptions(refreshed.map(x => x.id)));
      toast({ title: "Field saved" });
      setEditing(null);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (f: CrmField) => {
    if (!confirm(`Delete field "${f.label}"? Existing values for this field will also be removed.`)) return;
    try { await deleteField(f.id); setFields(await listFields(moduleId)); }
    catch (e: any) { toast({ title: "Delete failed", description: e.message, variant: "destructive" }); }
  };

  const addSection = async () => {
    const label = prompt("New section name:")?.trim(); if (!label) return;
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    try {
      await saveSection({ module_id: moduleId, slug, label, sort_order: (sections.at(-1)?.sort_order ?? 0) + 10 });
      setSections(await listSections(moduleId));
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const removeSection = async (s: CrmSection) => {
    if (s.is_system) return toast({ title: "System section can't be deleted" });
    if (!confirm(`Delete section "${s.label}"?`)) return;
    try { await deleteSection(s.id); setSections(await listSections(moduleId)); }
    catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const fieldsBySection = useMemo(() => {
    const m: Record<string, CrmField[]> = {};
    for (const f of fields) { (m[f.section_id ?? "_"] ||= []).push(f); }
    return m;
  }, [fields]);

  if (loading) return <div className="flex items-center gap-2 p-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM Fields</h1>
          <p className="text-muted-foreground text-sm">Create custom fields and sections across the CRM — no code required.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={moduleId} onValueChange={setModuleId}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>{modules.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add field</Button>
        </div>
      </div>

      <Tabs defaultValue="fields">
        <TabsList>
          <TabsTrigger value="fields">Fields ({fields.length})</TabsTrigger>
          <TabsTrigger value="sections">Sections ({sections.length})</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="conditions" disabled>Conditional Logic</TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-12 px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase border-b">
                <div className="col-span-4">Field</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-3">Section</div>
                <div className="col-span-1">Req</div>
                <div className="col-span-1">Active</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>
              {fields.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No fields yet for {currentModule?.label}. Add one to start.</div>}
              {fields.map((f) => (
                <div key={f.id} className="grid grid-cols-12 px-4 py-2 items-center border-b hover:bg-muted/30 text-sm">
                  <div className="col-span-4 flex items-center gap-2">
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{f.label}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{f.internal_name}</div>
                    </div>
                  </div>
                  <div className="col-span-2"><Badge variant="secondary">{f.field_type}</Badge></div>
                  <div className="col-span-3 text-xs">{sectionLabel(f.section_id)}</div>
                  <div className="col-span-1">{f.required ? <Badge className="h-5">Req</Badge> : <span className="text-muted-foreground text-xs">—</span>}</div>
                  <div className="col-span-1">{f.active ? <Badge variant="outline" className="h-5 text-emerald-600 border-emerald-600/40">On</Badge> : <Badge variant="secondary" className="h-5">Off</Badge>}</div>
                  <div className="col-span-1 flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(f)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(f)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sections" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div><CardTitle>Sections</CardTitle><CardDescription>Group fields into sections shown on each record.</CardDescription></div>
              <Button size="sm" onClick={addSection}><Plus className="h-4 w-4 mr-1" /> New section</Button>
            </CardHeader>
            <CardContent className="space-y-1">
              {sections.map(s => (
                <div key={s.id} className="flex items-center justify-between border rounded-md p-2.5">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{s.label} {s.is_system && <Badge variant="secondary" className="ml-2 text-[10px]">System</Badge>}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{s.slug}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{(fieldsBySection[s.id] ?? []).length} fields</span>
                    {!s.is_system && <Button size="sm" variant="ghost" onClick={() => removeSection(s)}><Trash2 className="h-3 w-3 text-destructive" /></Button>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout" className="mt-4">
          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" /> Layout preview</CardTitle><CardDescription>How the record screen renders custom fields.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {sections.filter(s => !s.hidden).map(s => (
                <div key={s.id}>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">{s.label}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(fieldsBySection[s.id] ?? []).map(f => (
                      <div key={f.id} className="border rounded-md p-2 bg-muted/20">
                        <div className="text-[11px] text-muted-foreground">{f.label}{f.required && " *"}</div>
                        <div className="text-xs font-mono text-muted-foreground/70">{f.field_type}</div>
                      </div>
                    ))}
                    {(fieldsBySection[s.id] ?? []).length === 0 && <div className="text-xs text-muted-foreground italic col-span-2">No fields</div>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit field" : "New field"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Label</Label><Input value={editing.label ?? ""} onChange={(e) => setEditing({ ...editing, label: e.target.value })} /></div>
                <div><Label>Internal name</Label><Input value={editing.internal_name ?? ""} onChange={(e) => setEditing({ ...editing, internal_name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} className="font-mono" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select value={editing.field_type} onValueChange={(v) => setEditing({ ...editing, field_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Section</Label>
                  <Select value={editing.section_id ?? ""} onValueChange={(v) => setEditing({ ...editing, section_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{sections.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Description</Label><Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Default value</Label><Input value={editing.default_value ?? ""} onChange={(e) => setEditing({ ...editing, default_value: e.target.value || null })} /></div>
                <div><Label>Placeholder</Label><Input value={editing.placeholder ?? ""} onChange={(e) => setEditing({ ...editing, placeholder: e.target.value || null })} /></div>
              </div>
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2"><Switch checked={!!editing.required} onCheckedChange={(v) => setEditing({ ...editing, required: v })} /><Label>Required</Label></div>
                <div className="flex items-center gap-2"><Switch checked={!!editing.hidden} onCheckedChange={(v) => setEditing({ ...editing, hidden: v })} /><Label>Hidden</Label></div>
                <div className="flex items-center gap-2"><Switch checked={!!editing.read_only} onCheckedChange={(v) => setEditing({ ...editing, read_only: v })} /><Label>Read-only</Label></div>
                <div className="flex items-center gap-2"><Switch checked={editing.active !== false} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /><Label>Active</Label></div>
              </div>
              {["dropdown","multiselect","radio"].includes(editing.field_type || "") && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  {editingOptions.map((o, i) => (
                    <div key={i} className="flex gap-2">
                      <Input placeholder="value" value={o.value} onChange={(e) => { const c = [...editingOptions]; c[i].value = e.target.value; setEditingOptions(c); }} />
                      <Input placeholder="label" value={o.label} onChange={(e) => { const c = [...editingOptions]; c[i].label = e.target.value; setEditingOptions(c); }} />
                      <Button size="sm" variant="ghost" onClick={() => setEditingOptions(editingOptions.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => setEditingOptions([...editingOptions, { value: "", label: "" }])}><Plus className="h-3 w-3 mr-1" /> Add option</Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSaveField}><Save className="h-4 w-4 mr-1" /> Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}