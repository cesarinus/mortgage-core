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
import { Plus, Mail, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import type { Tables, Enums } from "@/integrations/supabase/types";
import { Constants } from "@/integrations/supabase/types";

type Deal = Tables<"deals">;
type Contact = Tables<"contacts">;

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
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const load = async () => {
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from("deals").select("*").order("created_at", { ascending: false }),
      supabase.from("contacts").select("*").order("first_name"),
    ]);
    setDeals(d ?? []);
    setContacts(c ?? []);
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
    const c = contacts.find((x) => x.id === deal.contact_id);
    if (!c?.email) {
      toast({ title: "No contact email", description: "Link a contact with an email to this deal first.", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.functions.invoke("send-review-request", {
      body: { email: c.email, first_name: c.first_name, last_name: c.last_name, lead_id: deal.contact_id },
    });
    if (error || (data as any)?.error) {
      toast({ title: "Send failed", description: error?.message || (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: "Review request sent", description: c.email });
    }
  };

  const stages = Constants.public.Enums.deal_stage;

  const getContactName = (contactId: string | null) => {
    if (!contactId) return "No contact";
    const c = contacts.find((c) => c.id === contactId);
    return c ? `${c.first_name} ${c.last_name}` : "Unknown";
  };

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
                {stageDeals.map((deal) => (
                  <Card
                    key={deal.id}
                    className={`border-l-4 ${stageColors[deal.stage]} cursor-pointer hover:shadow-md transition-shadow`}
                  >
                     <CardContent className="p-3 space-y-2">
                       <div className="flex items-center justify-between gap-2">
                         <p className="font-medium text-sm">{getContactName(deal.contact_id)}</p>
                         {deal.contact_id && (
                           <Link
                             to={`/crm/contacts/${deal.contact_id}`}
                             title="Open workspace"
                             onClick={(e) => e.stopPropagation()}
                             className="text-muted-foreground hover:text-primary"
                           >
                             <ExternalLink className="h-3.5 w-3.5" />
                           </Link>
                         )}
                       </div>
                      {deal.loan_amount && (
                        <p className="text-xs text-muted-foreground">
                          ${deal.loan_amount.toLocaleString()} · {deal.loan_type ?? "—"}
                        </p>
                      )}
                      <div className="flex gap-1 flex-wrap">
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
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
