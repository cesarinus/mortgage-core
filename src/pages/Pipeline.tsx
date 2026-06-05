import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  recordDealTransition,
} from "@/lib/crm/stateMachine";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS, PIPELINE_STAGE_BADGE } from "@/lib/crm/stages";

type Opportunity = {
  id: string;
  lead_id: string;
  stage: string;
  loan_amount: number | null;
  property_address: string | null;
  primary_contact_id: string | null;
  title_company_id: string | null;
  lender_company_id: string | null;
  close_date: string | null;
  created_at: string;
};

type Lead = {
  id: string;
  first_name: string;
  last_name: string;
  name: string | null;
  email: string | null;
};

type Contact = { id: string; first_name: string; last_name: string; email: string | null };
type Company = { id: string; name: string };

const fmtCurrency = (n: number | null | undefined) =>
  n == null ? "—" : `$${Number(n).toLocaleString()}`;
const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString() : "—");

function opportunityName(lead: Lead | undefined) {
  if (!lead) return "Untitled";
  return (lead.name && lead.name.trim()) ||
    `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim() ||
    "Untitled";
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

type Assembled = {
  opp: Opportunity;
  lead: Lead | undefined;
  primary: { name: string; email: string | null };
  titleCompany: Company | null;
  lender: Company | null;
};

/** Click-and-hold stage selector. Triggers popover after 500ms hold. */
function StageHoldButton({
  current,
  children,
  onSelect,
}: {
  current: string;
  children: React.ReactNode;
  onSelect: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const allowed = getAllowedNext("deal", current);

  const clear = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const start = () => {
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
            {PIPELINE_STAGE_LABELS[s] ?? s}
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

  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<"name" | "amount" | "stage" | "close">("close");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = async () => {
    const { data: o } = await supabase
      .from("pipeline_opportunities")
      .select("*")
      .order("created_at", { ascending: false });
    const opportunities = (o ?? []) as Opportunity[];
    setOpps(opportunities);

    const leadIds = Array.from(new Set(opportunities.map((x) => x.lead_id)));
    const contactIds = Array.from(
      new Set(opportunities.map((x) => x.primary_contact_id).filter(Boolean) as string[]),
    );
    const companyIds = Array.from(
      new Set(
        opportunities
          .flatMap((x) => [x.title_company_id, x.lender_company_id])
          .filter(Boolean) as string[],
      ),
    );

    const [{ data: l }, { data: c }, { data: co }] = await Promise.all([
      leadIds.length
        ? supabase.from("leads").select("id,first_name,last_name,name,email").in("id", leadIds)
        : Promise.resolve({ data: [] as Lead[] } as any),
      contactIds.length
        ? supabase.from("contacts").select("id,first_name,last_name,email").in("id", contactIds)
        : Promise.resolve({ data: [] as Contact[] } as any),
      companyIds.length
        ? supabase.from("crm_companies").select("id,name").in("id", companyIds)
        : Promise.resolve({ data: [] as Company[] } as any),
    ]);
    setLeads((l ?? []) as Lead[]);
    setContacts((c ?? []) as Contact[]);
    setCompanies((co ?? []) as Company[]);
  };

  useEffect(() => {
    load();
  }, []);

  const leadsById = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);
  const contactsById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const companiesById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

  const assembled: Assembled[] = useMemo(() => {
    return opps.map((opp) => {
      const lead = leadsById.get(opp.lead_id);
      const contact = opp.primary_contact_id ? contactsById.get(opp.primary_contact_id) : null;
      const primaryName = contact
        ? `${contact.first_name} ${contact.last_name}`.trim()
        : opportunityName(lead);
      const primaryEmail = contact?.email ?? lead?.email ?? null;
      return {
        opp,
        lead,
        primary: { name: primaryName, email: primaryEmail },
        titleCompany: opp.title_company_id ? companiesById.get(opp.title_company_id) ?? null : null,
        lender: opp.lender_company_id ? companiesById.get(opp.lender_company_id) ?? null : null,
      };
    });
  }, [opps, leadsById, contactsById, companiesById]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assembled.filter((a) => {
      const stage = normalizeStatus(a.opp.stage);
      if (stageFilter !== "all" && stage !== stageFilter) return false;
      if (!q) return true;
      return (
        opportunityName(a.lead).toLowerCase().includes(q) ||
        a.primary.name.toLowerCase().includes(q) ||
        (a.primary.email ?? "").toLowerCase().includes(q) ||
        (a.opp.property_address ?? "").toLowerCase().includes(q)
      );
    });
  }, [assembled, search, stageFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let r = 0;
      if (sortKey === "name") r = opportunityName(a.lead).localeCompare(opportunityName(b.lead));
      else if (sortKey === "amount") r = (a.opp.loan_amount ?? 0) - (b.opp.loan_amount ?? 0);
      else if (sortKey === "stage") r = a.opp.stage.localeCompare(b.opp.stage);
      else r = +new Date(a.opp.created_at) - +new Date(b.opp.created_at);
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

  const moveStage = async (oppId: string, fromRaw: string, to: string) => {
    const from = normalizeStatus(fromRaw);
    const next = normalizeStatus(to);
    if (from === next) return;
    if (!isTransitionAllowedSync("deal", from, next)) {
      const allowed = getAllowedNext("deal", from)
        .map((s) => PIPELINE_STAGE_LABELS[s] ?? s)
        .join(", ");
      toast({
        title: "Invalid stage change",
        description: `Cannot move from ${PIPELINE_STAGE_LABELS[from] ?? from} to ${PIPELINE_STAGE_LABELS[next] ?? next}. Next allowed: ${allowed || "none"}.`,
        variant: "destructive",
      });
      return;
    }
    setOpps((prev) => prev.map((o) => (o.id === oppId ? { ...o, stage: next } : o)));
    const { error } = await supabase
      .from("pipeline_opportunities")
      .update({ stage: next })
      .eq("id", oppId);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      load();
      return;
    }
    await recordDealTransition(oppId, from, next);
    toast({
      title: "Stage updated",
      description: `${PIPELINE_STAGE_LABELS[from] ?? from} → ${PIPELINE_STAGE_LABELS[next] ?? next}`,
    });
  };

  const onDragStart = (e: React.DragEvent, oppId: string, from: string) => {
    e.dataTransfer.setData("text/opp-id", oppId);
    e.dataTransfer.setData("text/opp-from", from);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDropStage = (e: React.DragEvent, to: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/opp-id");
    const from = e.dataTransfer.getData("text/opp-from");
    if (id) moveStage(id, from, to);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
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
            placeholder="Search by name, contact, address"
            className="pl-9"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All stages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s} value={s}>{PIPELINE_STAGE_LABELS[s]}</SelectItem>
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
                  <TableHead>Primary Contact</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Title Company</TableHead>
                  <TableHead>Lender</TableHead>
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
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      No opportunities yet. Move a Qualified lead from the Leads page to start the pipeline.
                    </TableCell>
                  </TableRow>
                )}
                {sorted.map((a) => {
                  const stage = normalizeStatus(a.opp.stage);
                  return (
                    <TableRow
                      key={a.opp.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => navigate(`/crm/leads/${a.opp.lead_id}`, { state: { from: "pipeline" } })}
                    >
                      <TableCell className="font-medium">{opportunityName(a.lead)}</TableCell>
                      <TableCell>{fmtCurrency(a.opp.loan_amount)}</TableCell>
                      <TableCell>
                        <div className="text-sm">{a.primary.name || "—"}</div>
                        {a.primary.email && (
                          <div className="text-xs text-muted-foreground">{a.primary.email}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{a.opp.property_address ?? "—"}</TableCell>
                      <TableCell>{a.titleCompany?.name ?? "—"}</TableCell>
                      <TableCell>{a.lender?.name ?? "—"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <StageHoldButton current={stage} onSelect={(next) => moveStage(a.opp.id, stage, next)}>
                          <Badge variant="outline" className={PIPELINE_STAGE_BADGE[stage] ?? ""}>
                            {PIPELINE_STAGE_LABELS[stage] ?? stage}
                          </Badge>
                        </StageHoldButton>
                      </TableCell>
                      <TableCell>{fmtDate(a.opp.close_date ?? a.opp.created_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const items = filtered.filter((a) => normalizeStatus(a.opp.stage) === stage);
            const sum = items.reduce((acc, a) => acc + (a.opp.loan_amount ?? 0), 0);
            return (
              <div
                key={stage}
                className="flex-shrink-0 w-80"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDropStage(e, stage)}
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={PIPELINE_STAGE_BADGE[stage] ?? ""}>
                      {PIPELINE_STAGE_LABELS[stage]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{fmtCurrency(sum)}</span>
                </div>
                <div className="space-y-2 min-h-[200px] rounded-lg bg-muted/40 p-2">
                  {items.map((a) => {
                    const s = normalizeStatus(a.opp.stage);
                    return (
                      <StageHoldButton
                        key={a.opp.id}
                        current={s}
                        onSelect={(next) => moveStage(a.opp.id, s, next)}
                      >
                        <Card
                          draggable
                          onDragStart={(e) => onDragStart(e, a.opp.id, s)}
                          className="hover:shadow-md transition-shadow"
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <Link
                                to={`/crm/leads/${a.opp.lead_id}`}
                                state={{ from: "pipeline" }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="font-semibold text-sm hover:text-primary truncate"
                              >
                                {opportunityName(a.lead)}
                              </Link>
                              <Badge variant="outline" className={`${PIPELINE_STAGE_BADGE[s] ?? ""} shrink-0 text-[10px]`}>
                                {PIPELINE_STAGE_LABELS[s] ?? s}
                              </Badge>
                            </div>
                            <div className="text-sm font-medium">{fmtCurrency(a.opp.loan_amount)}</div>
                            {a.opp.property_address && (
                              <p className="text-xs text-muted-foreground flex items-start gap-1">
                                <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                                <span className="truncate">{a.opp.property_address}</span>
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
