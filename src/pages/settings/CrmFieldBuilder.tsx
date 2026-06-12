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
  listSectionPermissions, upsertSectionPermission,
  listAuditLogs,
  APP_ROLES, ROLE_LABELS,
  type CrmModule, type CrmSection, type CrmField, type CrmFieldOption,
  type CrmFieldPermission, type CrmFieldCondition, type CrmSectionPermission, type CrmAuditLog,
  type AppRole, type ConditionClause,
} from "@/lib/crm-fields/api";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ConditionsTab, PermissionsTab, HistoryTab } from "./CrmBuilderTabs";

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
  const [sectionPerms, setSectionPerms] = useState<CrmSectionPermission[]>([]);
  const [auditLogs, setAuditLogs] = useState<CrmAuditLog[]>([]);
  const [auditActor, setAuditActor] = useState<string>("__all__");
  const [auditUsers, setAuditUsers] = useState<{ id: string; name: string }[]>([]);
  const [auditFrom, setAuditFrom] = useState<string>("");
  const [auditTo, setAuditTo] = useState<string>("");
  const [diffLog, setDiffLog] = useState<CrmAuditLog | null>(null);
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
      const [p, c, sp] = await Promise.all([
        listFieldPermissions(ids), listFieldConditions(ids), listSectionPermissions(s.map((x) => x.id)),
      ]);
      setPermissions(p); setConditions(c); setSectionPerms(sp);
    })();
  }, [moduleId]);

  // Audit logs
  const refreshAudit = async () => {
    const logs = await listAuditLogs({
      module_id: moduleId,
      actor_id: auditActor !== "__all__" ? auditActor : undefined,
      from: auditFrom || undefined,
      to: auditTo || undefined,
    });
    setAuditLogs(logs);
    // hydrate actor names
    const actorIds = Array.from(new Set(logs.map((l) => l.actor_id).filter(Boolean) as string[]));
    if (actorIds.length) {
      const { data } = await (supabase as any).from("profiles").select("id, first_name, last_name, email").in("id", actorIds);
      setAuditUsers((data ?? []).map((u: any) => ({ id: u.id, name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "—" })));
    } else setAuditUsers([]);
  };
  useEffect(() => { if (moduleId) refreshAudit(); }, [moduleId, auditActor, auditFrom, auditTo]);

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

  const filteredFields = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fields.filter((f) => {
      if (typeFilter !== "__all__" && f.field_type !== typeFilter) return false;
      if (sectionFilter !== "__all__" && (f.section_id ?? "") !== sectionFilter) return false;
      if (q && !`${f.label} ${f.internal_name}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [fields, search, typeFilter, sectionFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredFields.length / pageSize));
  const pagedFields = filteredFields.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [search, typeFilter, sectionFilter, moduleId, pageSize]);

  const usedTypes = Array.from(new Set(fields.map((f) => f.field_type)));
  const ModIcon = (slug: string, icon: string | null) => MODULE_ICONS[icon ?? ""] ?? User;
  const currentMod = modules.find((m) => m.id === moduleId);
  const CurrentModIcon = currentMod ? ModIcon(currentMod.slug, currentMod.icon) : User;

  if (loading) return <div className="flex items-center gap-2 p-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="grid grid-cols-[260px_1fr] gap-6 -mx-2">
      {/* Left rail: modules */}
      <aside className="flex flex-col gap-4">
        <div className="px-2">
          <h1 className="text-xl font-bold tracking-tight">CRM Fields</h1>
          <p className="text-muted-foreground text-xs mt-1">Customize fields and sections across the CRM</p>
        </div>
        <div>
          <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Modules</div>
          <nav className="space-y-0.5">
            {modules.map((m) => {
              const Icon = ModIcon(m.slug, m.icon);
              const active = m.id === moduleId;
              return (
                <button
                  key={m.id}
                  onClick={() => setModuleId(m.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors text-left",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground/80 hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{m.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <Card className="mt-auto">
          <CardContent className="p-4 space-y-3">
            <div>
              <div className="text-sm font-semibold">Custom Module</div>
              <div className="text-xs text-muted-foreground mt-0.5">Create custom modules to fit your business.</div>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => toast({ title: "Coming soon", description: "Custom modules are coming soon." })}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New Module
            </Button>
          </CardContent>
        </Card>
      </aside>

      {/* Right pane */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <CurrentModIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">{currentMod?.label}</h2>
                <p className="text-sm text-muted-foreground">Manage {currentMod?.label.toLowerCase()} information fields and layout.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-1.5" /> Preview</Button>
              <Button size="sm" onClick={openNew} className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-1.5" /> Add Field</Button>
              <Button variant="ghost" size="icon" className="h-9 w-9"><MoreVertical className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="fields">
          <div className="px-5 border-b">
            <TabsList className="bg-transparent h-auto p-0 gap-6 rounded-none">
              {[
                { v: "fields", l: "Fields" },
                { v: "sections", l: "Sections" },
                { v: "layout", l: "Layout" },
                { v: "conditions", l: "Conditional Logic" },
                { v: "permissions", l: "Permissions" },
                { v: "history", l: "History" },
              ].map((t) => (
                <TabsTrigger
                  key={t.v}
                  value={t.v}
                  className="relative rounded-none border-b-2 border-transparent bg-transparent px-0 py-3 text-sm text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold"
                >
                  {t.l}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="fields" className="m-0 p-5 space-y-4">
            {/* Filter bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search fields..."
                  className="pl-9 bg-muted/40 border-muted"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Types</SelectItem>
                  {usedTypes.map((t) => <SelectItem key={t} value={t}>{typeMeta(t).label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All Sections" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Sections</SelectItem>
                  {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0"><Settings2 className="h-4 w-4" /></Button>
            </div>

            {/* Table */}
            <div className="rounded-lg border overflow-hidden">
              <div className="grid grid-cols-12 px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase bg-muted/40 border-b">
                <div className="col-span-4">Field Label</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-3">Section</div>
                <div className="col-span-1 text-center">Required</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>
              {filteredFields.length === 0 && (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  {fields.length === 0 ? `No fields yet for ${currentMod?.label}. Add one to start.` : "No fields match your filters."}
                </div>
              )}
              {pagedFields.map((f) => {
                const tm = typeMeta(f.field_type);
                const TIcon = tm.icon;
                return (
                  <div key={f.id} className="grid grid-cols-12 px-4 py-3 items-center border-b last:border-b-0 hover:bg-muted/30 text-sm">
                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 cursor-grab" />
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{f.label}</div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate">{f.internal_name}</div>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="inline-flex items-center gap-1.5">
                        <span className={cn("h-5 w-5 rounded flex items-center justify-center", tm.tone)}>
                          <TIcon className="h-3 w-3" />
                        </span>
                        <span className="text-sm">{tm.label}</span>
                      </div>
                    </div>
                    <div className="col-span-3 text-sm text-foreground/80">{sectionLabel(f.section_id)}</div>
                    <div className="col-span-1 text-center">
                      {f.required
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600 inline" />
                        : <span className="text-muted-foreground">—</span>}
                    </div>
                    <div className="col-span-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-6 px-2 font-medium border-0",
                          f.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {f.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="col-span-1 flex justify-end gap-0.5">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(f)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(f)}>
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {filteredFields.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredFields.length)} of {filteredFields.length} fields
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
                    const n = i + 1;
                    return (
                      <Button
                        key={n}
                        size="icon"
                        variant={page === n ? "default" : "outline"}
                        className="h-8 w-8"
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Rows per page</span>
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </TabsContent>

        <TabsContent value="sections" className="m-0 p-5">
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

        <TabsContent value="layout" className="m-0 p-5">
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

        <TabsContent value="permissions" className="m-0 p-5">
          <PermissionsTab
            fields={fields}
            sections={sections}
            permissions={permissions}
            sectionPerms={sectionPerms}
            onChangedField={async () => setPermissions(await listFieldPermissions(fields.map((x) => x.id)))}
            onChangedSection={async () => setSectionPerms(await listSectionPermissions(sections.map((x) => x.id)))}
          />
        </TabsContent>

        <TabsContent value="conditions" className="m-0 p-5">
          <ConditionsTab
            fields={fields}
            sections={sections}
            conditions={conditions}
            onChanged={async () => setConditions(await listFieldConditions(fields.map((x) => x.id)))}
          />
        </TabsContent>

        <TabsContent value="history" className="m-0 p-5">
          <HistoryTab
            logs={auditLogs}
            users={auditUsers}
            actor={auditActor}
            from={auditFrom}
            to={auditTo}
            onActor={setAuditActor}
            onFrom={setAuditFrom}
            onTo={setAuditTo}
            onOpen={setDiffLog}
          />
          <Dialog open={!!diffLog} onOpenChange={(o) => !o && setDiffLog(null)}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Change details</DialogTitle></DialogHeader>
              {diffLog && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <Label className="text-muted-foreground">Before</Label>
                    <pre className="bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">{JSON.stringify(diffLog.before, null, 2) || "—"}</pre>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">After</Label>
                    <pre className="bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">{JSON.stringify(diffLog.after, null, 2) || "—"}</pre>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
        </Tabs>
      </Card>

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