import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Plus, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import {
  ALL_ROLES, addPersonRole, convertToLead, getLinkedContacts, getLinkedLeads,
  getPerson, getPersonAuditLog, getPersonRoles, removePersonRole, updatePerson,
  type Person, type PersonRoleType,
} from "@/lib/people/api";

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [person, setPerson] = useState<Person | null>(null);
  const [roles, setRoles] = useState<PersonRoleType[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [edit, setEdit] = useState<Partial<Person>>({});
  const [addRole, setAddRole] = useState<PersonRoleType | "">("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!id) return;
    const [p, r, ld, ct, al] = await Promise.all([
      getPerson(id), getPersonRoles(id), getLinkedLeads(id),
      getLinkedContacts(id), getPersonAuditLog(id),
    ]);
    setPerson(p);
    setRoles(r.map((x) => x.role_type));
    setLeads(ld); setContacts(ct); setAudit(al);
    setEdit(p ?? {});
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [id]);

  if (!person) return <div className="p-6 text-muted-foreground">Loading…</div>;

  async function save() {
    setBusy(true);
    try {
      const updated = await updatePerson(person!.id, edit);
      setPerson(updated);
      toast.success("Saved");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function handleConvert() {
    setBusy(true);
    try {
      const { lead_id, was_existing } = await convertToLead(person!.id);
      toast[was_existing ? "info" : "success"](
        was_existing ? "This person is already a lead." : "Lead created."
      );
      nav(`/crm/leads/${lead_id}`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function handleAddRole() {
    if (!addRole) return;
    try { await addPersonRole(person!.id, addRole as PersonRoleType); await refresh(); setAddRole(""); }
    catch (e: any) { toast.error(e.message); }
  }

  async function handleRemoveRole(r: PersonRoleType) {
    try { await removePersonRole(person!.id, r); await refresh(); }
    catch (e: any) { toast.error(e.message); }
  }

  const hasLeadRole = roles.includes("Lead");

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/people"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <h1 className="text-2xl font-bold">{person.full_name || "Unnamed"}</h1>
        <div className="flex flex-wrap gap-1">
          {roles.map((r) => (
            <Badge key={r} variant="secondary" className="group">
              {r}
              <button
                className="ml-1 opacity-60 hover:opacity-100"
                onClick={() => handleRemoveRole(r)}
                title="Remove role"
              ><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
        <div className="ml-auto">
          <Button onClick={handleConvert} disabled={busy}>
            <UserCheck className="h-4 w-4 mr-1" />
            {hasLeadRole ? "Open Lead" : "Convert to Lead"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4 lg:col-span-2 space-y-3">
          <h3 className="font-semibold">Person</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First name</Label><Input value={edit.first_name ?? ""} onChange={(e) => setEdit({ ...edit, first_name: e.target.value })} /></div>
            <div><Label>Last name</Label><Input value={edit.last_name ?? ""} onChange={(e) => setEdit({ ...edit, last_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={edit.email ?? ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={edit.phone ?? ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
            <div><Label>Alternate phone</Label><Input value={edit.alternate_phone ?? ""} onChange={(e) => setEdit({ ...edit, alternate_phone: e.target.value })} /></div>
            <div><Label>Company</Label><Input value={edit.company ?? ""} onChange={(e) => setEdit({ ...edit, company: e.target.value })} /></div>
            <div className="col-span-2"><Label>Address</Label><Input value={edit.address ?? ""} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></div>
            <div><Label>City</Label><Input value={edit.city ?? ""} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /></div>
            <div><Label>State</Label><Input value={edit.state ?? ""} onChange={(e) => setEdit({ ...edit, state: e.target.value })} /></div>
            <div><Label>Zip</Label><Input value={edit.zip ?? ""} onChange={(e) => setEdit({ ...edit, zip: e.target.value })} /></div>
            <div><Label>Date of birth</Label><Input type="date" value={edit.date_of_birth ?? ""} onChange={(e) => setEdit({ ...edit, date_of_birth: e.target.value })} /></div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={save} disabled={busy}>Save</Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4 space-y-2">
            <h3 className="font-semibold">Roles</h3>
            <div className="flex gap-2">
              <Select value={addRole} onValueChange={(v) => setAddRole(v as PersonRoleType)}>
                <SelectTrigger><SelectValue placeholder="Add role" /></SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.filter((r) => !roles.includes(r)).map((r) =>
                    <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAddRole} disabled={!addRole}><Plus className="h-4 w-4" /></Button>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-2">Linked Leads ({leads.length})</h3>
            <div className="space-y-1">
              {leads.map((l) => (
                <Link key={l.id} to={`/crm/leads/${l.id}`} className="flex items-center justify-between text-sm py-1 hover:bg-muted px-2 rounded">
                  <span><Badge variant="outline" className="mr-2">{l.status}</Badge>{l.source ?? "manual"}</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ))}
              {leads.length === 0 && <div className="text-sm text-muted-foreground">None</div>}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-2">Linked Contacts ({contacts.length})</h3>
            <div className="space-y-1">
              {contacts.map((c) => (
                <Link key={c.id} to={`/crm/contacts/${c.id}`} className="flex items-center justify-between text-sm py-1 hover:bg-muted px-2 rounded">
                  <span><Badge variant="outline" className="mr-2">{c.contact_type}</Badge>{c.role ?? ""}</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ))}
              {contacts.length === 0 && <div className="text-sm text-muted-foreground">None</div>}
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Activity</h3>
        <Separator className="mb-3" />
        <div className="space-y-2 text-sm">
          {audit.map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <span className="text-muted-foreground w-40 shrink-0">{new Date(a.created_at).toLocaleString()}</span>
              <span className="font-medium">{a.action}</span>
              <span className="text-muted-foreground">{JSON.stringify(a.details)}</span>
            </div>
          ))}
          {audit.length === 0 && <div className="text-muted-foreground">No activity yet.</div>}
        </div>
      </Card>
    </div>
  );
}