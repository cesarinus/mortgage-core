import { useEffect, useState, useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { LeftRail } from "@/components/crm/LeftRail";
import { RightRail } from "@/components/crm/RightRail";
import { CatchUpTab } from "@/components/crm/tabs/CatchUpTab";
import { ActivitiesTab } from "@/components/crm/tabs/ActivitiesTab";
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

interface Props { kind: "lead" | "contact" }

export default function RecordWorkspace({ kind }: Props) {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
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
      const leadId = kind === "lead" ? id : (rec as any).lead_id ?? undefined;
      const contactId = kind === "contact" ? id : undefined;
      const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);
      const [acts, mails, atts, cos, dls, lcs, tgs, mp, st, cats] = await Promise.all([
        safe(fetchActivities({ leadId, contactId }), [] as any[]),
        leadId ? safe(fetchEmailLogs(leadId), [] as any[]) : Promise.resolve([] as any[]),
        leadId ? safe(fetchAttachments(leadId), [] as any[]) : Promise.resolve([] as any[]),
        safe(fetchCompanies(leadId, contactId), [] as any[]),
        safe(fetchDeals(contactId ?? (rec as any).contact_id), [] as any[]),
        leadId ? safe(fetchLeadContacts(leadId), [] as any[]) : Promise.resolve([] as any[]),
        leadId ? safe(fetchTags(leadId), [] as any[]) : Promise.resolve([] as any[]),
        leadId ? safe(fetchMortgageProfile(leadId), null) : Promise.resolve(null),
        leadId ? safe(fetchSentiment(leadId), null) : Promise.resolve(null),
        safe(fetchDocCategories(), [] as any[]),
      ]);
      setActivities(acts); setEmailLogs(mails); setAttachments(atts);
      setCompanies(cos); setDeals(dls); setLinkedContacts(lcs); setTags(tgs);
      setMortgage(mp); setSentiment(st); setCategories(cats);
    } catch (e: any) {
      toast({ title: "Failed to load workspace", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, kind]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const onSignedUrl = async (path: string) => {
    const { data, error } = await supabase.storage.from("crm-documents").createSignedUrl(path, 60);
    if (error) { toast({ title: "Could not generate link", description: error.message, variant: "destructive" }); return null; }
    return data?.signedUrl ?? null;
  };

  const refreshSentiment = async () => {
    if (!id || kind !== "lead") return;
    // Deterministic local fallback while AI integration is wired downstream
    const temp = (record?.lead_score ?? 0) >= 60 ? "hot" : (record?.lead_score ?? 0) >= 30 ? "warm" : "cold";
    const summary = `Borrower ${record?.first_name ?? ""} is currently ${temp}. Loan purpose: ${record?.loan_purpose ?? "n/a"}. Score ${record?.lead_score ?? 0}.`;
    const payload = {
      lead_id: id, temperature: temp, summary,
      recommendations: ["Confirm preferred contact time", "Send rate snapshot"],
      challenges: [], positives: [], generated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("lead_sentiment").upsert(payload, { onConflict: "lead_id" });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setSentiment(payload); toast({ title: "Summary refreshed" }); }
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
          />
        </aside>

        <main className="col-span-12 lg:col-span-6">
          <Tabs defaultValue="catch-up">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="catch-up">Catch-up</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
            </TabsList>
            <TabsContent value="catch-up" className="mt-4">
              <CatchUpTab
                activities={activities}
                emailLogs={emailLogs}
                sentiment={sentiment}
                mortgage={mortgage}
                record={record}
                onRefreshSentiment={kind === "lead" ? refreshSentiment : undefined}
              />
            </TabsContent>
            <TabsContent value="activities" className="mt-4">
              <ActivitiesTab activities={activities} />
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
    </div>
  );
}