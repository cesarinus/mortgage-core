import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronUp, ChevronDown, Save, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  listModules, listSections, listFields, getDefaultLayout, saveLayout,
  type CrmModule, type CrmSection, type CrmField, type CrmLayout,
} from "@/lib/crm-fields/api";

type SectionLayout = NonNullable<CrmLayout["layout"]>["sections"][number];

export default function CrmLayoutDesigner() {
  const { toast } = useToast();
  const [modules, setModules] = useState<CrmModule[]>([]);
  const [moduleId, setModuleId] = useState("");
  const [sections, setSections] = useState<CrmSection[]>([]);
  const [fields, setFields] = useState<CrmField[]>([]);
  const [layout, setLayout] = useState<CrmLayout | null>(null);
  const [working, setWorking] = useState<SectionLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      const [s, f, l] = await Promise.all([listSections(moduleId), listFields(moduleId), getDefaultLayout(moduleId)]);
      setSections(s); setFields(f); setLayout(l);
      // build working state: merge stored layout with current schema (any new sections/fields appended).
      const stored = l?.layout?.sections ?? [];
      const mergedSections: SectionLayout[] = s.map((sec, idx) => {
        const found = stored.find((x) => x.section_id === sec.id);
        const storedFieldIds = new Set((found?.fields ?? []).map((x) => x.field_id));
        const sectionFields = f.filter((x) => x.section_id === sec.id);
        const merged = [
          ...(found?.fields ?? []).filter((x) => sectionFields.some((y) => y.id === x.field_id)),
          ...sectionFields.filter((x) => !storedFieldIds.has(x.id)).map((x, i) => ({ field_id: x.id, sort: 1000 + i * 10, width: 1 as const })),
        ].map((x, i) => ({ ...x, sort: i * 10 }));
        return {
          section_id: sec.id,
          hidden: found?.hidden ?? sec.hidden,
          sort: found?.sort ?? idx * 10,
          columns: found?.columns ?? 2,
          fields: merged,
        };
      }).sort((a, b) => a.sort - b.sort).map((x, i) => ({ ...x, sort: i * 10 }));
      setWorking(mergedSections);
    })();
  }, [moduleId]);

  const move = <T,>(arr: T[], from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= arr.length) return arr;
    const copy = arr.slice();
    [copy[from], copy[to]] = [copy[to], copy[from]];
    return copy;
  };

  const moveSection = (i: number, dir: -1 | 1) =>
    setWorking((w) => move(w, i, dir).map((x, idx) => ({ ...x, sort: idx * 10 })));

  const moveField = (si: number, fi: number, dir: -1 | 1) =>
    setWorking((w) => w.map((s, idx) => idx === si ? { ...s, fields: move(s.fields, fi, dir).map((x, j) => ({ ...x, sort: j * 10 })) } : s));

  const toggleSectionHidden = (i: number) =>
    setWorking((w) => w.map((s, idx) => idx === i ? { ...s, hidden: !s.hidden } : s));

  const setSectionColumns = (i: number, cols: 1 | 2) =>
    setWorking((w) => w.map((s, idx) => idx === i ? { ...s, columns: cols } : s));

  const toggleFieldWidth = (si: number, fi: number) =>
    setWorking((w) => w.map((s, idx) => idx === si ? { ...s, fields: s.fields.map((f, j) => j === fi ? { ...f, width: (f.width === 2 ? 1 : 2) as 1 | 2 } : f) } : s));

  const save = async () => {
    if (!moduleId) return;
    setSaving(true);
    try {
      const row: Partial<CrmLayout> = layout
        ? { id: layout.id, layout: { sections: working } }
        : { module_id: moduleId, name: "Default", is_default: true, layout: { sections: working } };
      const id = await saveLayout(row);
      setLayout({ ...(layout ?? { module_id: moduleId, role: null, name: "Default", is_default: true } as any), id, layout: { sections: working } } as any);
      toast({ title: "Layout saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const fieldById = useMemo(() => Object.fromEntries(fields.map((f) => [f.id, f])), [fields]);
  const sectionById = useMemo(() => Object.fromEntries(sections.map((s) => [s.id, s])), [sections]);

  if (loading) return <div className="flex items-center gap-2 p-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Layout Designer</h1>
          <p className="text-muted-foreground text-sm">Reorder sections and fields, set columns, hide sections. Saves a new version automatically.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={moduleId} onValueChange={setModuleId}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>{modules.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save layout
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {working.map((s, si) => {
          const sec = sectionById[s.section_id];
          if (!sec) return null;
          return (
            <Card key={s.section_id} className={s.hidden ? "opacity-60" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => moveSection(si, -1)}><ChevronUp className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => moveSection(si, 1)}><ChevronDown className="h-3 w-3" /></Button>
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {sec.label}
                      {sec.is_system && <Badge variant="secondary" className="text-[10px]">System</Badge>}
                    </CardTitle>
                    <CardDescription className="text-xs">{s.fields.length} fields</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-muted-foreground">Columns</span>
                    <Button size="sm" variant={s.columns === 1 ? "default" : "outline"} className="h-7" onClick={() => setSectionColumns(si, 1)}>1</Button>
                    <Button size="sm" variant={s.columns === 2 ? "default" : "outline"} className="h-7" onClick={() => setSectionColumns(si, 2)}>2</Button>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => toggleSectionHidden(si)}>
                    {s.hidden ? <><EyeOff className="h-3 w-3 mr-1" /> Hidden</> : <><Eye className="h-3 w-3 mr-1" /> Visible</>}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {s.fields.length === 0 && <div className="text-xs text-muted-foreground italic">No fields in this section.</div>}
                {s.fields.map((f, fi) => {
                  const fld = fieldById[f.field_id];
                  if (!fld) return null;
                  return (
                    <div key={f.field_id} className="flex items-center justify-between border rounded-md p-2 hover:bg-muted/30 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => moveField(si, fi, -1)}><ChevronUp className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => moveField(si, fi, 1)}><ChevronDown className="h-3 w-3" /></Button>
                        </div>
                        <div>
                          <div className="font-medium">{fld.label}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{fld.internal_name} · {fld.field_type}</div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleFieldWidth(si, fi)}>
                        {f.width === 2 ? "Full width" : "Half width"}
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}