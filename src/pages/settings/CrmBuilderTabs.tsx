import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import {
  saveFieldCondition, deleteFieldCondition,
  upsertFieldPermission, upsertSectionPermission,
  APP_ROLES, ROLE_LABELS,
  type CrmField, type CrmSection, type CrmFieldCondition, type ConditionClause,
  type CrmFieldPermission, type CrmSectionPermission, type CrmAuditLog,
  type AppRole,
} from "@/lib/crm-fields/api";

/* ===================== CONDITIONS ===================== */

const OPS: { value: ConditionClause["op"]; label: string }[] = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "gt", label: "greater than" },
  { value: "lt", label: "less than" },
  { value: "empty", label: "is empty" },
  { value: "not_empty", label: "is not empty" },
];

export function ConditionsTab({
  fields, sections, conditions, onChanged,
}: {
  fields: CrmField[]; sections: CrmSection[]; conditions: CrmFieldCondition[];
  onChanged: () => Promise<void> | void;
}) {
  const addRule = async () => {
    if (!fields[0]) return;
    await saveFieldCondition({
      field_id: fields[0].id,
      action: "show",
      target_kind: "field",
      target_id: fields[0].id,
      rule: { all: [{ field_id: fields[0].id, op: "not_empty" }] },
      sort_order: conditions.length * 10,
      active: true,
    } as any);
    await onChanged();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Conditional Logic</CardTitle>
          <CardDescription>Build rules with AND/OR groups. Targets fields or whole sections.</CardDescription>
        </div>
        <Button size="sm" onClick={addRule}><Plus className="h-4 w-4 mr-1" /> Add rule</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {conditions.length === 0 && (
          <div className="text-sm text-muted-foreground italic flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> No rules yet. Click "Add rule" to create one.
          </div>
        )}
        {conditions.map((c) => (
          <RuleRow key={c.id} c={c} fields={fields} sections={sections} onChanged={onChanged} />
        ))}
      </CardContent>
    </Card>
  );
}

function RuleRow({
  c, fields, sections, onChanged,
}: { c: CrmFieldCondition; fields: CrmField[]; sections: CrmSection[]; onChanged: () => Promise<void> | void }) {
  const all = c.rule?.all ?? [];
  const any = c.rule?.any ?? [];
  const combinator: "and" | "or" = any.length && !all.length ? "or" : "and";
  const clauses = combinator === "or" ? any : all;

  const update = async (patch: Partial<CrmFieldCondition>) => {
    await saveFieldCondition({ id: c.id, ...patch });
    await onChanged();
  };

  const setClauses = async (next: ConditionClause[], combo: "and" | "or" = combinator) => {
    await update({ rule: combo === "or" ? { any: next } : { all: next } } as any);
  };

  const updateClause = (idx: number, patch: Partial<ConditionClause>) => {
    const next = clauses.map((cl, i) => i === idx ? { ...cl, ...patch } : cl);
    setClauses(next);
  };

  return (
    <div className="border rounded-md p-3 space-y-2 bg-muted/20">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">When</span>
        <Select value={combinator} onValueChange={(v: "and" | "or") => setClauses(clauses, v)}>
          <SelectTrigger className="h-7 w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="and">ALL of</SelectItem>
            <SelectItem value="or">ANY of</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-muted-foreground">the following are true:</span>
        <div className="ml-auto flex items-center gap-2">
          <Switch checked={c.active} onCheckedChange={(v) => update({ active: v })} />
          <span className="text-xs text-muted-foreground">{c.active ? "Active" : "Off"}</span>
          <Button size="icon" variant="ghost" className="h-7 w-7"
            onClick={async () => { await deleteFieldCondition(c.id); await onChanged(); }}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        {clauses.map((cl, i) => (
          <div key={i} className="flex items-center gap-2 flex-wrap">
            <Select value={cl.field_id} onValueChange={(v) => updateClause(i, { field_id: v })}>
              <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Field" /></SelectTrigger>
              <SelectContent>{fields.map((f) => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={cl.op} onValueChange={(v: any) => updateClause(i, { op: v })}>
              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{OPS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            {!["empty","not_empty"].includes(cl.op) && (
              <Input className="h-8 w-40" value={cl.value ?? ""} onChange={(e) => updateClause(i, { value: e.target.value })} placeholder="value" />
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setClauses(clauses.filter((_, j) => j !== i))}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" className="h-7 text-xs"
          onClick={() => setClauses([...clauses, { field_id: fields[0]?.id ?? "", op: "eq", value: "" }])}>
          <Plus className="h-3 w-3 mr-1" /> Add condition
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
        <span className="text-xs text-muted-foreground">Then</span>
        <Select value={c.action} onValueChange={(v: any) => update({ action: v })}>
          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="show">Show</SelectItem>
            <SelectItem value="hide">Hide</SelectItem>
            <SelectItem value="require">Require</SelectItem>
            <SelectItem value="readonly">Read-only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={c.target_kind ?? "field"} onValueChange={(v: "field" | "section") => update({ target_kind: v, target_id: v === "section" ? sections[0]?.id : c.field_id } as any)}>
          <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="field">field</SelectItem>
            <SelectItem value="section">section</SelectItem>
          </SelectContent>
        </Select>
        {(c.target_kind ?? "field") === "section" ? (
          <Select value={c.target_id ?? ""} onValueChange={(v) => update({ target_id: v } as any)}>
            <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Section" /></SelectTrigger>
            <SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        ) : (
          <Select value={c.field_id} onValueChange={(v) => update({ field_id: v, target_id: v } as any)}>
            <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Field" /></SelectTrigger>
            <SelectContent>{fields.map((f) => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

/* ===================== PERMISSIONS ===================== */

export function PermissionsTab({
  fields, sections, permissions, sectionPerms, onChangedField, onChangedSection,
}: {
  fields: CrmField[]; sections: CrmSection[];
  permissions: CrmFieldPermission[]; sectionPerms: CrmSectionPermission[];
  onChangedField: () => Promise<void> | void;
  onChangedSection: () => Promise<void> | void;
}) {
  const [tab, setTab] = useState<"fields" | "sections">("fields");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>Per-role access to fields and sections. Admin always has full access.</CardDescription>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant={tab === "fields" ? "default" : "outline"} onClick={() => setTab("fields")}>Fields</Button>
          <Button size="sm" variant={tab === "sections" ? "default" : "outline"} onClick={() => setTab("sections")}>Sections</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {tab === "fields" ? (
          <FieldPermissionsMatrix fields={fields} permissions={permissions} onChanged={onChangedField} />
        ) : (
          <SectionPermissionsMatrix sections={sections} sectionPerms={sectionPerms} onChanged={onChangedSection} />
        )}
      </CardContent>
    </Card>
  );
}

function FieldPermissionsMatrix({
  fields, permissions, onChanged,
}: { fields: CrmField[]; permissions: CrmFieldPermission[]; onChanged: () => Promise<void> | void }) {
  const editableRoles = APP_ROLES.filter((r) => r !== "admin");
  const get = (fId: string, role: AppRole) =>
    permissions.find((p) => p.field_id === fId && p.role === role) ?? { field_id: fId, role, can_view: true, can_edit: true } as any;

  const set = async (fId: string, role: AppRole, patch: Partial<CrmFieldPermission>) => {
    const cur = get(fId, role);
    await upsertFieldPermission({ ...cur, ...patch });
    await onChanged();
  };

  if (fields.length === 0) return <div className="p-8 text-center text-sm text-muted-foreground">No fields yet.</div>;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-[11px] uppercase text-muted-foreground border-b">
          <th className="text-left px-4 py-2 sticky left-0 bg-background">Field</th>
          {editableRoles.map((r) => (
            <th key={r} className="px-3 py-2 text-center">{ROLE_LABELS[r]}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {fields.map((f) => (
          <tr key={f.id} className="border-b hover:bg-muted/30">
            <td className="px-4 py-2 sticky left-0 bg-background">
              <div className="font-medium">{f.label}</div>
              <div className="text-[10px] font-mono text-muted-foreground">{f.internal_name}</div>
            </td>
            {editableRoles.map((r) => {
              const p = get(f.id, r);
              return (
                <td key={r} className="px-3 py-2 text-center">
                  <div className="inline-flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <Checkbox checked={p.can_view} onCheckedChange={(v) => set(f.id, r, { can_view: !!v })} /> View
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <Checkbox checked={p.can_edit} onCheckedChange={(v) => set(f.id, r, { can_edit: !!v })} /> Edit
                    </label>
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SectionPermissionsMatrix({
  sections, sectionPerms, onChanged,
}: { sections: CrmSection[]; sectionPerms: CrmSectionPermission[]; onChanged: () => Promise<void> | void }) {
  const editableRoles = APP_ROLES.filter((r) => r !== "admin");
  const get = (sId: string, role: AppRole) =>
    sectionPerms.find((p) => p.section_id === sId && p.role === role) ?? { section_id: sId, role, can_view: true, can_edit: true, can_delete: false } as any;

  const set = async (sId: string, role: AppRole, patch: Partial<CrmSectionPermission>) => {
    const cur = get(sId, role);
    await upsertSectionPermission({ ...cur, ...patch });
    await onChanged();
  };

  if (sections.length === 0) return <div className="p-8 text-center text-sm text-muted-foreground">No sections yet.</div>;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-[11px] uppercase text-muted-foreground border-b">
          <th className="text-left px-4 py-2 sticky left-0 bg-background">Section</th>
          {editableRoles.map((r) => (
            <th key={r} className="px-3 py-2 text-center">{ROLE_LABELS[r]}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sections.map((s) => (
          <tr key={s.id} className="border-b hover:bg-muted/30">
            <td className="px-4 py-2 sticky left-0 bg-background">
              <div className="font-medium">{s.label}</div>
              <div className="text-[10px] font-mono text-muted-foreground">{s.slug}</div>
            </td>
            {editableRoles.map((r) => {
              const p = get(s.id, r);
              return (
                <td key={r} className="px-3 py-2 text-center">
                  <div className="inline-flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <Checkbox checked={p.can_view} onCheckedChange={(v) => set(s.id, r, { can_view: !!v })} /> View
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <Checkbox checked={p.can_edit} onCheckedChange={(v) => set(s.id, r, { can_edit: !!v })} /> Edit
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <Checkbox checked={p.can_delete} onCheckedChange={(v) => set(s.id, r, { can_delete: !!v })} /> Delete
                    </label>
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ===================== HISTORY ===================== */

export function HistoryTab({
  logs, users, actor, from, to, onActor, onFrom, onTo, onOpen,
}: {
  logs: CrmAuditLog[];
  users: { id: string; name: string }[];
  actor: string; from: string; to: string;
  onActor: (v: string) => void;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onOpen: (l: CrmAuditLog) => void;
}) {
  const userById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u.name])), [users]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 space-y-0">
        <div>
          <CardTitle>History &amp; Audit Log</CardTitle>
          <CardDescription>Every settings change in this module.</CardDescription>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={actor} onValueChange={onActor}>
            <SelectTrigger className="h-8 w-44"><SelectValue placeholder="All users" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All users</SelectItem>
              {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" className="h-8 w-36" value={from} onChange={(e) => onFrom(e.target.value)} />
          <Input type="date" className="h-8 w-36" value={to} onChange={(e) => onTo(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {logs.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No changes yet for this module.</div>}
        {logs.map((l) => (
          <button key={l.id} onClick={() => onOpen(l)}
            className="w-full text-left grid grid-cols-12 gap-2 px-4 py-2.5 border-b last:border-b-0 hover:bg-muted/30 text-sm">
            <div className="col-span-3 text-muted-foreground text-xs">{new Date(l.created_at).toLocaleString()}</div>
            <div className="col-span-2 text-xs">{l.actor_id ? userById[l.actor_id] ?? "—" : "System"}</div>
            <div className="col-span-2"><Badge variant="outline" className="capitalize">{l.entity_type}</Badge></div>
            <div className="col-span-2 capitalize text-xs">{l.action}</div>
            <div className="col-span-3 truncate text-xs">{l.entity_label ?? l.entity_id ?? ""}</div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}