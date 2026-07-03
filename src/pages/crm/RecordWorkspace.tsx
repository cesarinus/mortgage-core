import { useEffect, useState, useCallback } from "react";
import { useParams, Navigate, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LeftRail } from "@/components/crm/LeftRail";
import { RightRail } from "@/components/crm/RightRail";
import { PortalIntelligencePanel } from "@/components/crm/PortalIntelligencePanel";
import { MortgageSnapshotCard } from "@/components/crm/MortgageSnapshotCard";
import AriveExportCard from "@/components/crm/AriveExportCard";
import LosSyncCard from "@/components/crm/LosSyncCard";
import { CatchUpTab } from "@/components/crm/tabs/CatchUpTab";
import { IncomeAnalysisCard } from "@/components/crm/IncomeAnalysisCard";
import { UnifiedTimelineTab } from "@/components/crm/tabs/UnifiedTimelineTab";
import { LoanScenariosTab } from "@/components/crm/tabs/LoanScenariosTab";
import { MessagesTab } from "@/components/crm/tabs/MessagesTab";
import { DocumentsTab } from "@/components/crm/tabs/DocumentsTab";
import { RelationshipsTab } from "@/components/crm/tabs/RelationshipsTab";
import { TasksTab } from "@/components/crm/tabs/TasksTab";
import { TaskListPanel } from "@/components/tasks/TaskListPanel";
import { ConditionsTab } from "@/components/crm/tabs/ConditionsTab";
import CustomFieldsRenderer from "@/components/crm/CustomFieldsRenderer";
import { BarChart2, MessageSquare, FileCheck2, Users, CheckSquare, Mail, ClipboardCheck } from "lucide-react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SmartLeadForm } from "@/components/crm/SmartLeadForm";
import { intakeFromLead } from "@/lib/crm/leadIntake";
import { AssistantPanel } from "@/components/chat/AssistantPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sparkles as SparklesIcon } from "lucide-react";
import {
  NoteModal, TaskModal, CallModal, MeetingModal, EmailModal, UploadModal,
} from "@/components/crm/actions/ActionModals";
import { LinkContactModal, LinkCompanyModal } from "@/components/crm/actions/LinkContactCompanyModals";
import { CompaniesEditDrawer } from "@/components/crm/CompaniesEditDrawer";
import EmailLogList from "@/components/email/EmailLogList";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS } from "@/lib/crm/stages";
import {
  fetchActivities, fetchAttachments, fetchCompanies, fetchContact, fetchDeals, fetchLeadContacts,
  fetchDocCategories, fetchEmailLogs, fetchLead, fetchMortgageProfile, fetchSentiment, fetchTags,
} from "@/lib/crm/queries";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeStatus, recordLeadTransition } from "@/lib/crm/stateMachine";
import { getStageSuggestions } from "@/lib/crm/stageTasks";
import { moveLeadToPipeline } from "@/lib/crm/moveToPipeline";
import { ArrowRightCircle } from "lucide-react";

interface Props { kind: "lead" | "contact" }

export default function RecordWorkspace({ kind }: Props) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const fromPipelineState = (location.state as any)?.from === "pipeline";
  const { user } = useAuth();
  const [record, setRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("catch-up");
  const [activities, setActivities] = useState<any[]>([]);
  const [leadEvents, setLeadEvents] = useState<any[]>([]);
  const [dealEvents, setDealEvents] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [primaryOpp, setPrimaryOpp] = useState<any | null>(null);
  const [linkedContacts, setLinkedContacts] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [mortgage, setMortgage] = useState<any | null>(null);
  const [sentiment, setSentiment] = useState<any | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [modal, setModal] = useState<null | "note" | "email" | "call" | "task" | "meeting" | "upload" | "linkContact" | "linkCompany">(null);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [oppEditOpen, setOppEditOpen] = useState(false);
  const [companiesEditOpen, setCompaniesEditOpen] = useState(false);
  const [oppDraft, setOppDraft] = useState<{ stage: string; property_address: string }>({ stage: "application_sent", property_address: "" });
  const [sources, setSources] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [chatOpen, setChatOpen] = useState(true);
  // Pipeline mode is sticky: detected from router state OR from the existence
  // of a pipeline_opportunity for this lead, so refreshes / re-renders after
  // edits don't lose the pipeline context (back link + stage dropdown).
  const fromPipeline = fromPipelineState || !!primaryOpp;
  useEffect(() => {
    // Default-open on desktop when viewing a lead; mobile stays closed (bottom sheet).
    setChatOpen(kind === "lead" && !isMobile);
  }, [kind, isMobile, id]);

  const loadAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const rec = kind === "lead"
        ? await fetchLead(id).catch(() => null)
        : await fetchContact(id).catch(() => null);
      setRecord(rec);
      if (!rec) return;
      // For contact kind, resolve the most recent linked lead via lead_contacts
      let resolvedLeadId: string | undefined = kind === "lead" ? id : undefined;
      if (kind === "contact" && id) {
        const { data: lc } = await supabase
          .from("lead_contacts")
          .select("lead_id, created_at")
          .eq("contact_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        resolvedLeadId = (lc as any)?.lead_id ?? undefined;
      }
      const leadId = resolvedLeadId;
      const contactId = kind === "contact" ? id : undefined;
      const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);
      const [acts, mails, atts, cos, dls, lcs, tgs, mp, st, cats] = await Promise.all([
        safe(fetchActivities({ leadId, contactId }), [] as any[]),
        leadId ? safe(fetchEmailLogs(leadId), [] as any[]) : Promise.resolve([] as any[]),
        leadId ? safe(fetchAttachments(leadId), [] as any[]) : Promise.resolve([] as any[]),
        // Contact page: only companies linked to THIS contact.
        // Lead page: companies are derived AFTER lcs loads (see below) so the
        // Companies card reflects the employers/agencies of the linked
        // Contacts (Realtor, Title, Insurance, etc.), not lead-level links.
        kind === "contact"
          ? safe(fetchCompanies(undefined, contactId), [] as any[])
          : Promise.resolve([] as any[]),
        safe(fetchDeals(contactId), [] as any[]),
        leadId ? safe(fetchLeadContacts(leadId), [] as any[]) : Promise.resolve([] as any[]),
        leadId ? safe(fetchTags(leadId), [] as any[]) : Promise.resolve([] as any[]),
        leadId ? safe(fetchMortgageProfile(leadId), null) : Promise.resolve(null),
        leadId ? safe(fetchSentiment(leadId), null) : Promise.resolve(null),
        safe(fetchDocCategories(), [] as any[]),
      ]);
      setActivities(acts); setEmailLogs(mails); setAttachments(atts);
      // On a contact page, also surface the contact's own company_id (the
      // employer on the contact record) if there's no explicit link row yet.
      let mergedCompanies = cos;
      if (kind === "contact" && (rec as any)?.company_id) {
        const has = (cos ?? []).some((cc: any) => cc.company_id === (rec as any).company_id);
        if (!has) {
          const { data: co } = await supabase
            .from("crm_companies")
            .select("*")
            .eq("id", (rec as any).company_id)
            .maybeSingle();
          if (co) {
            mergedCompanies = [
              { id: `contact-company-${(rec as any).company_id}`, contact_id: id, company_id: (rec as any).company_id, role: null, company: co, __source: "contact" },
              ...(cos ?? []),
            ];
          }
        }
      }
      // Lead page: derive companies from the linked contacts.
      if (kind === "lead") {
        const contactIds = Array.from(new Set((lcs ?? []).map((r: any) => r.contact_id).filter(Boolean)));
        const derived: any[] = [];
        if (contactIds.length > 0) {
          // 1) Employer on the contact record (contacts.company_id)
          const employerRows = (lcs ?? [])
            .filter((r: any) => r.contact?.company_id)
            .map((r: any) => ({
              id: `contact-company-${r.contact_id}-${r.contact.company_id}`,
              contact_id: r.contact_id,
              company_id: r.contact.company_id,
              role: r.contact?.job_title ?? r.role ?? null,
              __source: "contact",
              __contactName: `${r.contact?.first_name ?? ""} ${r.contact?.last_name ?? ""}`.trim(),
            }));
          // 2) Explicit contact↔company links
          const { data: ccLinks } = await supabase
            .from("crm_contact_companies")
            .select("*")
            .in("contact_id", contactIds);
          const linkRows = (ccLinks ?? []).map((cc: any) => ({ ...cc, __source: "link" }));
          derived.push(...employerRows, ...linkRows);
        }
        // Dedupe by company_id (prefer explicit link rows over employer-derived)
        const byCompany = new Map<string, any>();
        for (const row of derived) {
          if (!row.company_id) continue;
          const existing = byCompany.get(row.company_id);
          if (!existing || (existing.__source === "contact" && row.__source === "link")) {
            byCompany.set(row.company_id, row);
          }
        }
        const unique = Array.from(byCompany.values());
        const companyIds = unique.map((r) => r.company_id);
        if (companyIds.length > 0) {
          const { data: cmps } = await supabase
            .from("crm_companies")
            .select("*")
            .in("id", companyIds);
          const byId = new Map((cmps ?? []).map((c: any) => [c.id, c]));
          mergedCompanies = unique.map((r) => ({ ...r, company: byId.get(r.company_id) ?? null }));
        } else {
          mergedCompanies = [];
        }
      }
      setCompanies(mergedCompanies); setDeals(dls); setLinkedContacts(lcs); setTags(tgs);
      setMortgage(mp); setSentiment(st); setCategories(cats);

      // For lead kind, deals are linked through the lead's contacts. Resolve and merge.
      let mergedDeals = dls;
      if (kind === "lead") {
        const contactIds = Array.from(new Set((lcs ?? []).map((r: any) => r.contact_id).filter(Boolean)));
        if (contactIds.length > 0) {
          const { data: leadDeals } = await supabase
            .from("deals")
            .select("*")
            .in("contact_id", contactIds);
          mergedDeals = leadDeals ?? [];
          setDeals(mergedDeals);
        }
      }

      // Unified timeline sources: lead_events + deal_events
      const dealIds = (mergedDeals ?? []).map((d: any) => d.id).filter(Boolean);
      const [le, de] = await Promise.all([
        leadId
          ? (supabase
              .from("lead_events")
              .select("*")
              .eq("lead_id", leadId)
              .order("created_at", { ascending: false })
              .limit(200) as unknown as Promise<{ data: any[] | null }>)
              .then(({ data }) => data ?? [])
              .catch(() => [] as any[])
          : Promise.resolve([] as any[]),
        dealIds.length
          ? (supabase
              .from("deal_events")
              .select("*")
              .in("deal_id", dealIds)
              .order("created_at", { ascending: false })
              .limit(200) as unknown as Promise<{ data: any[] | null }>)
              .then(({ data }) => data ?? [])
              .catch(() => [] as any[])
          : Promise.resolve([] as any[]),
      ]);
      setLeadEvents(le);
      setDealEvents(de);

      // Pipeline deals for THIS lead only — filter by pipeline_opportunities.lead_id.
      if (kind === "lead" && leadId) {
        const { data: opps } = await supabase
          .from("pipeline_opportunities")
          .select("*")
          .eq("lead_id", leadId);
        const list = opps ?? [];
        // Dedupe opportunities that represent the same deal for this lead
        // (same normalized property address + loan amount + stage). Keep the
        // most recently updated/created record so the Deals card on the
        // right rail mirrors the single lead shown in the left column.
        const norm = (s: any) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
        const ts = (o: any) => new Date(o.updated_at ?? o.created_at ?? 0).getTime();
        const sorted = [...list].sort((a: any, b: any) => ts(b) - ts(a));
        const seen = new Set<string>();
        const deduped: any[] = [];
        for (const o of sorted) {
          const key = `${norm(o.property_address)}|${o.loan_amount ?? ""}|${norm(o.stage)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(o);
        }
        setPrimaryOpp(deduped[0] ?? null);
        setOpportunities(deduped.map((o: any) => ({
          id: o.id,
          loan_type: o.property_address ? `Mortgage — ${o.property_address}` : "Mortgage deal",
          stage: o.stage,
          loan_amount: o.loan_amount,
        })));
      } else {
        setPrimaryOpp(null);
        setOpportunities([]);
      }
    } catch (e: any) {
      toast({ title: "Failed to load workspace", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, kind]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    supabase.from("lead_sources").select("id,name").order("name")
      .then(({ data }) => setSources((data as any) ?? []));
  }, []);

  const onSignedUrl = async (path: string) => {
    const { data, error } = await supabase.storage.from("crm-documents").createSignedUrl(path, 60);
    if (error) { toast({ title: "Could not generate link", description: error.message, variant: "destructive" }); return null; }
    return data?.signedUrl ?? null;
  };

  const handleRemoveContact = async (lc: any) => {
    if (!lc?.id) return;
    if (!confirm(`Remove ${lc?.contact?.first_name ?? "this contact"} from this ${kind}?`)) return;
    const { error } = await supabase.from("lead_contacts").delete().eq("id", lc.id);
    if (error) toast({ title: "Failed to remove contact", description: error.message, variant: "destructive" });
    else { toast({ title: "Contact removed" }); loadAll(); }
  };

  const handleRemoveCompany = async (cc: any) => {
    if (!cc) return;
    if (!confirm(`Remove ${cc?.company?.name ?? "this company"} from this ${kind}?`)) return;
    if (cc.__source === "contact") {
      // Clear the employer (contacts.company_id) on the underlying contact.
      const targetContactId = kind === "contact" ? id : cc.contact_id;
      if (!targetContactId) { toast({ title: "Failed", description: "Missing contact reference", variant: "destructive" }); return; }
      const { error } = await supabase.from("contacts").update({ company_id: null }).eq("id", targetContactId);
      if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("crm_contact_companies").delete().eq("id", cc.id);
      if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "Company removed" }); loadAll();
  };

  const refreshSentiment = async () => {
    if (!id || kind !== "lead") return;
    // Recompute deterministic signals from current lead + mortgage_profile state
    const { deriveSignals, computeTemperature, computeScore, intakeFromLead } =
      await import("@/lib/crm/leadIntake");
    const intake = intakeFromLead(record, mortgage);
    const signals = deriveSignals(intake);
    const score = computeScore(intake);
    const temperature = computeTemperature(score);
    const payload = {
      lead_id: id,
      temperature,
      summary: signals.summary,
      recommendations: signals.recommendations,
      challenges: signals.challenges,
      positives: signals.positives,
      generated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("lead_sentiment").upsert(payload as any, { onConflict: "lead_id" });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setSentiment(payload); toast({ title: "Summary refreshed" }); }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id || kind !== "lead") return;
    if (fromPipeline) {
      // Pipeline mode: update pipeline_opportunities.stage only.
      if (!primaryOpp?.id) {
        toast({ title: "No pipeline opportunity", description: "Move this lead to the pipeline first.", variant: "destructive" });
        return;
      }
      const prevStage = primaryOpp.stage;
      setPrimaryOpp((p: any) => p ? { ...p, stage: newStatus } : p);
      const { error } = await supabase.from("pipeline_opportunities").update({ stage: newStatus }).eq("id", primaryOpp.id);
      if (error) {
        setPrimaryOpp((p: any) => p ? { ...p, stage: prevStage } : p);
        toast({ title: "Failed to update stage", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Pipeline stage updated", description: PIPELINE_STAGE_LABELS[newStatus] ?? newStatus });
        loadAll();
      }
      return;
    }
    const prev = normalizeStatus(record?.status, "new");
    const next = normalizeStatus(newStatus);
    if (prev === next) return;
    setRecord((r: any) => ({ ...r, status: next }));
    const { error } = await supabase.from("leads").update({ status: next as any }).eq("id", id);
    if (error) {
      setRecord((r: any) => ({ ...r, status: prev }));
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    } else {
      await recordLeadTransition(id, prev, next);
      toast({ title: "Status updated", description: next.replace(/_/g, " ") });
      const suggested = getStageSuggestions(next);
      if (suggested.length > 0) {
        toast({
          title: `Suggested ${suggested.length} next action${suggested.length === 1 ? "" : "s"}`,
          description: "View in Tasks tab",
        });
      }
      // Lead status changes no longer mirror to deals — the Pipeline lives in
      // pipeline_opportunities, populated via the explicit Move-to-Pipeline action.
      loadAll();
    }
  };

  if (!id) return <Navigate to="/leads" replace />;
  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64" /></div>;
  if (!record) return <div className="p-10 text-center text-muted-foreground">Record not found.</div>;

  return (
    <>
    <div
      className="p-4 md:p-6 max-w-[1600px] mx-auto transition-[padding] duration-200"
      style={{ paddingRight: kind === "lead" && chatOpen && !isMobile ? 400 : undefined }}
    >
      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-12 lg:col-span-3">
          <LeftRail
            record={record}
            kind={kind}
            tags={tags}
            onAction={(k) => setModal(k)}
            onStatusChange={kind === "lead" ? handleStatusChange : undefined}
            onEdit={kind === "lead" ? () => (fromPipeline ? (setOppDraft({ stage: primaryOpp?.stage ?? "application_sent", property_address: primaryOpp?.property_address ?? "" }), setOppEditOpen(true)) : setIntakeOpen(true)) : undefined}
            opportunity={primaryOpp}
            pipelineMode={kind === "lead" && fromPipeline}
          />
          {kind === "lead" && (
            <div className="mt-3 space-y-3">
              <AriveExportCard
                lead={record}
                opportunity={primaryOpp}
                mortgageProfile={mortgage}
                onSent={() => window.location.reload()}
              />
              <LosSyncCard leadId={record.id} />
              {!fromPipeline && (
                <MoveToPipelineCard
                  record={record}
                  userId={user?.id}
                  onDone={loadAll}
                />
              )}
            </div>
          )}
        </aside>

        <main className="col-span-12 lg:col-span-6 flex flex-col h-full">
          <Tabs defaultValue="catch-up" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`w-full grid ${kind === "lead" ? "grid-cols-9" : "grid-cols-8"}`}>
              <TabsTrigger value="catch-up">Catch-up</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="details" className="flex items-center gap-1.5">
                Details
              </TabsTrigger>
              {kind === "lead" && (
                <TabsTrigger value="scenarios" className="flex items-center gap-1.5">
                  <BarChart2 className="h-3.5 w-3.5" /> Scenarios
                </TabsTrigger>
              )}
              <TabsTrigger value="messages" className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Messages
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5" /> Tasks
              </TabsTrigger>
              {kind === "lead" && (
                <TabsTrigger value="conditions" className="flex items-center gap-1.5">
                  <ClipboardCheck className="h-3.5 w-3.5" /> Conditions
                </TabsTrigger>
              )}
              <TabsTrigger value="documents" className="flex items-center gap-1.5">
                <FileCheck2 className="h-3.5 w-3.5" /> Documents
              </TabsTrigger>
              <TabsTrigger value="emails" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Emails
              </TabsTrigger>
              {kind === "contact" && (
                <TabsTrigger value="relationships" className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Relationships
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="catch-up" className="mt-4">
              <CatchUpTab
                activities={activities}
                emailLogs={emailLogs}
                sentiment={sentiment}
                mortgage={mortgage}
                record={record}
                onRefreshSentiment={kind === "lead" ? refreshSentiment : undefined}
                leadId={kind === "lead" ? id : (record as any)?.lead_id ?? undefined}
                contactId={kind === "contact" ? id : undefined}
                hideIncomeAnalysis
                pipelineMode={kind === "lead" && fromPipeline}
              />
            </TabsContent>
            <TabsContent value="activities" className="mt-4">
              <UnifiedTimelineTab
                activities={activities}
                leadEvents={leadEvents}
                dealEvents={dealEvents}
                attachments={attachments}
                sentiment={sentiment}
                deals={deals}
                leadId={kind === "lead" ? id : (record as any)?.lead_id ?? undefined}
                contactId={kind === "contact" ? id : undefined}
              />
            </TabsContent>
            {id && (
              <TabsContent value="details" className="mt-4">
                <CustomFieldsRenderer
                  moduleSlug={kind === "lead" ? "borrowers" : "contacts"}
                  recordType={kind}
                  recordId={id}
                />
              </TabsContent>
            )}
            {kind === "lead" && (
              <TabsContent value="scenarios" className="mt-4">
                <LoanScenariosTab leadId={id} lead={record} onActivity={loadAll} />
              </TabsContent>
            )}
            <TabsContent value="messages" className="mt-4">
              <MessagesTab deals={deals} />
            </TabsContent>
            <TabsContent value="tasks" className="mt-4 space-y-6">
              {kind === "lead" && id && (
                <TaskListPanel related={{ type: "lead", id, label: `${record?.first_name ?? ""} ${record?.last_name ?? ""}`.trim() }} title="Lead Tasks" />
              )}
              {deals?.[0]?.id && (
                <TaskListPanel related={{ type: "opportunity", id: deals[0].id, label: deals[0].property_address ?? "Opportunity" }} title="Opportunity Tasks" />
              )}
            </TabsContent>
            {kind === "lead" && (
              <TabsContent value="conditions" className="mt-4">
                <ConditionsTab leadId={id} />
              </TabsContent>
            )}
            <TabsContent value="documents" className="mt-4">
              <DocumentsTab deals={deals} />
            </TabsContent>
            <TabsContent value="emails" className="mt-4">
              <EmailLogList
                leadId={kind === "lead" ? id : (record as any)?.lead_id ?? undefined}
                opportunityId={primaryOpp?.id}
              />
            </TabsContent>
            {kind === "contact" && (
              <TabsContent value="relationships" className="mt-4">
                <RelationshipsTab
                  kind={kind}
                  recordId={id}
                  linkedContacts={linkedContacts}
                  companies={companies}
                  onChanged={loadAll}
                />
              </TabsContent>
            )}
          </Tabs>
          {kind === "lead" && (
            <div className="mt-auto pt-4 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setIntakeOpen(true)}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Edit Intake
              </Button>
            </div>
          )}
        </main>

        <aside className="col-span-12 lg:col-span-3">
          <div className="space-y-4 sticky top-4 self-start">
            {kind === "lead" && id && (
              <PortalIntelligencePanel leadId={id} />
            )}
            {kind === "lead" && id && (
              <MortgageSnapshotCard personId={(record as any)?.person_id ?? null} leadId={id} />
            )}
            <RightRail
            companies={companies}
            deals={kind === "lead" ? opportunities : deals}
            contacts={(() => {
              if (kind !== "lead") return linkedContacts;
              // Hide the lead's own self-link (same email as the lead) so the
              // borrower in the left rail isn't duplicated in the Contacts card.
              const selfEmail = (record?.email ?? "").toLowerCase().trim();
              return (linkedContacts ?? []).filter((lc: any) => {
                const e = (lc?.contact?.email ?? "").toLowerCase().trim();
                return !selfEmail || e !== selfEmail;
              });
            })()}
            attachments={attachments}
            onUpload={() => setModal("upload")}
            onAddCompany={() => setModal("linkCompany")}
            onAddContact={kind === "lead" ? () => setModal("linkContact") : undefined}
            onEditCompanies={kind === "lead" ? () => setCompaniesEditOpen(true) : undefined}
            onSignedUrl={onSignedUrl}
            onRemoveContact={handleRemoveContact}
            onRemoveCompany={handleRemoveCompany}
            />
          </div>
        </aside>
      </div>

      {activeTab === "catch-up" && (
        <div className="mt-4">
          <IncomeAnalysisCard
            leadId={kind === "lead" ? id : (record as any)?.lead_id ?? undefined}
            contactId={kind === "contact" ? id : undefined}
            record={record}
          />
        </div>
      )}

      {/* Modals */}
      <NoteModal open={modal === "note"} onClose={() => setModal(null)} leadId={kind === "lead" ? id : undefined} contactId={kind === "contact" ? id : undefined} onDone={loadAll} />
      <TaskModal open={modal === "task"} onClose={() => setModal(null)} leadId={kind === "lead" ? id : undefined} contactId={kind === "contact" ? id : undefined} onDone={loadAll} />
      <CallModal open={modal === "call"} onClose={() => setModal(null)} leadId={kind === "lead" ? id : undefined} contactId={kind === "contact" ? id : undefined} onDone={loadAll} />
      <MeetingModal open={modal === "meeting"} onClose={() => setModal(null)} leadId={kind === "lead" ? id : undefined} contactId={kind === "contact" ? id : undefined} onDone={loadAll} />
      <EmailModal open={modal === "email"} onClose={() => setModal(null)} leadId={kind === "lead" ? id : undefined} contactId={kind === "contact" ? id : undefined} onDone={loadAll} recipientEmail={record?.email ?? undefined} />
      <UploadModal open={modal === "upload"} onClose={() => setModal(null)} leadId={kind === "lead" ? id : undefined} contactId={kind === "contact" ? id : undefined} onDone={loadAll} categories={categories} />
      <LinkContactModal open={modal === "linkContact"} onClose={() => setModal(null)} leadId={kind === "lead" ? id : undefined} onDone={loadAll} />
      <LinkCompanyModal open={modal === "linkCompany"} onClose={() => setModal(null)} leadId={kind === "lead" ? id : undefined} contactId={kind === "contact" ? id : undefined} onDone={loadAll} />

      {kind === "lead" && (
        <CompaniesEditDrawer
          open={companiesEditOpen}
          onClose={() => setCompaniesEditOpen(false)}
          leadId={id}
          companies={companies}
          onChanged={loadAll}
        />
      )}

      {kind === "lead" && fromPipeline && (
        <Sheet open={oppEditOpen} onOpenChange={setOppEditOpen}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Edit opportunity</SheetTitle>
            </SheetHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Pipeline stage</Label>
                <Select value={oppDraft.stage} onValueChange={(v) => setOppDraft((d) => ({ ...d, stage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{PIPELINE_STAGE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Property address</Label>
                <Input
                  value={oppDraft.property_address}
                  onChange={(e) => setOppDraft((d) => ({ ...d, property_address: e.target.value }))}
                  placeholder="123 Main St, City, State"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOppEditOpen(false)}>Cancel</Button>
                <Button
                  onClick={async () => {
                    if (!primaryOpp?.id) return;
                    const { error } = await supabase
                      .from("pipeline_opportunities")
                      .update({ stage: oppDraft.stage, property_address: oppDraft.property_address || null })
                      .eq("id", primaryOpp.id);
                    if (error) {
                      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
                    } else {
                      toast({ title: "Opportunity updated" });
                      setOppEditOpen(false);
                      loadAll();
                    }
                  }}
                >Save</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {kind === "lead" && (
        <Sheet open={intakeOpen} onOpenChange={setIntakeOpen}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Smart Intake — {record?.first_name} {record?.last_name}</SheetTitle>
            </SheetHeader>
            <SmartLeadForm
              leadId={id}
              initial={intakeFromLead(record, mortgage)}
              sources={sources}
              onSaved={(_lid, result) => {
                setIntakeOpen(false);
                // Optimistically populate Lead Health + Mortgage Snapshot immediately,
                // so the Catch-up tab updates without waiting for the refetch round-trip.
                if (result) {
                  setSentiment(result.sentimentRow);
                  setMortgage((m: any) => ({ ...(m ?? {}), ...result.mortgageRow }));
                  setRecord((r: any) => ({ ...(r ?? {}), ...result.leadPatch, lead_score: result.score }));
                }
                loadAll();
              }}
              onCancel={() => setIntakeOpen(false)}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
    {kind === "lead" ? (
      <>
        <AssistantPanel
          scope="crm"
          recordKind={kind}
          recordId={id}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
        />
        {!chatOpen && (
          <Button
            onClick={() => setChatOpen(true)}
            size="icon"
            className="fixed bottom-6 right-6 z-30 h-12 w-12 rounded-full shadow-lg"
            title="Open AI Assistant"
          >
            <SparklesIcon className="h-5 w-5" />
          </Button>
        )}
      </>
    ) : null}
    </>
  );
}

function MoveToPipelineCard({
  record,
  userId,
  onDone,
}: {
  record: any;
  userId: string | undefined;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const address = (record?.property_address ?? "").toString().trim();
  const status = normalizeStatus(record?.status);
  const canMove = !!address && status === "qualified";

  const disabledReason = !address
    ? "Add a property address in Smart Intake to enable."
    : status !== "qualified"
    ? "Lead must be Qualified before moving to Pipeline."
    : "";

  const handleMove = async () => {
    setBusy(true);
    const res = await moveLeadToPipeline(record, userId);
    setBusy(false);
    if (!res.ok) {
      toast({
        title:
          res.code === "duplicate"
            ? "Already in Pipeline"
            : res.code === "wrong_status"
            ? "Only qualified leads can be moved"
            : "Cannot move to pipeline",
        description: res.error,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Moved to Pipeline — Application Sent" });
    onDone();
  };

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ArrowRightCircle className="h-4 w-4 text-primary" />
        Move to Pipeline
      </div>
      <p className="text-xs text-muted-foreground truncate" title={address || undefined}>
        {address ? address : "No property address on file"}
      </p>
      <Button
        size="sm"
        className="w-full"
        disabled={!canMove || busy}
        onClick={handleMove}
        title={disabledReason || "Create a pipeline deal from this lead"}
      >
        {busy ? "Moving…" : "Move to Pipeline"}
      </Button>
      {!canMove && (
        <p className="text-[11px] text-muted-foreground">{disabledReason}</p>
      )}
    </div>
  );
}