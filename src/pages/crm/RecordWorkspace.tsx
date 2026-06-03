import { useEffect, useState, useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LeftRail } from "@/components/crm/LeftRail";
import { RightRail } from "@/components/crm/RightRail";
import { CatchUpTab } from "@/components/crm/tabs/CatchUpTab";
import { UnifiedTimelineTab } from "@/components/crm/tabs/UnifiedTimelineTab";
import { LoanScenariosTab } from "@/components/crm/tabs/LoanScenariosTab";
import { MessagesTab } from "@/components/crm/tabs/MessagesTab";
import { DocumentsTab } from "@/components/crm/tabs/DocumentsTab";
import { RelationshipsTab } from "@/components/crm/tabs/RelationshipsTab";
import { TasksTab } from "@/components/crm/tabs/TasksTab";
import { BarChart2, MessageSquare, FileCheck2, Users, CheckSquare } from "lucide-react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SmartLeadForm } from "@/components/crm/SmartLeadForm";
import { intakeFromLead } from "@/lib/crm/leadIntake";
import {
  NoteModal, TaskModal, CallModal, MeetingModal, EmailModal, UploadModal,
} from "@/components/crm/actions/ActionModals";
import { LinkContactModal, LinkCompanyModal } from "@/components/crm/actions/LinkContactCompanyModals";
import {
  fetchActivities, fetchAttachments, fetchCompanies, fetchContact, fetchDeals, fetchLeadContacts,
  fetchDocCategories, fetchEmailLogs, fetchLead, fetchMortgageProfile, fetchSentiment, fetchTags,
} from "@/lib/crm/queries";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { isTransitionAllowed, getAllowedNext, recordLeadTransition } from "@/lib/crm/stateMachine";
import { getStageSuggestions } from "@/lib/crm/stageTasks";

interface Props { kind: "lead" | "contact" }

export default function RecordWorkspace({ kind }: Props) {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [record, setRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [leadEvents, setLeadEvents] = useState<any[]>([]);
  const [dealEvents, setDealEvents] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [linkedContacts, setLinkedContacts] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [mortgage, setMortgage] = useState<any | null>(null);
  const [sentiment, setSentiment] = useState<any | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [modal, setModal] = useState<null | "note" | "email" | "call" | "task" | "meeting" | "upload" | "linkContact" | "linkCompany">(null);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [sources, setSources] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();

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
        safe(fetchCompanies(leadId, contactId), [] as any[]),
        safe(fetchDeals(contactId), [] as any[]),
        leadId ? safe(fetchLeadContacts(leadId), [] as any[]) : Promise.resolve([] as any[]),
        leadId ? safe(fetchTags(leadId), [] as any[]) : Promise.resolve([] as any[]),
        leadId ? safe(fetchMortgageProfile(leadId), null) : Promise.resolve(null),
        leadId ? safe(fetchSentiment(leadId), null) : Promise.resolve(null),
        safe(fetchDocCategories(), [] as any[]),
      ]);
      setActivities(acts); setEmailLogs(mails); setAttachments(atts);
      setCompanies(cos); setDeals(dls); setLinkedContacts(lcs); setTags(tgs);
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
    const prev = record?.status;
    // Strict state machine: validate transition before writing
    const ok = await isTransitionAllowed("lead", prev ?? "new", newStatus);
    if (!ok) {
      const next = getAllowedNext("lead", prev ?? "new");
      toast({
        title: "Invalid status change",
        description: next.length
          ? `Allowed next: ${next.join(", ")}`
          : "No further transitions allowed from this status.",
        variant: "destructive",
      });
      return;
    }
    setRecord((r: any) => ({ ...r, status: newStatus }));
    const { error } = await supabase.from("leads").update({ status: newStatus as any }).eq("id", id);
    if (error) {
      setRecord((r: any) => ({ ...r, status: prev }));
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    } else {
      await recordLeadTransition(id, prev ?? "new", newStatus);
      toast({ title: "Status updated", description: newStatus.replace(/_/g, " ") });
      const suggested = getStageSuggestions(newStatus);
      if (suggested.length > 0) {
        toast({
          title: `Suggested ${suggested.length} next action${suggested.length === 1 ? "" : "s"}`,
          description: "View in Tasks tab",
        });
      }
      // Sync any linked deals' stage so the Pipeline kanban reflects this change.
      const leadToDealStage: Record<string, string> = {
        new: "new_lead",
        contacted: "contacted",
        pre_qualified: "contacted",
        qualified: "contacted",
        application_started: "application_sent",
        underwriting: "underwriting",
        approved: "approved",
        converted: "closed",
        closed: "closed",
        lost: "lost",
        unqualified: "lost",
      };
      const mappedStage = leadToDealStage[newStatus];
      if (mappedStage) {
        try {
          const { data: lcs } = await supabase
            .from("lead_contacts")
            .select("contact_id")
            .eq("lead_id", id);
          let contactIds = Array.from(new Set((lcs ?? []).map((r: any) => r.contact_id).filter(Boolean)));

          // If the lead has no linked contact yet, create one from the lead data
          // so a deal can exist on the Pipeline kanban.
          if (contactIds.length === 0) {
            const lead: any = record ?? {};
            const { data: newContact, error: contactErr } = await supabase
              .from("contacts")
              .insert({
                first_name: lead.first_name ?? "Unknown",
                last_name: lead.last_name ?? "Lead",
                email: lead.email ?? null,
                phone: lead.phone ?? null,
                lead_id: id,
                created_by: user?.id,
              })
              .select("id")
              .single();
            if (!contactErr && newContact?.id) {
              await supabase.from("lead_contacts").insert({
                lead_id: id,
                contact_id: newContact.id,
                role: "borrower",
                created_by: user?.id,
              });
              contactIds = [newContact.id];
            }
          }

          if (contactIds.length > 0) {
            // Update existing deals for these contacts
            const { data: existingDeals } = await supabase
              .from("deals")
              .select("id, contact_id")
              .in("contact_id", contactIds);
            const dealContactIds = new Set((existingDeals ?? []).map((d: any) => d.contact_id));
            if ((existingDeals ?? []).length > 0) {
              await supabase
                .from("deals")
                .update({ stage: mappedStage as any })
                .in("contact_id", contactIds);
            }
            // Create deals for contacts that don't have one yet
            const missing = contactIds.filter((cid) => !dealContactIds.has(cid));
            if (missing.length > 0) {
              const lead: any = record ?? {};
              await supabase.from("deals").insert(
                missing.map((cid) => ({
                  contact_id: cid,
                  stage: mappedStage as any,
                  loan_type: lead.loan_purpose ?? null,
                  loan_amount: lead.loan_amount ?? null,
                  property_address: lead.property_address ?? null,
                  created_by: user?.id,
                  loan_officer_id: user?.id,
                }))
              );
            }
          }
        } catch (e) {
          console.error("Failed to sync deal stage from lead status", e);
        }
      }
      loadAll();
    }
  };

  if (!id) return <Navigate to="/leads" replace />;
  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64" /></div>;
  if (!record) return <div className="p-10 text-center text-muted-foreground">Record not found.</div>;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-12 lg:col-span-3">
          <LeftRail
            record={record}
            kind={kind}
            tags={tags}
            onAction={(k) => setModal(k)}
            onStatusChange={kind === "lead" ? handleStatusChange : undefined}
          />
        </aside>

        <main className="col-span-12 lg:col-span-6">
          {kind === "lead" && (
            <div className="flex justify-end mb-2">
              <Button size="sm" variant="outline" onClick={() => setIntakeOpen(true)}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Edit Intake
              </Button>
            </div>
          )}
          <Tabs defaultValue="catch-up">
            <TabsList className={`w-full grid ${kind === "lead" ? "grid-cols-7" : "grid-cols-6"}`}>
              <TabsTrigger value="catch-up">Catch-up</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              {kind === "lead" && (
                <TabsTrigger value="scenarios" className="flex items-center gap-1.5">
                  <BarChart2 className="h-3.5 w-3.5" /> Loan Scenarios
                </TabsTrigger>
              )}
              <TabsTrigger value="messages" className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Messages
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5" /> Tasks
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-1.5">
                <FileCheck2 className="h-3.5 w-3.5" /> Documents
              </TabsTrigger>
              <TabsTrigger value="relationships" className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Relationships
              </TabsTrigger>
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
            {kind === "lead" && (
              <TabsContent value="scenarios" className="mt-4">
                <LoanScenariosTab leadId={id} lead={record} onActivity={loadAll} />
              </TabsContent>
            )}
            <TabsContent value="messages" className="mt-4">
              <MessagesTab deals={deals} />
            </TabsContent>
            <TabsContent value="tasks" className="mt-4">
              <TasksTab
                leadId={kind === "lead" ? id : (record as any)?.lead_id ?? undefined}
                dealId={deals?.[0]?.id}
                stage={kind === "lead" ? record?.status : deals?.[0]?.stage}
              />
            </TabsContent>
            <TabsContent value="documents" className="mt-4">
              <DocumentsTab deals={deals} />
            </TabsContent>
            <TabsContent value="relationships" className="mt-4">
              <RelationshipsTab
                kind={kind}
                recordId={id}
                linkedContacts={linkedContacts}
                companies={companies}
                onChanged={loadAll}
              />
            </TabsContent>
          </Tabs>
        </main>

        <aside className="col-span-12 lg:col-span-3">
          <RightRail
            companies={companies}
            deals={deals}
            contacts={linkedContacts}
            attachments={attachments}
            onUpload={() => setModal("upload")}
            onAddCompany={() => setModal("linkCompany")}
            onAddContact={kind === "lead" ? () => setModal("linkContact") : undefined}
            onSignedUrl={onSignedUrl}
          />
        </aside>
      </div>

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
  );
}