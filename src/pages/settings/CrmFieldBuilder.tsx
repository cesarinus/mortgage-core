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
import {
  Loader2, Plus, Trash2, GripVertical, Eye, Save, Search, Settings2,
  MoreVertical, ChevronLeft, ChevronRight, CheckCircle2, Pencil,
  User, Users, Target, FileText, Clipboard, TrendingUp, Home,
  Handshake, Building, Contact as ContactIcon, CheckSquare, Folder, Megaphone,
  Type as TypeIcon, Mail, Phone as PhoneIcon, List, Hash, Percent,
  Calendar, Link as LinkIcon, MapPin, Paperclip, PenLine, Sparkles, Sigma,
  ToggleLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  listModules, listSections, listFields, listFieldOptions, saveField, deleteField,
  saveSection, deleteSection, replaceFieldOptions,
  listFieldPermissions, upsertFieldPermission,
  listFieldConditions, saveFieldCondition, deleteFieldCondition,
  type CrmModule, type CrmSection, type CrmField, type CrmFieldOption,
  type CrmFieldPermission, type CrmFieldCondition,
} from "@/lib/crm-fields/api";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const FIELD_TYPES = [
  "text","textarea","number","currency","percent","dropdown","multiselect",
  "checkbox","radio","date","datetime","phone","email","url","address","file","signature","ai","formula",
] as const;

const MODULE_ICONS: Record<string, any> = {
  user: User, users: Users, target: Target, "file-text": FileText,
  clipboard: Clipboard, "trending-up": TrendingUp, home: Home,
  handshake: Handshake, building: Building, contact: ContactIcon,
  "check-square": CheckSquare, folder: Folder, megaphone: Megaphone,
};

const TYPE_META: Record<string, { icon: any; label: string; tone: string }> = {
  text:       { icon: TypeIcon,   label: "Text",       tone: "text-blue-600 bg-blue-50" },
  textarea:   { icon: TypeIcon,   label: "Long Text",  tone: "text-blue-600 bg-blue-50" },
  email:      { icon: Mail,       label: "Email",      tone: "text-purple-600 bg-purple-50" },
  phone:      { icon: PhoneIcon,  label: "Phone",      tone: "text-emerald-600 bg-emerald-50" },
  dropdown:   { icon: List,       label: "Dropdown",   tone: "text-amber-600 bg-amber-50" },
  multiselect:{ icon: List,       label: "Multi-select", tone: "text-amber-600 bg-amber-50" },
  radio:      { icon: List,       label: "Radio",      tone: "text-amber-600 bg-amber-50" },
  number:     { icon: Hash,       label: "Number",     tone: "text-cyan-600 bg-cyan-50" },
  currency:   { icon: Hash,       label: "Currency",   tone: "text-cyan-600 bg-cyan-50" },
  percent:    { icon: Percent,    label: "Percentage", tone: "text-pink-600 bg-pink-50" },
  checkbox:   { icon: ToggleLeft, label: "Checkbox",   tone: "text-slate-600 bg-slate-100" },
  date:       { icon: Calendar,   label: "Date",       tone: "text-indigo-600 bg-indigo-50" },
  datetime:   { icon: Calendar,   label: "Date/Time",  tone: "text-indigo-600 bg-indigo-50" },
  url:        { icon: LinkIcon,   label: "URL",        tone: "text-blue-600 bg-blue-50" },
  address:    { icon: MapPin,     label: "Address",    tone: "text-rose-600 bg-rose-50" },
  file:       { icon: Paperclip,  label: "File",       tone: "text-slate-600 bg-slate-100" },
  signature:  { icon: PenLine,    label: "Signature",  tone: "text-slate-600 bg-slate-100" },
  ai:         { icon: Sparkles,   label: "AI",         tone: "text-violet-600 bg-violet-50" },
  formula:    { icon: Sigma,      label: "Formula",    tone: "text-teal-600 bg-teal-50" },
};
const typeMeta = (t: string) => TYPE_META[t] ?? { icon: TypeIcon, label: t, tone: "text-slate-600 bg-slate-100" };

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
  const [permissions, setPermissions] = useState<CrmFieldPermission[]>([]);
  const [conditions, setConditions] = useState<CrmFieldCondition[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("__all__");
  const [sectionFilter, setSectionFilter] = useState<string>("__all__");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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
      const ids = f.map((x) => x.id);
      const [p, c] = await Promise.all([listFieldPermissions(ids), listFieldConditions(ids)]);
      setPermissions(p); setConditions(c);
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
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="conditions">Conditional Logic ({conditions.length})</TabsTrigger>
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
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0"><div><CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" /> Layout preview</CardTitle><CardDescription>How the record screen renders custom fields.</CardDescription></div><Button asChild size="sm" variant="outline"><Link to="/settings/crm-layout">Open Layout Designer</Link></Button></CardHeader>
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

        <TabsContent value="permissions" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Field permissions</CardTitle><CardDescription>Per-role view and edit access. Admins always have full access.</CardDescription></CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-12 px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase border-b">
                <div className="col-span-4">Field</div>
                <div className="col-span-4">Loan Officer</div>
                <div className="col-span-4">Processor</div>
              </div>
              {fields.map((f) => {
                const perm = (role: "loan_officer" | "processor") =>
                  permissions.find((p) => p.field_id === f.id && p.role === role) ?? { field_id: f.id, role, can_view: true, can_edit: true } as any;
                const togglePerm = async (role: "loan_officer" | "processor", patch: Partial<CrmFieldPermission>) => {
                  const cur = perm(role);
                  const next = { ...cur, ...patch };
                  await upsertFieldPermission(next);
                  setPermissions(await listFieldPermissions(fields.map((x) => x.id)));
                };
                const Row = ({ role }: { role: "loan_officer" | "processor" }) => {
                  const p = perm(role);
                  return (
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs"><Switch checked={p.can_view} onCheckedChange={(v) => togglePerm(role, { can_view: v })} /> View</label>
                      <label className="flex items-center gap-1.5 text-xs"><Switch checked={p.can_edit} onCheckedChange={(v) => togglePerm(role, { can_edit: v })} /> Edit</label>
                    </div>
                  );
                };
                return (
                  <div key={f.id} className="grid grid-cols-12 px-4 py-2 items-center border-b text-sm">
                    <div className="col-span-4"><div className="font-medium">{f.label}</div><div className="text-[10px] font-mono text-muted-foreground">{f.internal_name}</div></div>
                    <div className="col-span-4"><Row role="loan_officer" /></div>
                    <div className="col-span-4"><Row role="processor" /></div>
                  </div>
                );
              })}
              {fields.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No fields yet.</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conditions" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div><CardTitle>Conditional Logic</CardTitle><CardDescription>Show, hide, require, or lock a field based on another field's value.</CardDescription></div>
              <Button size="sm" onClick={async () => {
                if (!fields[0]) return;
                await saveFieldCondition({ field_id: fields[0].id, action: "show", rule: { all: [{ field_id: fields[0].id, op: "not_empty" }] }, sort_order: conditions.length * 10, active: true } as any);
                setConditions(await listFieldConditions(fields.map((x) => x.id)));
              }}><Plus className="h-4 w-4 mr-1" /> Add rule</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {conditions.length === 0 && <div className="text-sm text-muted-foreground italic">No rules yet.</div>}
              {conditions.map((c) => {
                const clause = c.rule?.all?.[0] ?? { field_id: fields[0]?.id ?? "", op: "not_empty" as const };
                const update = async (patch: Partial<CrmFieldCondition>) => {
                  await saveFieldCondition({ id: c.id, ...patch });
                  setConditions(await listFieldConditions(fields.map((x) => x.id)));
                };
                const updateClause = (patch: Partial<typeof clause>) => {
                  const next = { ...clause, ...patch };
                  update({ rule: { all: [next] } } as any);
                };
                return (
                  <div key={c.id} className="flex items-center gap-2 border rounded-md p-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">When</span>
                    <Select value={clause.field_id} onValueChange={(v) => updateClause({ field_id: v })}>
                      <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{fields.map((f) => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={clause.op} onValueChange={(v: any) => updateClause({ op: v })}>
                      <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["eq","neq","gt","lt","empty","not_empty"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {!["empty","not_empty"].includes(clause.op) && (
                      <Input className="w-32 h-8" value={clause.value ?? ""} onChange={(e) => updateClause({ value: e.target.value })} placeholder="value" />
                    )}
                    <span className="text-xs text-muted-foreground">then</span>
                    <Select value={c.action} onValueChange={(v: any) => update({ action: v })}>
                      <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{["show","hide","require","readonly"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">field</span>
                    <Select value={c.field_id} onValueChange={(v) => update({ field_id: v })}>
                      <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{fields.map((f) => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="ml-auto flex items-center gap-2">
                      <Switch checked={c.active} onCheckedChange={(v) => update({ active: v })} />
                      <Button size="sm" variant="ghost" onClick={async () => { await deleteFieldCondition(c.id); setConditions(await listFieldConditions(fields.map((x) => x.id))); }}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
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