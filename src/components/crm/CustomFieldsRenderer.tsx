import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, ChevronDown, ChevronRight } from "lucide-react";
import { formatOptionLabel } from "@/lib/format/labels";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  listModules, listSections, listFields, listFieldOptions,
  getRecordValues, upsertRecordValue,
  listFieldPermissions, listFieldConditions, getDefaultLayout, listSectionPermissions,
  type CrmSection, type CrmField, type CrmFieldOption,
  type CrmFieldPermission, type CrmFieldCondition, type CrmLayout, type CrmSectionPermission,
  type AppRole,
} from "@/lib/crm-fields/api";
import { evaluateField, evaluateSection } from "@/lib/crm-fields/conditions";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function CustomFieldsRenderer({
  moduleSlug, recordType, recordId,
}: { moduleSlug: string; recordType: string; recordId: string }) {
  const { toast } = useToast();
  const { role } = useAuth();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<CrmSection[]>([]);
  const [fields, setFields] = useState<CrmField[]>([]);
  const [options, setOptions] = useState<CrmFieldOption[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [permissions, setPermissions] = useState<CrmFieldPermission[]>([]);
  const [conditions, setConditions] = useState<CrmFieldCondition[]>([]);
  const [layout, setLayout] = useState<CrmLayout | null>(null);
  const [sectionPerms, setSectionPerms] = useState<CrmSectionPermission[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const modules = await listModules();
      const m = modules.find(x => x.slug === moduleSlug);
      if (!m) { setLoading(false); return; }
      const [s, f, v, l] = await Promise.all([
        listSections(m.id), listFields(m.id), getRecordValues(recordType, recordId), getDefaultLayout(m.id),
      ]);
      setSections(s);
      setFields(f.filter(x => x.active && !x.hidden));
      setOptions(await listFieldOptions(f.map(x => x.id)));
      setValues(v);
      const ids = f.map((x) => x.id);
      const [p, c, sp] = await Promise.all([
        listFieldPermissions(ids), listFieldConditions(ids), listSectionPermissions(s.map((x) => x.id)),
      ]);
      setPermissions(p); setConditions(c); setSectionPerms(sp); setLayout(l);
      // seed collapsed map from layout
      const initCollapsed: Record<string, boolean> = {};
      const stored = l?.layout?.sections ?? [];
      for (const ls of stored) if (ls.default_collapsed) initCollapsed[ls.section_id] = true;
      setCollapsed(initCollapsed);
      setLoading(false);
    })();
  }, [moduleSlug, recordType, recordId]);

  const setValue = (field_id: string, v: any) => setValues(prev => ({ ...prev, [field_id]: v }));

  const save = async (f: CrmField) => {
    setSaving(f.id);
    try {
      await upsertRecordValue(f.id, recordType, recordId, values[f.id] ?? null);
      toast({ title: `Saved ${f.label}` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(null); }
  };

  if (loading) return <div className="flex items-center gap-2 p-6 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading custom fields…</div>;

  if (fields.length === 0) {
    return (
      <Card><CardContent className="p-6 text-sm text-muted-foreground">
        No custom fields configured for this module. Add some in Settings → CRM Fields.
      </CardContent></Card>
    );
  }

  const currentRole = (role ?? null) as AppRole | null;

  // Section-level role gates
  const sectionRoleAllowed = (sectionId: string, ls: any | undefined) => {
    if (!currentRole || currentRole === "admin") return true;
    if (ls?.role_visibility && ls.role_visibility[currentRole] === false) return false;
    const sp = sectionPerms.find((p) => p.section_id === sectionId && p.role === currentRole);
    if (sp && !sp.can_view) return false;
    return true;
  };
  const sectionReadOnly = (sectionId: string, ls: any | undefined) => {
    if (!currentRole || currentRole === "admin") return false;
    if (ls?.role_permissions?.[currentRole]?.edit === false) return true;
    const sp = sectionPerms.find((p) => p.section_id === sectionId && p.role === currentRole);
    if (sp && !sp.can_edit) return true;
    return false;
  };

  // Resolve permission for current role (admin = full).
  const canView = (f: CrmField) => {
    if (role === "admin" || !role) return true;
    const p = permissions.find((x) => x.field_id === f.id && x.role === currentRole);
    return p ? p.can_view : true;
  };
  const canEdit = (f: CrmField) => {
    if (role === "admin") return true;
    const p = permissions.find((x) => x.field_id === f.id && x.role === currentRole);
    return p ? p.can_edit : true;
  };

  // Build ordered sections/fields from layout if present, else fall back to sort_order.
  const layoutSections = layout?.layout?.sections ?? [];
  const orderedSections = layoutSections.length
    ? layoutSections.map((ls) => ({
        section: sections.find((s) => s.id === ls.section_id)!,
        hidden: ls.hidden,
        columns: ls.columns ?? 2,
        width: ls.width ?? "full",
        mobile: ls.mobile ?? "show",
        ls,
        fieldOrder: ls.fields,
      })).filter((x) => x.section && !x.hidden)
    : sections.filter((s) => !s.hidden).map((section) => ({ section, hidden: false, columns: 2 as 1 | 2, width: "full" as const, mobile: "show" as const, ls: undefined, fieldOrder: fields.filter(f => f.section_id === section.id).map((f) => ({ field_id: f.id, sort: f.sort_order, width: 1 as 1 | 2 })) }));

  const sectionsWithFields = orderedSections
    .filter((x) => x.fieldOrder.length > 0)
    // role-based section visibility
    .filter((x) => sectionRoleAllowed(x.section.id, x.ls))
    // mobile visibility
    .filter((x) => {
      if (!isMobile) return x.mobile !== "hide" ? true : true; // desktop: always show non-hidden
      return x.mobile === "show";
    })
    // section-level conditional logic
    .filter((x) => evaluateSection(x.section.id, false, conditions, values).visible);

  const renderField = (f: CrmField) => {
    const v = values[f.id];
    const opts = options.filter(o => o.field_id === f.id);
    const common = { readOnly: f.read_only, placeholder: f.placeholder ?? undefined };
    switch (f.field_type) {
      case "textarea":
        return <Textarea value={v ?? ""} onChange={(e) => setValue(f.id, e.target.value)} {...common} rows={3} />;
      case "number": case "currency": case "percent":
        return <Input type="number" value={v ?? ""} onChange={(e) => setValue(f.id, e.target.value === "" ? null : Number(e.target.value))} {...common} />;
      case "checkbox":
        return <Switch checked={!!v} onCheckedChange={(x) => setValue(f.id, x)} disabled={f.read_only} />;
      case "date":
        return <Input type="date" value={v ?? ""} onChange={(e) => setValue(f.id, e.target.value)} {...common} />;
      case "datetime":
        return <Input type="datetime-local" value={v ?? ""} onChange={(e) => setValue(f.id, e.target.value)} {...common} />;
      case "dropdown": case "radio":
        return (
          <Select value={v ?? ""} onValueChange={(x) => setValue(f.id, x)} disabled={f.read_only}>
            <SelectTrigger><SelectValue placeholder={f.placeholder ?? "Select…"} /></SelectTrigger>
            <SelectContent>{opts.map(o => <SelectItem key={o.id} value={o.value}>{formatOptionLabel(o.label)}</SelectItem>)}</SelectContent>
          </Select>
        );
      default:
        return <Input type={f.field_type === "email" ? "email" : f.field_type === "url" ? "url" : "text"} value={v ?? ""} onChange={(e) => setValue(f.id, e.target.value)} {...common} />;
    }
  };

  const widthClass = (w: string) => w === "half" ? "lg:col-span-3" : w === "third" ? "lg:col-span-2" : "lg:col-span-6";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
      {sectionsWithFields.map(({ section, columns, fieldOrder, width, ls }) => {
        const isCollapsed = !!collapsed[section.id];
        const secReadOnly = sectionReadOnly(section.id, ls);
        return (
        <Card key={section.id} className={cn("col-span-1", widthClass(width))}>
          <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <button onClick={() => setCollapsed((c) => ({ ...c, [section.id]: !c[section.id] }))} className="hover:bg-muted rounded p-0.5">
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {section.label}
                {secReadOnly && <Badge variant="secondary" className="text-[9px]">Read-only</Badge>}
              </CardTitle>
            {section.description && <CardDescription>{section.description}</CardDescription>}
            </div>
          </CardHeader>
          {!isCollapsed && (
          <CardContent className={`grid gap-3 ${columns === 1 ? "grid-cols-1" : "sm:grid-cols-2"}`}>
            {fieldOrder.map((fo) => {
              const f = fields.find((x) => x.id === fo.field_id);
              if (!f) return null;
              if (!canView(f)) return null;
              const state = evaluateField(f.id, f.required, f.read_only, false, conditions, values);
              if (!state.visible) return null;
              const readOnly = state.readOnly || !canEdit(f) || secReadOnly;
              const fullWidth = fo.width === 2 || columns === 1;
              return (
                <div key={f.id} className={`space-y-1 ${fullWidth ? "sm:col-span-2" : ""}`}>
                  <Label className="flex items-center gap-1.5">
                    {f.label}
                    {state.required && <span className="text-destructive">*</span>}
                    {readOnly && <Badge variant="secondary" className="text-[9px]">Read-only</Badge>}
                  </Label>
                  <div className="flex gap-1">
                    <div className="flex-1">{renderField({ ...f, read_only: readOnly })}</div>
                    <Button size="sm" variant="ghost" onClick={() => save(f)} disabled={saving === f.id || readOnly}>
                      {saving === f.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    </Button>
                  </div>
                  {f.description && <p className="text-[11px] text-muted-foreground">{f.description}</p>}
                </div>
              );
            })}
          </CardContent>
          )}
        </Card>
        );
      })}
    </div>
  );
}