import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Unlink, Pencil, UserPlus, Building2, Plus, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LinkContactModal, LinkCompanyModal, ROLE_ON_DEAL_OPTIONS } from "@/components/crm/actions/LinkContactCompanyModals";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const ROLE_BADGE: Record<string, string> = {
  lead: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  borrower: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  co_borrower: "bg-teal-500/10 text-teal-700 border-teal-500/20",
  primary_borrower: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  real_estate_agent: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  title_agent: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  insurance_agent: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  referral_partner: "bg-pink-500/10 text-pink-700 border-pink-500/20",
  internal_staff: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  other: "bg-muted text-muted-foreground border-border",
};

const COMPANY_TYPE_BADGE: Record<string, string> = {
  lender: "bg-primary/10 text-primary border-primary/20",
  title_company: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  insurance_agency: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  real_estate_brokerage: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  other: "bg-muted text-muted-foreground border-border",
};

const fmtLabel = (v?: string | null) => (v ? v.replace(/_/g, " ") : "");

interface Props {
  kind: "lead" | "contact";
  recordId: string;
  linkedContacts: any[]; // from fetchLeadContacts (lead view)
  companies: any[]; // from fetchCompanies (lead or contact view)
  onChanged: () => void;
}

export function RelationshipsTab({ kind, recordId, linkedContacts, companies, onChanged }: Props) {
  const { toast } = useToast();
  const [linkContact, setLinkContact] = useState(false);
  const [linkCompany, setLinkCompany] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<string>("other");

  // Contact view: load leads linked via lead_contacts where contact_id = recordId
  const [contactLeads, setContactLeads] = useState<any[]>([]);
  useEffect(() => {
    if (kind !== "contact") return;
    (async () => {
      const { data } = await supabase
        .from("lead_contacts")
        .select("id, role, lead_id, created_at")
        .eq("contact_id", recordId)
        .order("created_at", { ascending: false });
      const rows = data ?? [];
      const leadIds = Array.from(new Set(rows.map((r: any) => r.lead_id).filter(Boolean)));
      if (!leadIds.length) { setContactLeads([]); return; }
      const { data: leads } = await supabase
        .from("leads")
        .select("id, first_name, last_name, email, status")
        .in("id", leadIds);
      const byId = new Map((leads ?? []).map((l: any) => [l.id, l]));
      setContactLeads(rows.map((r: any) => ({ ...r, lead: byId.get(r.lead_id) ?? null })));
    })();
  }, [kind, recordId]);

  const unlinkContact = async (linkId: string) => {
    const { error } = await supabase.from("lead_contacts").delete().eq("id", linkId);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Contact unlinked" });
    onChanged();
  };

  const saveRole = async (linkId: string) => {
    const { error } = await supabase.from("lead_contacts")
      .update({ role_on_deal: (roleDraft || null) as any })
      .eq("id", linkId);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setEditingRole(null);
    toast({ title: "Role updated" });
    onChanged();
  };

  const setPrimary = async (linkId: string, leadId: string, contactId: string) => {
    // Demote others first to respect unique-primary index
    await supabase.from("lead_contacts").update({ is_primary: false })
      .eq("lead_id", leadId).neq("id", linkId);
    const { error } = await supabase.from("lead_contacts")
      .update({ is_primary: true }).eq("id", linkId);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    // Mirror to leads.co_borrower_id? No — primary stays in lead_contacts. But promote contact_id as primary_borrower role.
    await supabase.from("lead_contacts").update({ role_on_deal: "primary_borrower" as any }).eq("id", linkId);
    toast({ title: "Marked as primary" });
    onChanged();
  };

  const unlinkCompany = async (linkId: string) => {
    const { error } = await supabase.from("crm_contact_companies").delete().eq("id", linkId);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Company unlinked" });
    onChanged();
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="people">
        <TabsList>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="mt-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">
            {kind === "lead" ? "People linked to this lead" : "Leads linked to this contact"}
          </CardTitle>
          {kind === "lead" && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setLinkContact(true)}>
                <UserPlus className="h-4 w-4 mr-1" /> Add person
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {kind === "lead" && (linkedContacts.length === 0
            ? <p className="text-sm text-muted-foreground">No contacts linked yet.</p>
            : linkedContacts.map((row: any) => (
              <div key={row.id} className="flex items-center justify-between gap-3 rounded border p-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">
                    {row.is_primary && (
                      <Star className="inline-block h-3.5 w-3.5 mr-1 text-amber-500 fill-amber-500" />
                    )}
                    {row.contact?.first_name} {row.contact?.last_name}
                    {row.role_on_deal && (
                      <Badge className={`ml-2 text-[10px] capitalize ${ROLE_BADGE[row.role_on_deal] ?? "bg-muted text-muted-foreground"}`}>
                        {fmtLabel(row.role_on_deal)}
                      </Badge>
                    )}
                    {!row.role_on_deal && row.contact?.contact_type && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">{row.contact.contact_type}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {row.contact?.job_title ? `${row.contact.job_title} · ` : ""}{row.contact?.email ?? "—"}
                  </div>
                  <div className="text-xs mt-1">
                    {editingRole === row.id ? (
                      <div className="flex items-center gap-1">
                        <Select value={roleDraft} onValueChange={setRoleDraft}>
                          <SelectTrigger className="h-7 text-xs w-48"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ROLE_ON_DEAL_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="h-7" onClick={() => saveRole(row.id)}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingRole(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Role: {fmtLabel(row.role_on_deal) || row.role || "—"}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {row.contact_id && (
                    <Button asChild size="icon" variant="ghost" title="Open contact">
                      <Link to={`/crm/contacts/${row.contact_id}`}><ExternalLink className="h-4 w-4" /></Link>
                    </Button>
                  )}
                  {!row.is_primary && row.contact_id && (
                    <Button size="icon" variant="ghost" title="Make primary"
                      onClick={() => setPrimary(row.id, recordId, row.contact_id)}>
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" title="Change role"
                    onClick={() => { setEditingRole(row.id); setRoleDraft(row.role_on_deal ?? "other"); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Unlink" onClick={() => unlinkContact(row.id)}>
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
          {kind === "contact" && (contactLeads.length === 0
            ? <p className="text-sm text-muted-foreground">No leads linked yet.</p>
            : contactLeads.map((row: any) => (
              <div key={row.id} className="flex items-center justify-between gap-3 rounded border p-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">
                    {row.lead?.first_name} {row.lead?.last_name}
                    {row.lead?.status && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">{row.lead.status}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{row.lead?.email ?? "—"}</div>
                  <div className="text-xs text-muted-foreground mt-1">Role: {row.role || "—"}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {row.lead_id && (
                    <Button asChild size="icon" variant="ghost" title="Open lead">
                      <Link to={`/crm/leads/${row.lead_id}`}><ExternalLink className="h-4 w-4" /></Link>
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" title="Unlink" onClick={() => unlinkContact(row.id)}>
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="companies" className="mt-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Companies linked</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setLinkCompany(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add company
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No companies linked yet.</p>
          ) : (
            companies.map((row: any) => (
              <div key={row.id} className="flex items-center justify-between gap-3 rounded border p-3">
                <div className="min-w-0 flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{row.company?.name ?? "—"}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {row.company?.company_type && (
                        <Badge className={`text-[10px] capitalize ${COMPANY_TYPE_BADGE[row.company.company_type] ?? "bg-muted text-muted-foreground"}`}>
                          {fmtLabel(row.company.company_type)}
                        </Badge>
                      )}
                      <div className="text-xs text-muted-foreground truncate">
                        {row.company?.industry ?? row.company?.domain ?? "—"}
                        {row.company?.is_self_employed && <span className="ml-2">· Self-employed</span>}
                        {row.role && <span className="ml-2">· {row.role}</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {row.company_id && row.company?.website && (
                    <Button asChild size="icon" variant="ghost" title="Open website">
                      <a href={row.company.website.startsWith("http") ? row.company.website : `https://${row.company.website}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" title="Unlink" onClick={() => unlinkCompany(row.id)}>
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      <LinkContactModal
        open={linkContact}
        onClose={() => setLinkContact(false)}
        leadId={kind === "lead" ? recordId : undefined}
        onDone={onChanged}
      />
      <LinkCompanyModal
        open={linkCompany}
        onClose={() => setLinkCompany(false)}
        leadId={kind === "lead" ? recordId : undefined}
        contactId={kind === "contact" ? recordId : undefined}
        onDone={onChanged}
      />
    </div>
  );
}