import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Unlink, Pencil, UserPlus, Building2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LinkContactModal, LinkCompanyModal } from "@/components/crm/actions/LinkContactCompanyModals";

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
  const [roleDraft, setRoleDraft] = useState("");

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
    const { error } = await supabase.from("lead_contacts").update({ role: roleDraft || null }).eq("id", linkId);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setEditingRole(null);
    toast({ title: "Role updated" });
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
      {/* People */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">
            {kind === "lead" ? "People linked to this lead" : "Leads linked to this contact"}
          </CardTitle>
          {kind === "lead" && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setLinkContact(true)}>
                <UserPlus className="h-4 w-4 mr-1" /> Link / Create contact
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
                    {row.contact?.first_name} {row.contact?.last_name}
                    {row.contact?.contact_type && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">{row.contact.contact_type}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{row.contact?.email ?? "—"}</div>
                  <div className="text-xs mt-1">
                    {editingRole === row.id ? (
                      <div className="flex items-center gap-1">
                        <Input value={roleDraft} onChange={e => setRoleDraft(e.target.value)} className="h-7 text-xs w-40" placeholder="Role" />
                        <Button size="sm" className="h-7" onClick={() => saveRole(row.id)}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingRole(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Role: {row.role || "—"}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {row.contact_id && (
                    <Button asChild size="icon" variant="ghost" title="Open contact">
                      <Link to={`/crm/contacts/${row.contact_id}`}><ExternalLink className="h-4 w-4" /></Link>
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" title="Change role"
                    onClick={() => { setEditingRole(row.id); setRoleDraft(row.role ?? ""); }}>
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

      {/* Companies */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Companies linked</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setLinkCompany(true)}>
            <Plus className="h-4 w-4 mr-1" /> Link / Create company
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
                    <div className="text-xs text-muted-foreground truncate">
                      {row.company?.industry ?? "—"}
                      {row.company?.is_self_employed && <span className="ml-2">· Self-employed</span>}
                      {row.role && <span className="ml-2">· {row.role}</span>}
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