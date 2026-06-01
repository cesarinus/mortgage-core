import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, ExternalLink, MapPin, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import type { Tables, Enums } from "@/integrations/supabase/types";
import { Constants } from "@/integrations/supabase/types";
import { EmailModal } from "@/components/crm/actions/ActionModals";

type Deal = Tables<"deals">;
type Contact = Tables<"contacts">;
type LeadContact = Tables<"lead_contacts">;
type Lead = Tables<"leads">;

type BorrowerSummary = {
  name: string;
  email: string | null;
  contactId: string | null;
  leadId: string | null;
};

const stageLabels: Record<Enums<"deal_stage">, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  application_sent: "Application Sent",
  docs_received: "Docs Received",
  underwriting: "Underwriting",
  approved: "Approved",
  clear_to_close: "Clear to Close",
  closed: "Closed",
  lost: "Lost",
};

const stageColors: Record<string, string> = {
  new_lead: "border-l-primary",
  contacted: "border-l-accent",
  application_sent: "border-l-warning",
  docs_received: "border-l-warning",
  underwriting: "border-l-primary",
  approved: "border-l-success",
  clear_to_close: "border-l-success",
  closed: "border-l-success",
  lost: "border-l-destructive",
};

export default function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leadContacts, setLeadContacts] = useState<LeadContact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [open, setOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState<{ leadId?: string; contactId?: string; email: string } | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const load = async () => {
    const [{ data: d }, { data: c }, { data: lc }, { data: l }] = await Promise.all([
      supabase.from("deals").select("*").order("created_at", { ascending: false }),
      supabase.from("contacts").select("*").order("first_name"),
      supabase.from("lead_contacts").select("*"),
      supabase.from("leads").select("*"),
    ]);
    setDeals(d ?? []);
    setContacts(c ?? []);
    setLeadContacts(lc ?? []);
    setLeads(l ?? []);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("deals").insert({
      contact_id: (fd.get("contact_id") as string) || null,
      loan_amount: fd.get("loan_amount") ? Number(fd.get("loan_amount")) : null,
      loan_type: (fd.get("loan_type") as string) || null,
      property_address: (fd.get("property_address") as string) || null,
      notes: (fd.get("notes") as string) || null,
      loan_officer_id: user!.id,
      created_by: user!.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deal created" });
      setOpen(false);
      load();
    }
  };

  const moveDeal = async (dealId: string, newStage: Enums<"deal_stage">) => {
    const { error } = await supabase.from("deals").update({ stage: newStage }).eq("id", dealId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      load();
    }
  };

  const sendReviewRequest = async (deal: Deal) => {
    const borrower = resolveBorrower(deal);
    if (!borrower.email) {
      toast({ title: "No contact email", description: "Link a contact with an email to this deal first.", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.functions.invoke("send-review-request", {
      body: { email: borrower.email, first_name: borrower.name.split(" ")[0] ?? "", last_name: borrower.name.split(" ").slice(1).join(" "), lead_id: borrower.leadId ?? deal.contact_id },
    });
    if (error || (data as any)?.error) {
      toast({ title: "Send failed", description: error?.message || (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: "Review request sent", description: borrower.email });
    }
  };

  const hiddenStages: Enums<"deal_stage">[] = ["new_lead", "contacted"];
  const stages = Constants.public.Enums.deal_stage.filter(
    (s) => !hiddenStages.includes(s)
  );

  const leadStatusMatchesDealStage = (lead: Lead, stage: Enums<"deal_stage">) => {
    if (stage === "application_sent") return lead.status === "qualified";
    return lead.status === stage;
  };

  // Resolve the actual borrower for a deal. A deal.contact_id can point to a
  // referral partner, so prefer the matching lead/borrower over the linked contact.
  const resolveBorrower = (deal: Deal): BorrowerSummary => {
    const linked = deal.contact_id ? contacts.find((c) => c.id === deal.contact_id) ?? null : null;
    if (linked && linked.contact_type === "borrower") {
      const lcRow = leadContacts.find((r) => r.contact_id === linked.id);
      return {
        name: `${linked.first_name} ${linked.last_name}`.trim(),
        email: linked.email,
        contactId: linked.id,
        leadId: lcRow?.lead_id ?? linked.lead_id ?? null,
      };
    }

    const candidateLeadLinks = linked ? leadContacts.filter((r) => r.contact_id === linked.id) : [];
    const lcRow =
      candidateLeadLinks.find((r) => {
        const lead = leads.find((l) => l.id === r.lead_id);
        return lead ? leadStatusMatchesDealStage(lead, deal.stage) : false;
      }) ?? candidateLeadLinks[0];

    if (lcRow?.lead_id) {
      const borrowerLink = leadContacts.find(
        (r) => r.lead_id === lcRow.lead_id && ["borrower", "primary_borrower", "applicant", "primary"].includes((r.role ?? "").toLowerCase())
      );
      const borrowerContact = borrowerLink
        ? contacts.find((c) => c.id === borrowerLink.contact_id) ?? null
        : contacts.find((c) => {
            const link = leadContacts.find((r) => r.contact_id === c.id && r.lead_id === lcRow.lead_id);
            return !!link && c.contact_type === "borrower";
          }) ?? null;
      if (borrowerContact) {
        return {
          name: `${borrowerContact.first_name} ${borrowerContact.last_name}`.trim(),
          email: borrowerContact.email,
          contactId: borrowerContact.id,
          leadId: lcRow.lead_id,
        };
      }

      const lead = leads.find((l) => l.id === lcRow.lead_id);
      if (lead) {
        return {
          name: `${lead.first_name} ${lead.last_name}`.trim(),
          email: lead.email,
          contactId: null,
          leadId: lead.id,
        };
      }
    }
    return {
      name: linked ? `${linked.first_name} ${linked.last_name}`.trim() : "No borrower",
      email: linked?.email ?? null,
      contactId: linked?.id ?? null,
      leadId: linked?.lead_id ?? null,
    };
  };

  const formatCurrency = (n: number | null | undefined) =>
    n == null ? null : `$${Number(n).toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground">Track deals through your pipeline stages</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Deal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Deal</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <Label>Contact</Label>
                <Select name="contact_id">
                  <SelectTrigger><SelectValue placeholder="Link a contact" /></SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="loan_amount">Loan Amount</Label>
                  <Input id="loan_amount" name="loan_amount" type="number" placeholder="350000" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="loan_type">Loan Type</Label>
                  <Input id="loan_type" name="loan_type" placeholder="Conventional" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="property_address">Property Address</Label>
                <Input id="property_address" name="property_address" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={3} />
              </div>
              <Button type="submit" className="w-full">Create Deal</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage);
          return (
            <div key={stage} className="flex-shrink-0 w-72">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{stageLabels[stage]}</h3>
                <Badge variant="secondary" className="text-xs">{stageDeals.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[200px] rounded-lg bg-muted/50 p-2">
                {stageDeals.map((deal) => {
                  const borrower = resolveBorrower(deal);
                  const workspaceId = borrower.contactId;
                  return (
                  <Card
                    key={deal.id}
                    className={`border-l-4 ${stageColors[deal.stage]} hover:shadow-md transition-shadow`}
                  >
                     <CardContent className="p-3 space-y-2">
                       <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{borrower.name}</p>
                         {workspaceId && (
                           <Link
                             to={`/crm/contacts/${workspaceId}`}
                             title="Open workspace"
                             onClick={(e) => e.stopPropagation()}
                             className="text-muted-foreground hover:text-primary shrink-0"
                           >
                             <ExternalLink className="h-3.5 w-3.5" />
                           </Link>
                         )}
                       </div>
                       {deal.property_address && (
                         <p className="text-xs text-muted-foreground flex items-start gap-1">
                           <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                           <span className="truncate">{deal.property_address}</span>
                         </p>
                       )}
                       {(deal.loan_amount || deal.loan_type) && (
                         <p className="text-xs text-muted-foreground flex items-center gap-1">
                           <DollarSign className="h-3 w-3 shrink-0" />
                           <span>
                             {formatCurrency(deal.loan_amount) ?? "—"}
                             {deal.loan_type ? ` · ${deal.loan_type}` : ""}
                           </span>
                         </p>
                       )}
                        {borrower.email && (
                         <button
                           type="button"
                           onClick={(e) => {
                             e.stopPropagation();
                             setEmailTarget({
                                leadId: borrower.leadId ?? undefined,
                                contactId: borrower.contactId ?? undefined,
                                email: borrower.email,
                             });
                           }}
                           className="text-xs text-primary hover:underline flex items-center gap-1 truncate w-full text-left"
                            title={`Email ${borrower.email}`}
                         >
                           <Mail className="h-3 w-3 shrink-0" />
                           <span className="truncate">{borrower.email}</span>
                         </button>
                       )}
                       <div className="flex gap-1 flex-wrap pt-1 border-t border-border/50">
                        {stages.filter(s => s !== deal.stage).slice(0, 3).map(s => (
                          <button
                            key={s}
                            onClick={(e) => { e.stopPropagation(); moveDeal(deal.id, s); }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            → {stageLabels[s]}
                          </button>
                        ))}
                      </div>
                      {deal.stage === "closed" && (
                        <Button size="sm" variant="outline" className="w-full h-7 text-xs"
                          onClick={(e) => { e.stopPropagation(); sendReviewRequest(deal); }}>
                          <Mail className="mr-1 h-3 w-3" />Send Review Request
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {emailTarget && (
        <EmailModal
          open={!!emailTarget}
          onClose={() => setEmailTarget(null)}
          leadId={emailTarget.leadId}
          contactId={emailTarget.contactId}
          recipientEmail={emailTarget.email}
          onDone={() => setEmailTarget(null)}
        />
      )}
    </div>
  );
}
