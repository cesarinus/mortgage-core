import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Search, LayoutGrid, List as ListIcon, ArrowUpDown, MapPin, Building2, Landmark } from "lucide-react";
import {
  getAllowedNext,
  isTransitionAllowedSync,
  normalizeStatus,
  recordLeadTransition,
} from "@/lib/crm/stateMachine";

type Lead = {
  id: string;
  first_name: string;
  last_name: string;
  name: string | null;
  email: string | null;
  status: string;
  property_value: number | null;
  created_at: string;
  company_id: string | null;
  notes: string | null;
};

type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  company_id: string | null;
};

type Company = { id: string; name: string; company_type: string };

type LeadContactLink = {
  lead_id: string;
  contact_id: string;
  is_primary: boolean;
  role_on_deal: string | null;
  company_id: string | null;
};

type MortgageProfile = {
  lead_id: string;
  est_monthly_payment: number | null;
  purchase_price: number | null;
};

/** Pipeline stages shown as kanban columns (forward pipeline only). */
const KANBAN_STAGES = [
  "new",
  "contacted",
  "pre_qualified",
  "qualified",
  "application_started",
  "underwriting",
  "approved",
  "closed",
] as const;

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  pre_qualified: "Pre-Qualified",
  qualified: "Qualified",
  application_started: "Application Sent",
  underwriting: "Underwriting",
  approved: "Approved",
  clear_to_close: "Clear to Close",
  closed: "Closed",
  converted: "Converted",
  lost: "Lost",
  unqualified: "Unqualified",
};

// color-coded stage badges per spec
const STAGE_BADGE: Record<string, string> = {
  new: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
  contacted: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20",
  pre_qualified: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  qualified: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  application_started: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  underwriting: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20",
  approved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  clear_to_close: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  closed: "bg-muted text-muted-foreground border-border",
  converted: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  lost: "bg-muted text-muted-foreground border-border",
  unqualified: "bg-muted text-muted-foreground border-border",
};

const fmtCurrency = (n: number | null | undefined) =>
  n == null ? "—" : `$${Number(n).toLocaleString()}`;

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString() : "—";

function leadName(l: Lead) {
  return (l.name && l.name.trim()) || `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim() || "Untitled";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

type Assembled = {
  lead: Lead;
  amount: number | null;
  propertyAddress: string | null;
  primary: { contact: Contact | null; email: string | null; name: string };
  company: Company | null;
  titleCompany: Company | null;
  lender: Company | null;
};

function assemble(
  lead: Lead,
  contactsById: Map<string, Contact>,
  companiesById: Map<string, Company>,
  linksByLead: Map<string, LeadContactLink[]>,
  profilesByLead: Map<string, MortgageProfile>,
): Assembled {
  const links = linksByLead.get(lead.id) ?? [];
  const primaryLink = links.find((l) => l.is_primary) ?? null;
  const primaryContact = primaryLink ? contactsById.get(primaryLink.contact_id) ?? null : null;
  const primaryName = primaryContact
    ? `${primaryContact.first_name} ${primaryContact.last_name}`.trim()
    : leadName(lead);
  const primaryEmail = primaryContact?.email ?? lead.email ?? null;

  const company = lead.company_id ? companiesById.get(lead.company_id) ?? null : null;

  const titleLink = links.find((l) => (l.role_on_deal ?? "") === "title_agent");
  const titleCompany =
    (titleLink?.company_id && companiesById.get(titleLink.company_id)) ||
    (titleLink?.contact_id && contactsById.get(titleLink.contact_id)?.company_id
      ? companiesById.get(contactsById.get(titleLink.contact_id)!.company_id!) ?? null
      : null) ||
    null;

  // Lender: any linked company with company_type='lender'
  let lender: Company | null = null;
  for (const l of links) {
    const cid = l.company_id ?? contactsById.get(l.contact_id)?.company_id ?? null;
    const co = cid ? companiesById.get(cid) ?? null : null;
    if (co?.company_type === "lender") {
      lender = co;
      break;
    }
  }

  const profile = profilesByLead.get(lead.id);
  const amount =
    lead.property_value ??
    profile?.purchase_price ??
    profile?.est_monthly_payment ??
    null;

  return {
    lead,
    amount,
    propertyAddress: null, // no column on leads; left as "—"
    primary: { contact: primaryContact, email: primaryEmail, name: primaryName },
    company,
    titleCompany,
    lender,
  };
}

/** Click-and-hold stage selector. Triggers popover after 500ms hold. */
function StageHoldButton({
  current,
  children,
  onSelect,
  disabled,
}: {
  current: string;
  children: React.ReactNode;
  onSelect: (next: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const allowed = getAllowedNext("lead", current);

  const clear = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const start = () => {
    if (disabled) return;
    clear();
    timer.current = window.setTimeout(() => setOpen(true), 500);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          onMouseDown={start}
          onMouseUp={clear}
          onMouseLeave={clear}
          onTouchStart={start}
          onTouchEnd={clear}
          className="cursor-pointer select-none"
        >
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs text-muted-foreground px-2 pb-2">Move to stage</p>
        {allowed.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 pb-1">No transitions available.</p>
        )}
        {allowed.map((s) => (
          <button
            key={s}
            className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted"
            onClick={() => {
              setOpen(false);
              onSelect(s);
            }}
          >
            {STAGE_LABELS[s] ?? s}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export default function Pipeline() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const view: "table" | "kanban" = location.pathname.endsWith("/kanban") ? "kanban" : "table";

  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [links, setLinks] = useState<LeadContactLink[]>([]);
  const [profiles, setProfiles] = useState<MortgageProfile[]>([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<"name" | "amount" | "stage" | "close">("close");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  const load = async () => {
    const [{ data: l }, { data: c }, { data: co }, { data: lc }, { data: mp }] = await Promise.all([
      supabase.from("leads").select("id,first_name,last_name,name,email,status,property_value,created_at,company_id,notes").order("created_at", { ascending: false }),
      supabase.from("contacts").select("id,first_name,last_name,email,company_id"),
      supabase.from("crm_companies").select("id,name,company_type"),
      supabase.from("lead_contacts").select("lead_id,contact_id,is_primary,role_on_deal,company_id"),
      supabase.from("mortgage_profiles").select("lead_id,est_monthly_payment,purchase_price"),
    ]);
    setLeads((l ?? []) as Lead[]);
    setContacts((c ?? []) as Contact[]);
    setCompanies((co ?? []) as Company[]);
    setLinks((lc ?? []) as LeadContactLink[]);
    setProfiles((mp ?? []) as MortgageProfile[]);
  };

  useEffect(() => {
    load();
  }, []);

  const contactsById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const companiesById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  const profilesByLead = useMemo(() => new Map(profiles.map((p) => [p.lead_id, p])), [profiles]);
  const linksByLead = useMemo(() => {
    const m = new Map<string, LeadContactLink[]>();
    links.forEach((l) => {
      const arr = m.get(l.lead_id) ?? [];
      arr.push(l);
      m.set(l.lead_id, arr);
    });
    return m;
  }, [links]);

  const assembled = useMemo(
    () => leads.map((l) => assemble(l, contactsById, companiesById, linksByLead, profilesByLead)),
    [leads, contactsById, companiesById, linksByLead, profilesByLead],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assembled.filter((a) => {
      const status = normalizeStatus(a.lead.status);
      if (stageFilter !== "all" && status !== stageFilter) return false;
      if (!q) return true;
      return (
        leadName(a.lead).toLowerCase().includes(q) ||
        a.primary.name.toLowerCase().includes(q) ||
        (a.primary.email ?? "").toLowerCase().includes(q) ||
        (a.company?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [assembled, search, stageFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let r = 0;
      if (sortKey === "name") r = leadName(a.lead).localeCompare(leadName(b.lead));
      else if (sortKey === "amount") r = (a.amount ?? 0) - (b.amount ?? 0);
      else if (sortKey === "stage") r = normalizeStatus(a.lead.status).localeCompare(normalizeStatus(b.lead.status));
      else r = +new Date(a.lead.created_at) - +new Date(b.lead.created_at);
      return sortDir === "asc" ? r : -r;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const moveStage = async (leadId: string, fromRaw: string, to: string) => {
    const from = normalizeStatus(fromRaw);
    const next = normalizeStatus(to);
    if (from === next) return;
    if (!isTransitionAllowedSync("lead", from, next)) {
      const allowed = getAllowedNext("lead", from).map((s) => STAGE_LABELS[s] ?? s).join(", ");
      toast({
        title: "Invalid stage change",
        description: `Cannot move from ${STAGE_LABELS[from] ?? from} to ${STAGE_LABELS[next] ?? next}. Next allowed: ${allowed || "none"}.`,
        variant: "destructive",
      });
      return;
    }
    // optimistic update
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: next } : l)));
    const { error } = await supabase.from("leads").update({ status: next as any }).eq("id", leadId);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      load();
      return;
    }
    await recordLeadTransition(leadId, from, next);
    toast({ title: "Stage updated", description: `${STAGE_LABELS[from] ?? from} → ${STAGE_LABELS[next] ?? next}` });
  };

  const saveName = async (leadId: string) => {
    const value = nameDraft.trim();
    setEditingNameId(null);
    if (!value) return;
    const { error } = await supabase.from("leads").update({ name: value }).eq("id", leadId);
    if (error) {
      toast({ title: "Rename failed", description: error.message, variant: "destructive" });
      return;
    }
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, name: value } : l)));
  };

  const onDragStart = (e: React.DragEvent, leadId: string, from: string) => {
    e.dataTransfer.setData("text/lead-id", leadId);
    e.dataTransfer.setData("text/lead-from", from);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDropStage = (e: React.DragEvent, to: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/lead-id");
    const from = e.dataTransfer.getData("text/lead-from");
    if (id) moveStage(id, from, to);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Opportunities</h1>
          <p className="text-muted-foreground">Track and move opportunities through your pipeline</p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          <button
            onClick={() => navigate("/pipeline")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ListIcon className="h-4 w-4" /> All Opportunities
          </button>
          <button
            onClick={() => navigate("/pipeline/kanban")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-4 w-4" /> By Stage
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, contact, company"
            className="pl-9"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All stages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {KANBAN_STAGES.map((s) => (
              <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {view === "table" ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 font-medium">
                      Name <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => toggleSort("amount")} className="inline-flex items-center gap-1 font-medium">
                      Loan Amount <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Point of Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>
                    <button onClick={() => toggleSort("stage")} className="inline-flex items-center gap-1 font-medium">
                      Stage <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => toggleSort("close")} className="inline-flex items-center gap-1 font-medium">
                      Close date <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      No opportunities match your filters.
                    </TableCell>
                  </TableRow>
                )}
                {sorted.map((a) => {
                  const status = normalizeStatus(a.lead.status);
                  return (
                    <TableRow
                      key={a.lead.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => navigate(`/crm/leads/${a.lead.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {editingNameId === a.lead.id ? (
                          <Input
                            autoFocus
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            onBlur={() => saveName(a.lead.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveName(a.lead.id);
                              if (e.key === "Escape") setEditingNameId(null);
                            }}
                            className="h-8"
                          />
                        ) : (
                          <button
                            className="font-medium text-left hover:text-primary"
                            onClick={() => {
                              setEditingNameId(a.lead.id);
                              setNameDraft(leadName(a.lead));
                            }}
                          >
                            {leadName(a.lead)}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>{fmtCurrency(a.amount)}</TableCell>
                      <TableCell>
                        <div className="text-sm">{a.primary.name || "—"}</div>
                        {a.primary.email && (
                          <div className="text-xs text-muted-foreground">{a.primary.email}</div>
                        )}
                      </TableCell>
                      <TableCell>{a.company?.name ?? "—"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <StageHoldButton current={status} onSelect={(next) => moveStage(a.lead.id, status, next)}>
                          <Badge variant="outline" className={STAGE_BADGE[status] ?? ""}>
                            {STAGE_LABELS[status] ?? status}
                          </Badge>
                        </StageHoldButton>
                      </TableCell>
                      <TableCell>{fmtDate(a.lead.created_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {KANBAN_STAGES.map((stage) => {
            const items = filtered.filter((a) => normalizeStatus(a.lead.status) === stage);
            const sum = items.reduce((acc, a) => acc + (a.amount ?? 0), 0);
            return (
              <div
                key={stage}
                className="flex-shrink-0 w-80"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDropStage(e, stage)}
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={STAGE_BADGE[stage] ?? ""}>
                      {STAGE_LABELS[stage]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{fmtCurrency(sum)}</span>
                </div>
                <div className="space-y-2 min-h-[200px] rounded-lg bg-muted/40 p-2">
                  {items.map((a) => {
                    const status = normalizeStatus(a.lead.status);
                    return (
                      <StageHoldButton
                        key={a.lead.id}
                        current={status}
                        onSelect={(next) => moveStage(a.lead.id, status, next)}
                      >
                        <Card
                          draggable
                          onDragStart={(e) => onDragStart(e, a.lead.id, status)}
                          className="hover:shadow-md transition-shadow"
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <Link
                                to={`/crm/leads/${a.lead.id}`}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="font-semibold text-sm hover:text-primary truncate"
                              >
                                {leadName(a.lead)}
                              </Link>
                              <Badge variant="outline" className={`${STAGE_BADGE[status] ?? ""} shrink-0 text-[10px]`}>
                                {STAGE_LABELS[status] ?? status}
                              </Badge>
                            </div>
                            <div className="text-sm font-medium">{fmtCurrency(a.amount)}</div>
                            {a.propertyAddress && (
                              <p className="text-xs text-muted-foreground flex items-start gap-1">
                                <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                                <span className="truncate">{a.propertyAddress}</span>
                              </p>
                            )}
                            <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px] bg-primary/15 text-primary">
                                  {initials(a.primary.name) || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium truncate">{a.primary.name || "—"}</div>
                                {a.primary.email && (
                                  <div className="text-[10px] text-muted-foreground truncate">{a.primary.email}</div>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                              <div className="flex items-center gap-1 truncate" title="Title Company">
                                <Building2 className="h-3 w-3 shrink-0" />
                                <span className="truncate">{a.titleCompany?.name ?? "—"}</span>
                              </div>
                              <div className="flex items-center gap-1 truncate" title="Lender">
                                <Landmark className="h-3 w-3 shrink-0" />
                                <span className="truncate">{a.lender?.name ?? "—"}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </StageHoldButton>
                    );
                  })}
                  {items.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">No opportunities</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
