import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast as sonnerToast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Flame, ThermometerSun, Snowflake, LayoutGrid, List,
  X, Clock, Eye, MousePointerClick, FileText, Tag, ChevronRight,
  Filter, Zap, Users, UserCheck, AlertTriangle, ExternalLink, MoreHorizontal,
  Pencil, Trash2, Copy, ArrowUpRightSquare,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { Tables, Enums } from "@/integrations/supabase/types";
import { SmartLeadForm } from "@/components/crm/SmartLeadForm";
import { intakeFromLead, IntakeData } from "@/lib/crm/leadIntake";
import { AssistantLauncher } from "@/components/chat/AssistantLauncher";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_BADGE,
  enqueueLosSync,
} from "@/lib/crm/stages";
import {
  getAllowedNext,
  isTransitionAllowedSync,
  normalizeStatus,
  recordLeadTransition,
} from "@/lib/crm/stateMachine";
import { ArrowRightCircle } from "lucide-react";
import { LeadIncomeSection } from "@/components/crm/LeadIncomeSection";

type Lead = Tables<"leads">;
type LeadSource = Tables<"lead_sources">;

interface LeadEvent {
  id: string;
  lead_id: string;
  event_type: string;
  points: number;
  metadata: any;
  created_at: string;
}

interface LeadTag {
  id: string;
  lead_id: string;
  tag: string;
  created_at: string;
}

// Lead-only status list — Pipeline opportunities live in their own table.
const statusColors = LEAD_STATUS_BADGE;
const stageLabels = LEAD_STATUS_LABELS;

const eventIcons: Record<string, typeof Eye> = {
  blog_view: Eye,
  page_view: Eye,
  CTA_click: MousePointerClick,
  cta_click: MousePointerClick,
  form_submit: FileText,
  scroll_50: ChevronRight,
  scroll_90: ChevronRight,
  time_on_page: Clock,
  multi_visit: Users,
  calculator_use: Zap,
  calculator_used: Zap,
  application_start: FileText,
  application_started: FileText,
  documents_uploaded: FileText,
  application_approved: UserCheck,
  loan_closed: UserCheck,
  contact_made: Users,
};

type SmartView = "all" | "hot" | "ready" | "fha" | "inactive";

const smartViews: { key: SmartView; label: string; icon: typeof Flame }[] = [
  { key: "all", label: "All Leads", icon: Users },
  { key: "hot", label: "Hot Leads", icon: Flame },
  { key: "ready", label: "Ready to Apply", icon: Zap },
  { key: "fha", label: "FHA Buyers", icon: UserCheck },
  { key: "inactive", label: "Inactive", icon: AlertTriangle },
];

function StuckBadge({ lead }: { lead: Lead }) {
  if (!(lead as any).is_stuck) return null;
  return <Badge className="bg-amber-500/15 text-amber-700 gap-1 border-amber-500/20 text-[10px]"><AlertTriangle className="h-2.5 w-2.5" />Stuck</Badge>;
}

function LastActivity({ lead }: { lead: Lead }) {
  const ts = (lead as any).last_activity_at;
  if (!ts) return <span className="text-muted-foreground">—</span>;
  const diff = Date.now() - new Date(ts).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return <span className="text-xs text-emerald-600">Just now</span>;
  if (hours < 24) return <span className="text-xs">{hours}h ago</span>;
  const days = Math.floor(hours / 24);
  return <span className={`text-xs ${days > 3 ? "text-amber-600" : ""}`}>{days}d ago</span>;
}

function HeatBadge({ score }: { score: number | null }) {
  const s = score ?? 0;
  if (s > 70) return <Badge className="bg-red-500/15 text-red-600 gap-1 border-red-500/20"><Flame className="h-3 w-3" />HOT</Badge>;
  if (s >= 40) return <Badge className="bg-amber-500/15 text-amber-600 gap-1 border-amber-500/20"><ThermometerSun className="h-3 w-3" />Warm</Badge>;
  return <Badge variant="secondary" className="gap-1"><Snowflake className="h-3 w-3" />Cold</Badge>;
}

function ScoreBadge({ score }: { score: number | null }) {
  const s = score ?? 0;
  const color = s > 70 ? "bg-red-500" : s >= 40 ? "bg-amber-500" : "bg-muted-foreground/40";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(s, 100)}%` }} />
      </div>
      <span className="text-xs font-mono font-medium w-6 text-right">{s}</span>
    </div>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [events, setEvents] = useState<LeadEvent[]>([]);
  const [tags, setTags] = useState<LeadTag[]>([]);
  const [opportunityLeadIds, setOpportunityLeadIds] = useState<Set<string>>(new Set());
  const [pipelineBorrowerEmails, setPipelineBorrowerEmails] = useState<Set<string>>(new Set());
  const [selectedLeadContactCount, setSelectedLeadContactCount] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [smartView, setSmartView] = useState<SmartView>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [editLead, setEditLead] = useState<{ lead: Lead; initial: IntakeData } | null>(null);
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null);
  const [deleteBlock, setDeleteBlock] = useState<{ opps: number; contacts: number; portal: number } | null>(null);
  const [deleteChecking, setDeleteChecking] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const load = async () => {
    const [{ data: l }, { data: s }, { data: t }, { data: opps }] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("lead_sources").select("*").order("name"),
      supabase.from("lead_tags").select("*"),
      supabase.from("pipeline_opportunities").select("lead_id"),
    ]);
    setLeads(l ?? []);
    setSources(s ?? []);
    setTags((t as LeadTag[]) ?? []);
    const oppLeadIds = Array.from(new Set(((opps ?? []) as any[]).map((o) => o.lead_id).filter(Boolean)));
    setOpportunityLeadIds(new Set(oppLeadIds));

    // Also hide leads whose own email matches a contact already linked as a
    // borrower on another lead's pipeline opportunity (e.g. a co-borrower with
    // their own intake row should not stay on the active lead list).
    const borrowerEmails = new Set<string>();
    if (oppLeadIds.length > 0) {
      const { data: lcRows } = await supabase
        .from("lead_contacts")
        .select("contact_id")
        .in("lead_id", oppLeadIds);
      const contactIds = Array.from(new Set(((lcRows ?? []) as any[]).map((r) => r.contact_id).filter(Boolean)));
      if (contactIds.length > 0) {
        const { data: cts } = await supabase
          .from("contacts")
          .select("email")
          .in("id", contactIds);
        for (const c of (cts ?? []) as any[]) {
          if (c.email) borrowerEmails.add(String(c.email).toLowerCase().trim());
        }
      }
    }
    setPipelineBorrowerEmails(borrowerEmails);
  };

  const loadEvents = async (leadId: string) => {
    const { data } = await supabase
      .from("lead_events")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(50);
    setEvents((data as LeadEvent[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  // Realtime subscription for leads updates
  useEffect(() => {
    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  useEffect(() => {
    if (selectedLead) loadEvents(selectedLead.id);
    else setEvents([]);
  }, [selectedLead?.id]);

  useEffect(() => {
    if (!selectedLead) { setSelectedLeadContactCount(0); return; }
    (async () => {
      const { data: links } = await supabase
        .from("lead_contacts")
        .select("id, contact:contacts(id)")
        .eq("lead_id", selectedLead.id);
      const live = (links ?? []).filter((l: any) => !!l.contact).length;
      setSelectedLeadContactCount(live);
    })();
  }, [selectedLead?.id]);

  // Lead creation handled by <SmartLeadForm /> inside the dialog below.

  const handleStatusChange = async (leadId: string, newStatus: Enums<"lead_status">) => {
    const currentLead = leads.find((l) => l.id === leadId);
    const from = normalizeStatus(currentLead?.status ?? null);
    const next = normalizeStatus(newStatus);
    if (from !== next && !isTransitionAllowedSync("lead", from, next)) {
      const allowed = getAllowedNext("lead", from).map((s) => stageLabels[s] ?? s).join(", ");
      toast({
        title: "Invalid stage change",
        description: `Cannot move from ${stageLabels[from] ?? from} to ${stageLabels[next] ?? next}. Next allowed: ${allowed || "none"}.`,
        variant: "destructive",
      });
      return;
    }
    const { error } = await supabase.from("leads").update({ status: next as any }).eq("id", leadId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    if (from !== next) await recordLeadTransition(leadId, from, next);
    if (from !== next) {
      try {
        const { fireZapier } = await import("@/lib/integrations/zapier");
        fireZapier("lead.status_changed", { lead_id: leadId, from, to: next });
      } catch {}
    }
    load();
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, status: next as any } : null));
    }
  };

  const handleConvertToPipeline = async (lead: Lead) => {
    // Validate: property address + at least one linked contact.
    if (!(lead as any).property_address) {
      toast({
        title: "Cannot move to pipeline",
        description: "Please add a property address and link a contact before moving to Pipeline.",
        variant: "destructive",
      });
      return;
    }
    const { data: linkedContacts } = await supabase
      .from("lead_contacts")
      .select("contact_id, is_primary")
      .eq("lead_id", lead.id);
    if (!linkedContacts || linkedContacts.length === 0) {
      toast({
        title: "Cannot move to pipeline",
        description: "Please add a property address and link a contact before moving to Pipeline.",
        variant: "destructive",
      });
      return;
    }
    const from = normalizeStatus(lead.status);
    if (from !== "qualified") {
      toast({ title: "Only qualified leads can be moved to Pipeline", variant: "destructive" });
      return;
    }
    const primary =
      linkedContacts.find((c: any) => c.is_primary)?.contact_id ?? linkedContacts[0].contact_id;

    // 1) Create the opportunity
    const { data: opp, error: oppErr } = await supabase
      .from("pipeline_opportunities")
      .insert({
        lead_id: lead.id,
        stage: "application_sent",
        loan_amount: (lead as any).loan_amount ?? lead.property_value ?? null,
        property_address: (lead as any).property_address ?? null,
        primary_contact_id: primary,
        created_by: user?.id,
      })
      .select("id")
      .single();
    if (oppErr) {
      toast({ title: "Move failed", description: oppErr.message, variant: "destructive" });
      return;
    }

    // 2) Move the lead to Unqualified so it leaves the active list
    await supabase.from("leads").update({ status: "unqualified" as any }).eq("id", lead.id);
    await recordLeadTransition(lead.id, from, "unqualified");
    await supabase.from("lead_events").insert({
      lead_id: lead.id,
      event_type: "moved_to_pipeline",
      points: 0,
      metadata: { opportunity_id: opp?.id, stage: "application_sent" } as any,
    });

    // 3) Stage ARIVE / LOS sync
    if (opp?.id) {
      try { await enqueueLosSync(opp.id); } catch (e) { console.warn("LOS enqueue failed", e); }
    }

    toast({ title: "Moved to Pipeline — Application Sent" });
    setSelectedLead(null);
    navigate("/pipeline/kanban");
  };

  const handleAddTag = async (leadId: string) => {
    if (!newTag.trim()) return;
    const { error } = await supabase.from("lead_tags").insert({ lead_id: leadId, tag: newTag.trim() });
    if (error) {
      if (error.code === "23505") toast({ title: "Tag already exists" });
      else toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewTag("");
      const { data } = await supabase.from("lead_tags").select("*");
      setTags((data as LeadTag[]) ?? []);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    await supabase.from("lead_tags").delete().eq("id", tagId);
    const { data } = await supabase.from("lead_tags").select("*");
    setTags((data as LeadTag[]) ?? []);
  };

  const openEdit = async (lead: Lead) => {
    const { data: mp } = await supabase
      .from("mortgage_profiles").select("*").eq("lead_id", lead.id).maybeSingle();
    setEditLead({ lead, initial: intakeFromLead(lead, mp) });
  };

  const openDelete = async (lead: Lead) => {
    setDeleteLead(lead);
    setDeleteBlock(null);
    setDeleteChecking(true);
    // Clean up orphaned lead_contacts rows (contact already deleted) before counting,
    // otherwise stale links inflate the contact count and block deletion.
    const { data: links } = await supabase
      .from("lead_contacts")
      .select("id, contact:contacts(id)")
      .eq("lead_id", lead.id);
    const orphanIds = (links ?? [])
      .filter((l: any) => !l.contact)
      .map((l: any) => l.id);
    if (orphanIds.length > 0) {
      await supabase.from("lead_contacts").delete().in("id", orphanIds);
    }
    const liveContacts = (links ?? []).length - orphanIds.length;
    const [{ count: opps }, { count: portal }] = await Promise.all([
      supabase.from("pipeline_opportunities").select("id", { count: "exact", head: true }).eq("lead_id", lead.id),
      supabase.from("portal_users").select("user_id", { count: "exact", head: true }).eq("lead_id", lead.id as any),
    ]);
    setDeleteBlock({ opps: opps ?? 0, contacts: liveContacts, portal: portal ?? 0 });
    setDeleteChecking(false);
  };

  const confirmDelete = async () => {
    if (!deleteLead) return;
    const snapshot = deleteLead;
    // Optimistic remove from list, then hard delete with undo window.
    setLeads((prev) => prev.filter((x) => x.id !== snapshot.id));
    setDeleteLead(null);
    setDeleteBlock(null);

    let undone = false;
    sonnerToast(`Deleted ${snapshot.first_name} ${snapshot.last_name}`, {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => { undone = true; },
      },
    });
    setTimeout(async () => {
      if (undone) { load(); return; }
      const { error } = await supabase.from("leads").delete().eq("id", snapshot.id);
      if (error) {
        toast({ title: "Delete failed", description: error.message, variant: "destructive" });
        load();
      }
    }, 5000);
  };

  const getLeadTags = (leadId: string) => tags.filter(t => t.lead_id === leadId);

  const fourteenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString();
  }, []);

  const filtered = useMemo(() => {
    // Hide any lead that already has an opportunity in the pipeline.
    let result = leads.filter((l) => {
      if (opportunityLeadIds.has(l.id)) return false;
      const email = (l.email ?? "").toLowerCase().trim();
      if (email && pipelineBorrowerEmails.has(email)) return false;
      return true;
    });

    // Smart view filters
    if (smartView === "hot") result = result.filter(l => (l.lead_score ?? 0) > 70);
    if (smartView === "ready") result = result.filter(l => (l.lead_score ?? 0) > 60 || l.intent_tag === "application_start");
    if (smartView === "fha") result = result.filter(l => l.intent_tag?.toLowerCase().includes("fha"));
    if (smartView === "inactive") result = result.filter(l => l.updated_at < fourteenDaysAgo);

    // Status filter
    if (statusFilter !== "all") result = result.filter(l => l.status === statusFilter);

    // Source filter
    if (sourceFilter !== "all") result = result.filter(l => l.source === sourceFilter);

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        `${l.first_name} ${l.last_name} ${l.email ?? ""} ${l.intent_tag ?? ""} ${l.phone ?? ""}`.toLowerCase().includes(q)
      );
    }

    return result;
  }, [leads, opportunityLeadIds, pipelineBorrowerEmails, smartView, statusFilter, sourceFilter, search, fourteenDaysAgo]);

  const uniqueSources = useMemo(() =>
    [...new Set(leads.map(l => l.source).filter(Boolean))] as string[],
    [leads]
  );

  const statuses = LEAD_STATUSES;

  return (
    <>
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden -m-3 sm:-m-4 md:-m-6">
      {/* Left Sidebar — Filters (desktop) */}
      <div className="hidden lg:flex w-56 flex-col border-r bg-card p-4 gap-5 overflow-y-auto shrink-0">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Smart Views</h3>
          <div className="space-y-0.5">
            {smartViews.map(v => (
              <button
                key={v.key}
                onClick={() => setSmartView(v.key)}
                className={`flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                  smartView === v.key
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <v.icon className="h-3.5 w-3.5" />
                {v.label}
                <span className="ml-auto text-xs opacity-70">
                  {v.key === "all" ? leads.length
                    : v.key === "hot" ? leads.filter(l => (l.lead_score ?? 0) > 70).length
                    : v.key === "ready" ? leads.filter(l => (l.lead_score ?? 0) > 60 || l.intent_tag === "application_start").length
                    : v.key === "fha" ? leads.filter(l => l.intent_tag?.toLowerCase().includes("fha")).length
                    : leads.filter(l => l.updated_at < fourteenDaysAgo).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status</h3>
          <div className="space-y-0.5">
            <button
              onClick={() => setStatusFilter("all")}
              className={`w-full text-left rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                statusFilter === "all" ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted"
              }`}
            >All</button>
            {statuses.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`w-full text-left rounded-md px-2.5 py-1.5 text-sm capitalize transition-colors ${
                  statusFilter === s ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted"
                }`}
              >{s}</button>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Source</h3>
          <div className="space-y-0.5">
            <button
              onClick={() => setSourceFilter("all")}
              className={`w-full text-left rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                sourceFilter === "all" ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted"
              }`}
            >All</button>
            {uniqueSources.map(s => (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                className={`w-full text-left rounded-md px-2.5 py-1.5 text-sm capitalize transition-colors ${
                  sourceFilter === s ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted"
                }`}
              >{s}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 sm:gap-3 border-b bg-card px-2 sm:px-4 py-2 sm:py-3">
          <div className="relative flex-1 min-w-0 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search leads…" className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="hidden sm:flex items-center bg-muted rounded-md p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded transition-colors ${viewMode === "table" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded transition-colors ${viewMode === "kanban" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {/* Mobile filter toggle */}
          <Button variant="outline" size="sm" className="lg:hidden shrink-0" onClick={() => setMobileFiltersOpen(true)}>
            <Filter className="h-4 w-4" />
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="shrink-0"><Plus className="sm:mr-1.5 h-3.5 w-3.5" /><span className="hidden sm:inline">Add Lead</span></Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New Lead — Smart Intake</DialogTitle></DialogHeader>
              <SmartLeadForm
                sources={sources}
                onSaved={(newLeadId) => {
                  setOpen(false);
                  load();
                  // Jump straight into the new lead's workspace so the
                  // freshly-computed sentiment / mortgage snapshot is visible.
                  if (newLeadId) navigate(`/crm/leads/${newLeadId}`);
                }}
                onCancel={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-auto">
          {viewMode === "table" ? (
            <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y">
              {filtered.length === 0 ? (
                <div className="text-center text-muted-foreground py-12 text-sm">No leads found</div>
              ) : filtered.map(l => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLead(l)}
                  className={`w-full text-left px-3 py-3 hover:bg-muted/50 transition-colors ${(l as any).is_stuck ? "bg-amber-500/5" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                      {l.first_name[0]}{l.last_name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-medium text-sm truncate">{l.first_name} {l.last_name}</p>
                        <StuckBadge lead={l} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{l.email ?? "—"}</p>
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className={`text-[10px] ${statusColors[l.status] ?? ""}`}>
                          {stageLabels[l.status] ?? l.status}
                        </Badge>
                        <HeatBadge score={l.lead_score} />
                        <span className="text-[10px] text-muted-foreground"><LastActivity lead={l} /></span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
            {/* Desktop table */}
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">Source</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Activity</TableHead>
                  <TableHead className="hidden xl:table-cell">Created</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      No leads found
                    </TableCell>
                  </TableRow>
                ) : filtered.map(l => (
                  <TableRow
                    key={l.id}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${(l as any).is_stuck ? "bg-amber-500/5" : ""}`}
                    onClick={() => setSelectedLead(l)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                          {l.first_name[0]}{l.last_name[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-sm">{l.first_name} {l.last_name}</p>
                            <StuckBadge lead={l} />
                          </div>
                          <p className="text-xs text-muted-foreground sm:hidden">{l.email ?? ""}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{l.email ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{l.source ?? "—"}</span>
                    </TableCell>
                    <TableCell className="w-28">
                      <ScoreBadge score={l.lead_score} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${statusColors[l.status] ?? ""}`}>
                        {stageLabels[l.status] ?? l.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <LastActivity lead={l} />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                      {new Date(l.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedLead(l)}>
                            <Eye className="h-3.5 w-3.5 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/crm/leads/${l.id}`)}>
                            <ArrowUpRightSquare className="h-3.5 w-3.5 mr-2" /> Open Workspace
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(l)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          {l.email && (
                            <DropdownMenuItem
                              onClick={() => {
                                navigator.clipboard.writeText(l.email!);
                                sonnerToast.success("Email copied");
                              }}
                            >
                              <Copy className="h-3.5 w-3.5 mr-2" /> Copy Email
                            </DropdownMenuItem>
                          )}
                          {normalizeStatus(l.status) === "qualified" && (
                            <DropdownMenuItem onClick={() => handleConvertToPipeline(l)}>
                              <ArrowRightCircle className="h-3.5 w-3.5 mr-2" /> Move to Pipeline
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => openDelete(l)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </>
          ) : (
            /* Kanban View */
            <div className="flex gap-3 p-4 overflow-x-auto h-full">
              {LEAD_STATUSES.map(status => {
                const statusLeads = filtered.filter(l => l.status === status);
                return (
                  <div key={status} className="flex-shrink-0 w-64">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h3 className="text-sm font-semibold">{stageLabels[status] ?? status}</h3>
                      <Badge variant="secondary" className="text-xs">{statusLeads.length}</Badge>
                    </div>
                    <div className="space-y-2 min-h-[200px] rounded-lg bg-muted/30 p-2">
                      {statusLeads.map(l => (
                        <Card
                          key={l.id}
                          className={`cursor-pointer hover:shadow-md transition-all ${(l as any).is_stuck ? "ring-1 ring-amber-500/40" : ""}`}
                          onClick={() => setSelectedLead(l)}
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">
                                {l.first_name[0]}{l.last_name[0]}
                              </div>
                              <p className="font-medium text-sm truncate flex-1">{l.first_name} {l.last_name}</p>
                              <StuckBadge lead={l} />
                              <div onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setSelectedLead(l)}>
                                      <Eye className="h-3.5 w-3.5 mr-2" /> View
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigate(`/crm/leads/${l.id}`)}>
                                      <ArrowUpRightSquare className="h-3.5 w-3.5 mr-2" /> Open Workspace
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openEdit(l)}>
                                      <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                                    </DropdownMenuItem>
                                    {l.email && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          navigator.clipboard.writeText(l.email!);
                                          sonnerToast.success("Email copied");
                                        }}
                                      >
                                        <Copy className="h-3.5 w-3.5 mr-2" /> Copy Email
                                      </DropdownMenuItem>
                                    )}
                                    {normalizeStatus(l.status) === "qualified" && (
                                      <DropdownMenuItem onClick={() => handleConvertToPipeline(l)}>
                                        <ArrowRightCircle className="h-3.5 w-3.5 mr-2" /> Move to Pipeline
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => openDelete(l)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <HeatBadge score={l.lead_score} />
                              <span className="text-xs font-mono text-muted-foreground">{l.lead_score ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <LastActivity lead={l} />
                              {l.intent_tag && (
                                <Badge variant="outline" className="text-[10px]">{l.intent_tag}</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Detail Panel */}
      <Sheet open={!!selectedLead} onOpenChange={open => { if (!open) setSelectedLead(null); }}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
          {selectedLead && (
            <>
              <SheetHeader className="p-5 pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold">
                      {selectedLead.first_name[0]}{selectedLead.last_name[0]}
                    </div>
                    <div>
                      <SheetTitle className="text-lg">
                        {selectedLead.first_name} {selectedLead.last_name}
                      </SheetTitle>
                      <p className="text-sm text-muted-foreground">{selectedLead.email ?? "No email"}</p>
                      <Link
                        to={`/crm/leads/${selectedLead.id}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                      >
                        Open full workspace <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1">
                <div className="px-5 pb-5 space-y-5">
                  {/* Score & Heat */}
                  <div className="flex items-center gap-3">
                    <HeatBadge score={selectedLead.lead_score} />
                    <div className="flex-1">
                      <ScoreBadge score={selectedLead.lead_score} />
                    </div>
                  </div>

                  {/* Quick Info */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedLead.phone ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Source</p>
                      <p className="font-medium capitalize">{selectedLead.source ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Intent</p>
                      <p className="font-medium">{selectedLead.intent_tag ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Timeline</p>
                      <p className="font-medium">{selectedLead.timeline ?? "—"}</p>
                    </div>
                  </div>

                  {/* Status Selector */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Status</p>
                    <Select
                      value={selectedLead.status}
                      onValueChange={(v) => handleStatusChange(selectedLead.id, v as Enums<"lead_status">)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const current = normalizeStatus(selectedLead.status);
                          const allowed = new Set([current, ...getAllowedNext("lead", current)]);
                          return statuses.map(s => (
                            <SelectItem key={s} value={s} disabled={!allowed.has(s)} className="capitalize">
                              {stageLabels[s] ?? s}
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                    {normalizeStatus(selectedLead.status) === "qualified" && (
                      (() => {
                        const hasAddr = !!(selectedLead as any).property_address;
                        const hasContact = selectedLeadContactCount > 0;
                        const ready = hasAddr && hasContact;
                        return (
                          <div className="mt-2 space-y-2">
                            <Button
                              size="sm"
                              disabled={!ready}
                              title={ready ? "" : "Add property address and link a contact first"}
                              className="w-full bg-emerald-600 hover:bg-emerald-600/90 text-white border-2 border-emerald-700/40 shadow-sm gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                              onClick={() => handleConvertToPipeline(selectedLead)}
                            >
                              <ArrowRightCircle className="h-4 w-4" />
                              Application Complete — Move to Pipeline
                            </Button>
                            {!ready && (
                              <ul className="text-[11px] space-y-1 rounded-md border border-border bg-muted/30 p-2">
                                <li className="flex items-center gap-1.5">
                                  <span className={hasAddr ? "text-emerald-600" : "text-destructive"}>
                                    {hasAddr ? "✓" : "•"}
                                  </span>
                                  <span className={hasAddr ? "text-muted-foreground" : ""}>
                                    Property address {hasAddr ? "set" : "— click Edit to add it"}
                                  </span>
                                </li>
                                <li className="flex items-center gap-1.5">
                                  <span className={hasContact ? "text-emerald-600" : "text-destructive"}>
                                    {hasContact ? "✓" : "•"}
                                  </span>
                                  <span className={hasContact ? "text-muted-foreground" : ""}>
                                    Linked contact {hasContact ? "present" : "— Open full workspace → Relationships"}
                                  </span>
                                </li>
                              </ul>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>

                  <Separator />

                  {/* Tags */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {getLeadTags(selectedLead.id).map(t => (
                        <Badge key={t.id} variant="outline" className="gap-1 text-xs">
                          <Tag className="h-2.5 w-2.5" />
                          {t.tag}
                          <button onClick={() => handleRemoveTag(t.id)} className="ml-0.5 hover:text-destructive">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      ))}
                      {getLeadTags(selectedLead.id).length === 0 && (
                        <span className="text-xs text-muted-foreground">No tags</span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <Input
                        placeholder="Add tag…"
                        className="h-7 text-xs"
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(selectedLead.id); } }}
                      />
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => handleAddTag(selectedLead.id)}>
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedLead.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm">{selectedLead.notes}</p>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Activity Timeline */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Income Analysis</p>
                    <LeadIncomeSection
                      leadId={selectedLead.id}
                      fallbackName={`${selectedLead.first_name ?? ""} ${selectedLead.last_name ?? ""}`.trim() || "Borrower"}
                    />
                  </div>

                  <Separator />

                  {/* Activity Timeline */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Activity Timeline</p>
                    {events.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No activity recorded</p>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
                        <div className="space-y-3">
                          {events.map(ev => {
                            const Icon = eventIcons[ev.event_type] ?? Clock;
                            return (
                              <div key={ev.id} className="flex gap-3 relative">
                                <div className="z-10 flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border">
                                  <Icon className="h-3 w-3 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{ev.event_type.replace(/_/g, " ")}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{new Date(ev.created_at).toLocaleString()}</span>
                                    {ev.points > 0 && (
                                      <Badge variant="secondary" className="text-[10px] h-4">+{ev.points}pts</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
    <AssistantLauncher scope="crm" />

    {/* Edit Lead dialog */}
    <Dialog open={!!editLead} onOpenChange={(o) => { if (!o) setEditLead(null); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Lead</DialogTitle></DialogHeader>
        {editLead && (
          <SmartLeadForm
            leadId={editLead.lead.id}
            initial={editLead.initial}
            sources={sources}
            onSaved={() => { setEditLead(null); load(); }}
            onCancel={() => setEditLead(null)}
          />
        )}
      </DialogContent>
    </Dialog>

    {/* Delete confirm */}
    <AlertDialog
      open={!!deleteLead}
      onOpenChange={(o) => { if (!o) { setDeleteLead(null); setDeleteBlock(null); } }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {deleteLead && (
                <p>
                  This will permanently delete{" "}
                  <span className="font-medium text-foreground">
                    {deleteLead.first_name} {deleteLead.last_name}
                  </span>
                  . This action cannot be undone.
                </p>
              )}
              {deleteChecking && (
                <p className="text-xs text-muted-foreground">Checking linked records…</p>
              )}
              {!deleteChecking && deleteBlock && (deleteBlock.opps + deleteBlock.contacts + deleteBlock.portal) > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-sm text-destructive">
                  Cannot delete — {deleteBlock.opps + deleteBlock.contacts + deleteBlock.portal} linked record
                  {(deleteBlock.opps + deleteBlock.contacts + deleteBlock.portal) === 1 ? "" : "s"} found
                  {" "}({deleteBlock.opps} opportunities, {deleteBlock.contacts} contacts, {deleteBlock.portal} portal users).
                  Edit instead.
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteChecking || !deleteBlock || (deleteBlock.opps + deleteBlock.contacts + deleteBlock.portal) > 0}
            onClick={confirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
