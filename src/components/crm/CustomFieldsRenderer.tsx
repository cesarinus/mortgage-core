import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  listModules, listSections, listFields, listFieldOptions,
  getRecordValues, upsertRecordValue,
  type CrmSection, type CrmField, type CrmFieldOption,
} from "@/lib/crm-fields/api";

export default function CustomFieldsRenderer({
  moduleSlug, recordType, recordId,
}: { moduleSlug: string; recordType: string; recordId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<CrmSection[]>([]);
  const [fields, setFields] = useState<CrmField[]>([]);
  const [options, setOptions] = useState<CrmFieldOption[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const modules = await listModules();
      const m = modules.find(x => x.slug === moduleSlug);
      if (!m) { setLoading(false); return; }
      const [s, f, v] = await Promise.all([
        listSections(m.id), listFields(m.id), getRecordValues(recordType, recordId),
      ]);
      setSections(s);
      setFields(f.filter(x => x.active && !x.hidden));
      setOptions(await listFieldOptions(f.map(x => x.id)));
      setValues(v);
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

  const sectionsWithFields = sections.filter(s => !s.hidden && fields.some(f => f.section_id === s.id));

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
            <SelectContent>{opts.map(o => <SelectItem key={o.id} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        );
      default:
        return <Input type={f.field_type === "email" ? "email" : f.field_type === "url" ? "url" : "text"} value={v ?? ""} onChange={(e) => setValue(f.id, e.target.value)} {...common} />;
    }
  };

  return (
    <div className="space-y-4">
      {sectionsWithFields.map(s => (
        <Card key={s.id}>
          <CardHeader className="pb-3"><CardTitle className="text-base">{s.label}</CardTitle>{s.description && <CardDescription>{s.description}</CardDescription>}</CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            {fields.filter(f => f.section_id === s.id).map(f => (
              <div key={f.id} className="space-y-1">
                <Label className="flex items-center gap-1.5">
                  {f.label}
                  {f.required && <span className="text-destructive">*</span>}
                  {f.read_only && <Badge variant="secondary" className="text-[9px]">Read-only</Badge>}
                </Label>
                <div className="flex gap-1">
                  <div className="flex-1">{renderField(f)}</div>
                  <Button size="sm" variant="ghost" onClick={() => save(f)} disabled={saving === f.id || f.read_only}>
                    {saving === f.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  </Button>
                </div>
                {f.description && <p className="text-[11px] text-muted-foreground">{f.description}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}