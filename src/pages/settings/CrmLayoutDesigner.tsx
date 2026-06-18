import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Save, Eye, EyeOff, GripVertical, ChevronDown, Settings2,
  Smartphone, Monitor, LayoutTemplate, Plus, Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  listModules, listSections, listFields, getDefaultLayout, saveLayout,
  listLayoutTemplates, saveLayoutTemplate, deleteLayoutTemplate,
  remapTemplateLayoutForModuleDetailed,
  APP_ROLES, ROLE_LABELS,
  type CrmModule, type CrmSection, type CrmField, type CrmLayout,
  type SectionLayoutEntry, type SectionWidth, type MobileVisibility, type AppRole,
  type CrmLayoutTemplate,
} from "@/lib/crm-fields/api";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

const WIDTH_OPTIONS: { value: SectionWidth; label: string; cols: string }[] = [
  { value: "full",  label: "Full",   cols: "col-span-6" },
  { value: "half",  label: "Half",   cols: "col-span-3" },
  { value: "third", label: "Third",  cols: "col-span-2" },
];

function defaultRoleVisibility(): Record<AppRole, boolean> {
  return { admin: true, loan_officer: true, processor: true, assistant: true, realtor: true };
}
function defaultRolePermissions() {
  const o = {} as Record<AppRole, { view: boolean; edit: boolean; delete: boolean }>;
  for (const r of APP_ROLES) o[r] = { view: true, edit: r !== "realtor", delete: r === "admin" };
  return o;
}

function SortableSection({
  id, children,
}: { id: string; children: (handleProps: { listeners: any; attributes: any }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ listeners, attributes })}
    </div>
  );
}

export default function CrmLayoutDesigner() {
  const { toast } = useToast();
  const [modules, setModules] = useState<CrmModule[]>([]);
  const [moduleId, setModuleId] = useState("");
  const [sections, setSections] = useState<CrmSection[]>([]);
  const [fields, setFields] = useState<CrmField[]>([]);
  const [layout, setLayout] = useState<CrmLayout | null>(null);
  const [working, setWorking] = useState<SectionLayoutEntry[]>([]);
  const [templates, setTemplates] = useState<CrmLayoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [advancedFor, setAdvancedFor] = useState<string | null>(null);
  const [saveTplOpen, setSaveTplOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [tplShared, setTplShared] = useState(true);

  const APPLICANT_SLUGS = ["borrowers", "co_borrowers"] as const;
  const currentModule = modules.find((m) => m.id === moduleId);
  const isApplicantModule = !!currentModule && (APPLICANT_SLUGS as readonly string[]).includes((currentModule as any).slug);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    (async () => {
      const m = await listModules();
      setModules(m);
      if (m.length) setModuleId(m[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!moduleId) return;
    (async () => {
      const [s, f, l, t] = await Promise.all([
        listSections(moduleId), listFields(moduleId),
        getDefaultLayout(moduleId), listLayoutTemplates(moduleId),
      ]);
      setSections(s); setFields(f); setLayout(l); setTemplates(t);
      const stored = l?.layout?.sections ?? [];
      const merged: SectionLayoutEntry[] = s.map((sec, idx) => {
        const found = stored.find((x) => x.section_id === sec.id);
        const storedFieldIds = new Set((found?.fields ?? []).map((x) => x.field_id));
        const sectionFields = f.filter((x) => x.section_id === sec.id);
        const fieldList = [
          ...(found?.fields ?? []).filter((x) => sectionFields.some((y) => y.id === x.field_id)),
          ...sectionFields.filter((x) => !storedFieldIds.has(x.id)).map((x, i) => ({ field_id: x.id, sort: 1000 + i * 10, width: 1 as const })),
        ].map((x, i) => ({ ...x, sort: i * 10 }));
        return {
          section_id: sec.id,
          hidden: found?.hidden ?? sec.hidden,
          sort: found?.sort ?? idx * 10,
          columns: (found?.columns ?? 2) as 1 | 2,
          width: found?.width ?? "full",
          default_collapsed: found?.default_collapsed ?? false,
          mobile: found?.mobile ?? "show",
          role_visibility: { ...defaultRoleVisibility(), ...(found?.role_visibility ?? {}) },
          role_permissions: { ...defaultRolePermissions(), ...(found?.role_permissions ?? {}) },
          fields: fieldList,
        };
      }).sort((a, b) => a.sort - b.sort).map((x, i) => ({ ...x, sort: i * 10 }));
      setWorking(merged);
    })();
  }, [moduleId]);

  const sectionById = useMemo(() => Object.fromEntries(sections.map((s) => [s.id, s])), [sections]);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setWorking((items) => {
      const oldIdx = items.findIndex((i) => i.section_id === active.id);
      const newIdx = items.findIndex((i) => i.section_id === over.id);
      return arrayMove(items, oldIdx, newIdx).map((x, i) => ({ ...x, sort: i * 10 }));
    });
  };

  const updateSec = (id: string, patch: Partial<SectionLayoutEntry>) =>
    setWorking((w) => w.map((s) => s.section_id === id ? { ...s, ...patch } : s));

  const save = async () => {
    if (!moduleId) return;
    setSaving(true);
    try {
      const row: Partial<CrmLayout> = layout
        ? { id: layout.id, module_id: moduleId, layout: { sections: working } }
        : { module_id: moduleId, name: "Default", is_default: true, layout: { sections: working } };
      const id = await saveLayout(row);
      setLayout({ ...(layout ?? { module_id: moduleId, role: null, name: "Default", is_default: true } as any), id, layout: { sections: working } } as any);
      toast({ title: "Layout saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const saveAsTemplate = async () => {
    if (!tplName.trim()) return;
    try {
      await saveLayoutTemplate({
        module_id: moduleId,
        name: tplName.trim(),
        description: tplDesc.trim() || null,
        layout: { sections: working },
        scope: isApplicantModule && tplShared ? "applicant_shared" : "module_only",
      } as any);
      setTemplates(await listLayoutTemplates(moduleId));
      setSaveTplOpen(false); setTplName(""); setTplDesc(""); setTplShared(true);
      toast({ title: "Template saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const applyTemplate = async (t: CrmLayoutTemplate) => {
    let stored = t.layout?.sections ?? [];
    // Cross-module template (shared applicant template) — remap by slug/internal_name.
    if (t.module_id !== moduleId) {
      try {
        const remapped = await remapTemplateLayoutForModule({ sections: stored }, t.module_id, moduleId);
        stored = remapped.sections;
      } catch (e: any) {
        toast({ title: "Could not map template", description: e.message, variant: "destructive" });
        return;
      }
    }
    // re-merge against current sections/fields
    const merged: SectionLayoutEntry[] = sections.map((sec, idx) => {
      const found = stored.find((x) => x.section_id === sec.id);
      const sectionFields = fields.filter((x) => x.section_id === sec.id);
      const storedFieldIds = new Set((found?.fields ?? []).map((x) => x.field_id));
      const fieldList = [
        ...(found?.fields ?? []).filter((x) => sectionFields.some((y) => y.id === x.field_id)),
        ...sectionFields.filter((x) => !storedFieldIds.has(x.id)).map((x, i) => ({ field_id: x.id, sort: 1000 + i * 10, width: 1 as const })),
      ].map((x, i) => ({ ...x, sort: i * 10 }));
      return {
        section_id: sec.id,
        hidden: found?.hidden ?? false,
        sort: found?.sort ?? idx * 10,
        columns: (found?.columns ?? 2) as 1 | 2,
        width: found?.width ?? "full",
        default_collapsed: found?.default_collapsed ?? false,
        mobile: found?.mobile ?? "show",
        role_visibility: { ...defaultRoleVisibility(), ...(found?.role_visibility ?? {}) },
        role_permissions: { ...defaultRolePermissions(), ...(found?.role_permissions ?? {}) },
        fields: fieldList,
      };
    }).sort((a, b) => a.sort - b.sort).map((x, i) => ({ ...x, sort: i * 10 }));
    setWorking(merged);
    toast({ title: `Applied "${t.name}" — remember to Save` });
  };

  if (loading) return <div className="flex items-center gap-2 p-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Layout Designer</h1>
          <p className="text-muted-foreground text-sm">Drag to reorder sections. Configure width, collapse, mobile, role visibility &amp; permissions. Saves a versioned snapshot.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={moduleId} onValueChange={setModuleId}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>{modules.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select onValueChange={(id) => { const t = templates.find((x) => x.id === id); if (t) applyTemplate(t); }}>
            <SelectTrigger className="w-48"><LayoutTemplate className="h-4 w-4 mr-1" /><SelectValue placeholder="Apply template…" /></SelectTrigger>
            <SelectContent>
              {templates.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">No templates yet</div>}
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center justify-between gap-3 w-full">
                    <span>{t.name}</span>
                    {t.module_id !== moduleId && (
                      <Badge variant="secondary" className="text-[10px]">Shared</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setSaveTplOpen(true)}><LayoutTemplate className="h-4 w-4 mr-1" /> Save as template</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save layout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* Editor */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={working.map((w) => w.section_id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {working.map((s) => {
                const sec = sectionById[s.section_id];
                if (!sec) return null;
                const isAdv = advancedFor === s.section_id;
                return (
                  <SortableSection key={s.section_id} id={s.section_id}>
                    {({ listeners, attributes }) => (
                      <Card className={s.hidden ? "opacity-60" : ""}>
                        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <button {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </button>
                            <div className="min-w-0">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <span className="truncate">{sec.label}</span>
                                {sec.is_system && <Badge variant="secondary" className="text-[10px]">System</Badge>}
                              </CardTitle>
                              <CardDescription className="text-[11px]">{s.fields.length} fields</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <Select value={s.width} onValueChange={(v: SectionWidth) => updateSec(s.section_id, { width: v })}>
                              <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {WIDTH_OPTIONS.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button size="sm" variant={s.default_collapsed ? "outline" : "secondary"} className="h-7 text-xs"
                              onClick={() => updateSec(s.section_id, { default_collapsed: !s.default_collapsed })}>
                              {s.default_collapsed ? "Collapsed" : "Expanded"}
                            </Button>
                            <Select value={s.mobile} onValueChange={(v: MobileVisibility) => updateSec(s.section_id, { mobile: v })}>
                              <SelectTrigger className="h-7 w-32 text-xs"><Smartphone className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="show">Show on Mobile</SelectItem>
                                <SelectItem value="desktop_only">Desktop Only</SelectItem>
                                <SelectItem value="hide">Hide</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button size="sm" variant="ghost" className="h-7" onClick={() => updateSec(s.section_id, { hidden: !s.hidden })}>
                              {s.hidden ? <><EyeOff className="h-3.5 w-3.5 mr-1" /> Hidden</> : <><Eye className="h-3.5 w-3.5 mr-1" /> Visible</>}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7" onClick={() => setAdvancedFor(isAdv ? null : s.section_id)}>
                              <Settings2 className="h-3.5 w-3.5 mr-1" /> {isAdv ? "Close" : "Advanced"}
                            </Button>
                          </div>
                        </CardHeader>
                        {isAdv && (
                          <CardContent className="border-t pt-3 space-y-4">
                            <div>
                              <Label className="text-xs uppercase text-muted-foreground tracking-wide">Role visibility</Label>
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
                                {APP_ROLES.map((r) => (
                                  <label key={r} className="flex items-center gap-2 text-xs border rounded-md px-2 py-1.5 cursor-pointer">
                                    <Checkbox
                                      checked={!!s.role_visibility?.[r]}
                                      onCheckedChange={(v) => updateSec(s.section_id, { role_visibility: { ...(s.role_visibility ?? {}), [r]: !!v } })}
                                    />
                                    {ROLE_LABELS[r]}
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs uppercase text-muted-foreground tracking-wide">Section permissions</Label>
                              <div className="overflow-x-auto mt-2">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-muted-foreground">
                                      <th className="font-medium pb-1">Role</th>
                                      <th className="font-medium pb-1 text-center">View</th>
                                      <th className="font-medium pb-1 text-center">Edit</th>
                                      <th className="font-medium pb-1 text-center">Delete</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {APP_ROLES.map((r) => {
                                      const p = s.role_permissions?.[r] ?? { view: true, edit: true, delete: false };
                                      const set = (patch: Partial<typeof p>) => updateSec(s.section_id, {
                                        role_permissions: { ...(s.role_permissions ?? {}), [r]: { ...p, ...patch } }
                                      });
                                      return (
                                        <tr key={r} className="border-t">
                                          <td className="py-1.5">{ROLE_LABELS[r]}</td>
                                          <td className="text-center"><Checkbox checked={p.view} onCheckedChange={(v) => set({ view: !!v })} /></td>
                                          <td className="text-center"><Checkbox checked={p.edit} onCheckedChange={(v) => set({ edit: !!v })} /></td>
                                          <td className="text-center"><Checkbox checked={p.delete} onCheckedChange={(v) => set({ delete: !!v })} /></td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    )}
                  </SortableSection>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {/* Live preview */}
        <Card className="lg:sticky lg:top-4 h-fit">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2"><Monitor className="h-4 w-4" /> Live preview</CardTitle>
            <CardDescription className="text-xs">Desktop grid based on width settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-6 gap-1.5">
              {working.filter((s) => !s.hidden).map((s) => {
                const sec = sectionById[s.section_id];
                if (!sec) return null;
                const cls = WIDTH_OPTIONS.find((w) => w.value === s.width)?.cols ?? "col-span-6";
                return (
                  <div key={s.section_id} className={cn("rounded border bg-muted/30 px-2 py-2 text-[11px]", cls)}>
                    <div className="font-medium truncate flex items-center gap-1">
                      {s.default_collapsed && <ChevronDown className="h-3 w-3 -rotate-90" />}
                      {sec.label}
                    </div>
                    <div className="text-muted-foreground">{s.fields.length} fields</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates list */}
      {templates.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Saved templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    {t.name}
                    {(t as any).scope === "applicant_shared" && (
                      <Badge variant="secondary" className="text-[10px]">Shared</Badge>
                    )}
                    {t.module_id !== moduleId && (
                      <Badge variant="outline" className="text-[10px]">From sibling</Badge>
                    )}
                  </div>
                  {t.description && <div className="text-xs text-muted-foreground truncate">{t.description}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => applyTemplate(t)}>Apply</Button>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    if (!confirm(`Delete template "${t.name}"?`)) return;
                    await deleteLayoutTemplate(t.id);
                    setTemplates(await listLayoutTemplates(moduleId));
                  }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={saveTplOpen} onOpenChange={setSaveTplOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save layout template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="e.g. Loan Officer Layout" /></div>
            <div><Label>Description</Label><Textarea value={tplDesc} onChange={(e) => setTplDesc(e.target.value)} rows={2} /></div>
            {isApplicantModule && (
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={tplShared} onCheckedChange={(v) => setTplShared(!!v)} className="mt-0.5" />
                <span>
                  Share with Borrower &amp; Co-Borrower
                  <span className="block text-xs text-muted-foreground">
                    Template appears in both applicant sections. Fields are matched by name when applying.
                  </span>
                </span>
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveTplOpen(false)}>Cancel</Button>
            <Button onClick={saveAsTemplate}><Plus className="h-4 w-4 mr-1" /> Save template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}