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
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Flame, ThermometerSun, Snowflake, LayoutGrid, List,
  X, Clock, Eye, MousePointerClick, FileText, Tag, ChevronRight,
  Filter, Zap, Users, UserCheck, AlertTriangle,
} from "lucide-react";
import type { Tables, Enums } from "@/integrations/supabase/types";
import { Constants } from "@/integrations/supabase/types";

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

const statusColors: Record<string, string> = {
  new: "bg-primary/10 text-primary border-primary/20",
  contacted: "bg-accent/10 text-accent-foreground border-accent/30",
  pre_qualified: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  qualified: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  application_started: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  underwriting: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  approved: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  closed: "bg-emerald-500 text-white border-emerald-600",
  unqualified: "bg-muted text-muted-foreground border-border",
  converted: "bg-emerald-500 text-white border-emerald-600",
  lost: "bg-destructive/10 text-destructive border-destructive/20",
};

const stageLabels: Record<string, string> = {
  new: "New Lead",
  contacted: "Contacted",
  pre_qualified: "Pre-Qualified",
  qualified: "Qualified",
  application_started: "Application Started",
  underwriting: "Underwriting",
  approved: "Approved",
  closed: "Closed",
  unqualified: "Unqualified",
  converted: "Converted",
  lost: "Lost",
};

// Pipeline stages in order for kanban
const pipelineStages = ["new", "contacted", "pre_qualified", "application_started", "underwriting", "approved", "closed"] as const;

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
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [smartView, setSmartView] = useState<SmartView>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [newTag, setNewTag] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const load = async () => {
    const [{ data: l }, { data: s }, { data: t }] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("lead_sources").select("*").order("name"),
      supabase.from("lead_tags").select("*"),
    ]);
    setLeads(l ?? []);
    setSources(s ?? []);
    setTags((t as LeadTag[]) ?? []);
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

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("leads").insert({
      first_name: fd.get("first_name") as string,
      last_name: fd.get("last_name") as string,
      email: (fd.get("email") as string) || null,
      phone: (fd.get("phone") as string) || null,
      source_id: (fd.get("source_id") as string) || null,
      notes: (fd.get("notes") as string) || null,
      created_by: user!.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lead created" });
      setOpen(false);
      load();
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: Enums<"lead_status">) => {
    const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", leadId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      load();
      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
      }
    }
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

  const getLeadTags = (leadId: string) => tags.filter(t => t.lead_id === leadId);

  const fourteenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString();
  }, []);

  const filtered = useMemo(() => {
    let result = leads;

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
  }, [leads, smartView, statusFilter, sourceFilter, search, fourteenDaysAgo]);

  const uniqueSources = useMemo(() =>
    [...new Set(leads.map(l => l.source).filter(Boolean))] as string[],
    [leads]
  );

  const statuses = Constants.public.Enums.lead_status;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left Sidebar — Filters */}
      <div className="hidden lg:flex w-56 flex-col border-r bg-card p-4 gap-5 overflow-y-auto">
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search leads…" className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="flex items-center bg-muted rounded-md p-0.5">
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
          <Button variant="outline" size="sm" className="lg:hidden">
            <Filter className="h-4 w-4" />
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Add Lead</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="first_name">First name</Label>
                    <Input id="first_name" name="first_name" required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="last_name">Last name</Label>
                    <Input id="last_name" name="last_name" required />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" />
                </div>
                <div className="space-y-1">
                  <Label>Source</Label>
                  <Select name="source_id">
                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>
                      {sources.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" rows={3} />
                </div>
                <Button type="submit" className="w-full">Create Lead</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-auto">
          {viewMode === "table" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">Source</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Activity</TableHead>
                  <TableHead className="hidden xl:table-cell">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            /* Kanban View */
            <div className="flex gap-3 p-4 overflow-x-auto h-full">
              {pipelineStages.map(status => {
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
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
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
                        {statuses.map(s => (
                          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
  );
}
