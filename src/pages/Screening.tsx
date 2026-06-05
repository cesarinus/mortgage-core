import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Search, Pencil, Eye, Trash2, GitMerge, Plus, ArrowDownUp, AlertTriangle,
  CheckCircle2, XCircle, Filter,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Lead = Tables<"leads">;

const LEAD_STATUSES = ["new_lead", "contacted", "qualified", "unqualified"] as const;

function normalizeEmail(s?: string | null) {
  return (s ?? "").trim().toLowerCase();
}

function parseEmails(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,;\n\r]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)),
    ),
  );
}

/** Returns counts of records that block hard delete. */
async function checkLeadLinks(leadId: string) {
  const [opps, contacts, portals] = await Promise.all([
    supabase.from("pipeline_opportunities").select("id", { count: "exact", head: true }).eq("lead_id", leadId),
    supabase.from("lead_contacts").select("id", { count: "exact", head: true }).eq("lead_id", leadId),
    supabase.from("portal_users").select("user_id", { count: "exact", head: true }).eq("lead_id", leadId),
  ]);
  return {
    opportunities: opps.count ?? 0,
    contacts: contacts.count ?? 0,
    portal: portals.count ?? 0,
  };
}

async function logAudit(actorId: string | undefined, emails: string[], matches: number, actions: any[]) {
  if (!actorId) return;
  await supabase.from("lead_screening_audit").insert({
    actor_id: actorId,
    emails_checked: emails,
    matches_found: matches,
    actions: actions as any,
  });
}

// ---------- Lead Form (Edit/Create) ----------
const MERGEABLE_FIELDS: { key: keyof Lead; label: string; list?: boolean }[] = [
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "status", label: "Status" },
  { key: "source", label: "Source" },
  { key: "loan_purpose", label: "Loan purpose" },
  { key: "loan_amount", label: "Loan amount" },
  { key: "property_address", label: "Property address" },
  { key: "notes", label: "Notes", list: true },
];

function LeadFormDialog({
  open, onOpenChange, lead, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: Partial<Lead> | null;
  onSaved: (lead: Lead) => void;
}) {
  const { user } = useAuth();
  const isEdit = Boolean(lead?.id);
  const [form, setForm] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(lead ?? {});
  }, [lead, open]);

  const set = (k: keyof Lead, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.first_name?.trim() || !form.last_name?.trim()) {
      toast.error("First and last name are required");
      return;
    }
    setSaving(true);
    const payload: any = {
      first_name: form.first_name?.trim(),
      last_name: form.last_name?.trim(),
      email: normalizeEmail(form.email as string) || null,
      phone: (form.phone as string)?.trim() || null,
      status: (form.status as any) || "new_lead",
      source: (form.source as string)?.trim() || "manual",
      loan_purpose: (form.loan_purpose as string)?.trim() || null,
      loan_amount: form.loan_amount ?? null,
      property_address: (form.property_address as string)?.trim() || null,
      notes: (form.notes as string)?.trim() || null,
    };
    try {
      if (isEdit && lead?.id) {
        const { data, error } = await supabase.from("leads").update(payload).eq("id", lead.id).select().single();
        if (error) throw error;
        toast.success("Lead updated");
        onSaved(data as Lead);
      } else {
        payload.created_by = user?.id;
        const { data, error } = await supabase.from("leads").insert(payload).select().single();
        if (error) throw error;
        toast.success("Lead created");
        onSaved(data as Lead);
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Lead" : "Create Lead"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>First name</Label><Input value={form.first_name ?? ""} onChange={(e) => set("first_name", e.target.value)} /></div>
          <div><Label>Last name</Label><Input value={form.last_name ?? ""} onChange={(e) => set("last_name", e.target.value)} /></div>
          <div><Label>Email</Label><Input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
          <div>
            <Label>Status</Label>
            <Select value={(form.status as string) ?? "new_lead"} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Source</Label><Input value={form.source ?? ""} onChange={(e) => set("source", e.target.value)} /></div>
          <div><Label>Loan purpose</Label><Input value={form.loan_purpose ?? ""} onChange={(e) => set("loan_purpose", e.target.value)} /></div>
          <div><Label>Loan amount</Label><Input type="number" value={(form.loan_amount as any) ?? ""} onChange={(e) => set("loan_amount", e.target.value ? Number(e.target.value) : null)} /></div>
          <div className="col-span-2"><Label>Property address</Label><Input value={form.property_address ?? ""} onChange={(e) => set("property_address", e.target.value)} /></div>
          <div className="col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-primary text-primary-foreground">{saving ? "Saving…" : isEdit ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- View Drawer ----------
function LeadViewSheet({
  open, onOpenChange, leadId,
}: { open: boolean; onOpenChange: (v: boolean) => void; leadId: string | null }) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [related, setRelated] = useState<{ opps: any[]; contacts: any[]; docs: any[] }>({ opps: [], contacts: [], docs: [] });

  useEffect(() => {
    if (!open || !leadId) return;
    (async () => {
      const { data: l } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
      setLead((l as Lead) ?? null);
      const [opps, contacts, docs] = await Promise.all([
        supabase.from("pipeline_opportunities").select("*").eq("lead_id", leadId),
        supabase.from("lead_contacts").select("*").eq("lead_id", leadId),
        supabase.from("crm_attachments").select("id,file_name,created_at").eq("lead_id", leadId),
      ]);
      setRelated({
        opps: (opps.data as any[]) ?? [],
        contacts: (contacts.data as any[]) ?? [],
        docs: (docs.data as any[]) ?? [],
      });
    })();
  }, [open, leadId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader><SheetTitle>{lead ? `${lead.first_name} ${lead.last_name}` : "Lead"}</SheetTitle></SheetHeader>
        {lead && (
          <div className="mt-4 space-y-4 text-sm">
            <Card><CardContent className="p-4 space-y-2">
              <div><span className="text-muted-foreground">Email:</span> {lead.email ?? "—"}</div>
              <div><span className="text-muted-foreground">Phone:</span> {lead.phone ?? "—"}</div>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{lead.status}</Badge></div>
              <div><span className="text-muted-foreground">Source:</span> {lead.source ?? "—"}</div>
              <div><span className="text-muted-foreground">Loan purpose:</span> {lead.loan_purpose ?? "—"}</div>
              <div><span className="text-muted-foreground">Loan amount:</span> {lead.loan_amount ?? "—"}</div>
              <div><span className="text-muted-foreground">Property:</span> {lead.property_address ?? "—"}</div>
              <div><span className="text-muted-foreground">Notes:</span> {lead.notes ?? "—"}</div>
              <div className="text-xs text-muted-foreground">Created {new Date(lead.created_at).toLocaleString()}</div>
            </CardContent></Card>

            <div>
              <div className="font-medium mb-2">Opportunities ({related.opps.length})</div>
              {related.opps.length === 0 ? <div className="text-xs text-muted-foreground">None</div> :
                related.opps.map((o) => (
                  <div key={o.id} className="text-xs border rounded p-2 mb-1">Stage: {o.stage}</div>
                ))}
            </div>
            <div>
              <div className="font-medium mb-2">Linked contacts ({related.contacts.length})</div>
              {related.contacts.length === 0 && <div className="text-xs text-muted-foreground">None</div>}
            </div>
            <div>
              <div className="font-medium mb-2">Documents ({related.docs.length})</div>
              {related.docs.map((d) => <div key={d.id} className="text-xs">{d.file_name}</div>)}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------- Delete confirm ----------
function DeleteLeadDialog({
  open, onOpenChange, lead, onDeleted,
}: { open: boolean; onOpenChange: (v: boolean) => void; lead: Lead | null; onDeleted: (lead: Lead) => void }) {
  const { user } = useAuth();
  const [links, setLinks] = useState<{ opportunities: number; contacts: number; portal: number } | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!open || !lead) { setLinks(null); return; }
    checkLeadLinks(lead.id).then(setLinks);
  }, [open, lead]);

  const blocked = !!links && (links.opportunities > 0 || links.contacts > 0 || links.portal > 0);

  const confirm = async () => {
    if (!lead || blocked) return;
    setWorking(true);
    try {
      const { error } = await supabase.from("leads").delete().eq("id", lead.id);
      if (error) throw error;
      await logAudit(user?.id, [normalizeEmail(lead.email)], 0, [{ type: "delete", lead_id: lead.id, email: lead.email }]);
      toast.success(`Deleted ${lead.first_name} ${lead.last_name}`, {
        duration: 5000,
        action: { label: "Undo", onClick: async () => {
          const restore: any = { ...lead };
          delete restore.id;
          const { data, error } = await supabase.from("leads").insert(restore).select().single();
          if (error) toast.error("Undo failed: " + error.message);
          else { toast.success("Restored"); onDeleted(data as Lead); }
        } },
      });
      onDeleted(lead);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Delete failed");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Delete lead?</DialogTitle>
          <DialogDescription>This permanently removes {lead?.first_name} {lead?.last_name}.</DialogDescription>
        </DialogHeader>
        {links && (
          <div className="text-sm space-y-1">
            <div>Linked opportunities: <b>{links.opportunities}</b></div>
            <div>Linked contacts: <b>{links.contacts}</b></div>
            <div>Portal users: <b>{links.portal}</b></div>
          </div>
        )}
        {blocked && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm p-3">
            This lead has active applications/portal access. Promote this lead instead of merging, or reassign links first.
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={confirm} disabled={working || blocked}>{working ? "Deleting…" : "Delete"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Merge dialog ----------
function MergeDialog({
  open, onOpenChange, leadA, leadB, onMerged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leadA: Lead | null; // winner candidate
  leadB: Lead | null; // duplicate
  onMerged: (winner: Lead, removedId: string) => void;
}) {
  const { user } = useAuth();
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [choices, setChoices] = useState<Record<string, "A" | "B" | "both" | "custom">>({});
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [working, setWorking] = useState(false);
  const [links, setLinks] = useState<{ opportunities: number; contacts: number; portal: number } | null>(null);

  useEffect(() => {
    if (!open || !leadA || !leadB) return;
    setWinnerId(leadA.id);
    const init: any = {};
    for (const f of MERGEABLE_FIELDS) {
      const a = (leadA as any)[f.key];
      const b = (leadB as any)[f.key];
      init[f.key] = a && !b ? "A" : !a && b ? "B" : "A";
    }
    setChoices(init);
    setCustom({});
    // check links on the loser candidate (default: B)
    checkLeadLinks(leadB.id).then(setLinks);
  }, [open, leadA, leadB]);

  useEffect(() => {
    if (!open || !winnerId) return;
    const loserId = winnerId === leadA?.id ? leadB?.id : leadA?.id;
    if (loserId) checkLeadLinks(loserId).then(setLinks);
  }, [winnerId, open, leadA?.id, leadB?.id]);

  if (!leadA || !leadB) return null;
  const winner = winnerId === leadA.id ? leadA : leadB;
  const loser = winnerId === leadA.id ? leadB : leadA;
  const blocked = !!links && (links.opportunities > 0 || links.contacts > 0 || links.portal > 0);

  const submit = async () => {
    setWorking(true);
    try {
      const patch: any = {};
      for (const f of MERGEABLE_FIELDS) {
        const a = (leadA as any)[f.key];
        const b = (leadB as any)[f.key];
        const winVal = winnerId === leadA.id ? a : b;
        const loseVal = winnerId === leadA.id ? b : a;
        const ch = choices[f.key as string];
        let val: any = winVal;
        if (ch === "A") val = a;
        else if (ch === "B") val = b;
        else if (ch === "both" && f.list) val = [winVal, loseVal].filter(Boolean).join("\n\n");
        else if (ch === "both") val = [winVal, loseVal].filter(Boolean).join(" / ");
        else if (ch === "custom") val = custom[f.key as string] ?? winVal;
        patch[f.key] = val;
      }
      if (patch.email) patch.email = normalizeEmail(patch.email);
      const { data: updated, error: upErr } = await supabase.from("leads").update(patch).eq("id", winner.id).select().single();
      if (upErr) throw upErr;
      const { error: delErr } = await supabase.from("leads").delete().eq("id", loser.id);
      if (delErr) throw delErr;
      await logAudit(user?.id, [normalizeEmail(leadA.email), normalizeEmail(leadB.email)], 2, [
        { type: "merge", winner_id: winner.id, removed_id: loser.id, patch },
      ]);
      toast.success("Leads merged");
      onMerged(updated as Lead, loser.id);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Merge failed");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><GitMerge className="h-5 w-5" />Merge leads</DialogTitle>
          <DialogDescription>Choose a winner and pick the value to keep for each field.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium">Winner:</span>
          <RadioGroup value={winnerId ?? leadA.id} onValueChange={setWinnerId} className="flex gap-4">
            <label className="flex items-center gap-2"><RadioGroupItem value={leadA.id} />A · {leadA.first_name} {leadA.last_name}</label>
            <label className="flex items-center gap-2"><RadioGroupItem value={leadB.id} />B · {leadB.first_name} {leadB.last_name}</label>
          </RadioGroup>
        </div>

        {blocked && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm p-3">
            The losing lead has active applications/portal access ({links?.opportunities} opp, {links?.contacts} contacts, {links?.portal} portal). Reassign links or pick the other lead as the loser.
          </div>
        )}

        <div className="space-y-3">
          {MERGEABLE_FIELDS.map((f) => {
            const a = (leadA as any)[f.key];
            const b = (leadB as any)[f.key];
            const same = (a ?? "") === (b ?? "");
            return (
              <div key={f.key as string} className={`rounded border p-3 ${same ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between text-xs font-medium mb-2">
                  <span>{f.label}</span>
                  {same && <span className="text-muted-foreground">identical</span>}
                </div>
                <RadioGroup
                  value={choices[f.key as string] ?? "A"}
                  onValueChange={(v: any) => setChoices((p) => ({ ...p, [f.key as string]: v }))}
                  className="grid grid-cols-2 gap-2 text-sm"
                >
                  <label className="flex items-start gap-2 cursor-pointer">
                    <RadioGroupItem value="A" className="mt-1" />
                    <div><div className="text-xs text-muted-foreground">A</div><div className="break-words">{String(a ?? "—")}</div></div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <RadioGroupItem value="B" className="mt-1" />
                    <div><div className="text-xs text-muted-foreground">B</div><div className="break-words">{String(b ?? "—")}</div></div>
                  </label>
                  {!same && (
                    <>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <RadioGroupItem value="both" /> Keep both{f.list ? " (concatenate)" : ""}
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <RadioGroupItem value="custom" /> Custom
                      </label>
                    </>
                  )}
                </RadioGroup>
                {choices[f.key as string] === "custom" && (
                  <Input
                    className="mt-2"
                    value={custom[f.key as string] ?? ""}
                    onChange={(e) => setCustom((p) => ({ ...p, [f.key as string]: e.target.value }))}
                  />
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={working || blocked} className="bg-primary text-primary-foreground">
            {working ? "Merging…" : "Confirm merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Main Page ----------
export default function Screening() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("browse");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [editLead, setEditLead] = useState<Partial<Lead> | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [delLead, setDelLead] = useState<Lead | null>(null);
  const [mergeA, setMergeA] = useState<Lead | null>(null);
  const [mergeB, setMergeB] = useState<Lead | null>(null);

  const [bulkDelOpen, setBulkDelOpen] = useState(false);
  const [bulkQueue, setBulkQueue] = useState<Array<[Lead, Lead]>>([]);

  // Screening
  const [screenInput, setScreenInput] = useState("");
  const [screenResults, setScreenResults] = useState<
    Array<{ email: string; matches: Lead[] }>
  >([]);

  const loadLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setLeads((data as Lead[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { loadLeads(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = leads;
    if (q) {
      arr = arr.filter((l) =>
        `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) ||
        normalizeEmail(l.email).includes(q),
      );
    }
    arr = [...arr].sort((a, b) => {
      const t = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "desc" ? -t : t;
    });
    return arr;
  }, [leads, search, sortDir]);

  const toggleSel = (id: string) =>
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSel = filtered.length > 0 && filtered.every((l) => selected.has(l.id));
  const toggleAll = () =>
    setSelected(allSel ? new Set() : new Set(filtered.map((l) => l.id)));

  const onEdit = (l: Lead) => { setEditLead(l); setEditOpen(true); };
  const onCreate = (prefill?: Partial<Lead>) => { setEditLead(prefill ?? {}); setEditOpen(true); };

  const onSaved = (l: Lead) => {
    setLeads((prev) => {
      const i = prev.findIndex((x) => x.id === l.id);
      if (i >= 0) { const n = [...prev]; n[i] = l; return n; }
      return [l, ...prev];
    });
  };
  const onDeleted = (l: Lead) => {
    setLeads((prev) => prev.find((x) => x.id === l.id) ? prev.filter((x) => x.id !== l.id) : [l, ...prev]);
    setSelected((p) => { const n = new Set(p); n.delete(l.id); return n; });
  };
  const onMerged = (winner: Lead, removedId: string) => {
    setLeads((prev) => prev.filter((x) => x.id !== removedId).map((x) => x.id === winner.id ? winner : x));
    setSelected(new Set());
    if (bulkQueue.length > 0) {
      const [next, ...rest] = bulkQueue;
      setBulkQueue(rest);
      setMergeA(next[0]); setMergeB(next[1]);
    }
  };

  const runScreening = async () => {
    const emails = parseEmails(screenInput);
    if (emails.length === 0) {
      toast.error("Enter at least one valid email");
      return;
    }
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .in("email", emails);
    if (error) { toast.error(error.message); return; }
    const rows = (data as Lead[]) ?? [];
    const results = emails.map((e) => ({
      email: e,
      matches: rows.filter((r) => normalizeEmail(r.email) === e),
    }));
    setScreenResults(results);
    const matchCount = results.reduce((n, r) => n + r.matches.length, 0);
    await logAudit(user?.id, emails, matchCount, [{ type: "screen", emails, matches: matchCount }]);
  };

  const startBulkMerge = () => {
    const sel = leads.filter((l) => selected.has(l.id));
    if (sel.length < 2) { toast.error("Pick 2+ leads"); return; }
    // group by email
    const groups: Record<string, Lead[]> = {};
    for (const l of sel) {
      const k = normalizeEmail(l.email);
      if (!k) continue;
      (groups[k] ||= []).push(l);
    }
    const pairs: Array<[Lead, Lead]> = [];
    for (const k in groups) {
      const g = groups[k];
      if (g.length < 2) continue;
      const [winner, ...rest] = g;
      for (const dup of rest) pairs.push([winner, dup]);
    }
    if (pairs.length === 0) { toast.error("Selected leads don't share an email"); return; }
    const [first, ...rest] = pairs;
    setBulkQueue(rest);
    setMergeA(first[0]); setMergeB(first[1]);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Filter className="h-6 w-6" />Lead Screening</h1>
          <p className="text-sm text-muted-foreground">Browse, dedupe, and bulk-manage leads.</p>
        </div>
        <Button onClick={() => onCreate()} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" />New Lead</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="screen">Screening</TabsTrigger>
        </TabsList>

        {/* ----------- Browse ----------- */}
        <TabsContent value="browse" className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" onClick={() => setSortDir((s) => s === "desc" ? "asc" : "desc")}>
              <ArrowDownUp className="h-4 w-4 mr-1" />{sortDir === "desc" ? "Newest" : "Oldest"}
            </Button>
            {selected.size > 0 && (
              <div className="ml-auto flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{selected.size} selected</span>
                <Button variant="outline" size="sm" onClick={startBulkMerge}><GitMerge className="h-4 w-4 mr-1" />Bulk merge</Button>
                <Button variant="destructive" size="sm" onClick={() => setBulkDelOpen(true)}><Trash2 className="h-4 w-4 mr-1" />Bulk delete</Button>
              </div>
            )}
          </div>

          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={allSel} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>}
                {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">No leads found</TableCell></TableRow>}
                {filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell><Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggleSel(l.id)} /></TableCell>
                    <TableCell className="font-medium">{l.first_name} {l.last_name}</TableCell>
                    <TableCell className="text-sm">{l.email ?? "—"}</TableCell>
                    <TableCell className="text-sm">{l.phone ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                    <TableCell className="text-sm">{l.source ?? "—"}</TableCell>
                    <TableCell className="text-sm">{new Date(l.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setViewId(l.id)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(l)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDelLead(l)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ----------- Screening ----------- */}
        <TabsContent value="screen" className="space-y-4">
          <Card><CardContent className="p-4 space-y-3">
            <Label>Paste emails (comma or newline separated)</Label>
            <Textarea rows={4} placeholder="alice@example.com, bob@example.com" value={screenInput} onChange={(e) => setScreenInput(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={runScreening} className="bg-primary text-primary-foreground"><Search className="h-4 w-4 mr-1" />Screen emails</Button>
              <Button variant="ghost" onClick={() => { setScreenInput(""); setScreenResults([]); }}>Clear</Button>
            </div>
          </CardContent></Card>

          {screenResults.length > 0 && (
            <div className="space-y-3">
              {screenResults.map((r) => (
                <Card key={r.email} className={`border-l-4 ${r.matches.length ? "border-l-destructive" : "border-l-emerald-500"}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {r.matches.length ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        {r.email}
                      </div>
                      <Badge variant={r.matches.length ? "destructive" : "outline"}>
                        {r.matches.length ? `${r.matches.length} match${r.matches.length > 1 ? "es" : ""}` : "No match"}
                      </Badge>
                    </div>

                    {r.matches.length === 0 ? (
                      <Button size="sm" variant="outline" onClick={() => onCreate({ email: r.email, first_name: "", last_name: "" })}>
                        <Plus className="h-4 w-4 mr-1" />Create new lead
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        {r.matches.map((m) => (
                          <div key={m.id} className="rounded border p-3 flex items-center justify-between gap-2">
                            <div className="text-sm">
                              <div className="font-medium">{m.first_name} {m.last_name}</div>
                              <div className="text-xs text-muted-foreground">{m.phone ?? "—"} · {m.status} · added {new Date(m.created_at).toLocaleDateString()}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setViewId(m.id)}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => onEdit(m)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => setDelLead(m)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              {r.matches.length > 1 && (
                                <Button variant="outline" size="sm" onClick={() => {
                                  const other = r.matches.find((x) => x.id !== m.id);
                                  if (other) { setMergeA(m); setMergeB(other); }
                                }}>
                                  <GitMerge className="h-4 w-4 mr-1" />Merge into
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <LeadFormDialog open={editOpen} onOpenChange={setEditOpen} lead={editLead} onSaved={onSaved} />
      <LeadViewSheet open={!!viewId} onOpenChange={(v) => !v && setViewId(null)} leadId={viewId} />
      <DeleteLeadDialog open={!!delLead} onOpenChange={(v) => !v && setDelLead(null)} lead={delLead} onDeleted={onDeleted} />
      <MergeDialog
        open={!!mergeA && !!mergeB}
        onOpenChange={(v) => { if (!v) { setMergeA(null); setMergeB(null); setBulkQueue([]); } }}
        leadA={mergeA} leadB={mergeB}
        onMerged={onMerged}
      />

      {/* Bulk delete confirm */}
      <Dialog open={bulkDelOpen} onOpenChange={setBulkDelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Delete {selected.size} leads?</DialogTitle>
            <DialogDescription>Leads with linked opportunities, contacts, or portal access will be skipped.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkDelOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              const ids = Array.from(selected);
              let deleted = 0, skipped = 0;
              for (const id of ids) {
                const links = await checkLeadLinks(id);
                if (links.opportunities || links.contacts || links.portal) { skipped++; continue; }
                const { error } = await supabase.from("leads").delete().eq("id", id);
                if (!error) deleted++;
              }
              await logAudit(user?.id, [], 0, [{ type: "bulk_delete", deleted, skipped, ids }]);
              toast.success(`Deleted ${deleted}${skipped ? ` · skipped ${skipped}` : ""}`);
              setBulkDelOpen(false);
              setSelected(new Set());
              loadLeads();
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}