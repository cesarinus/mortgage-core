import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import {
  ALL_ROLES, createPerson, findMatches, listPeople, type Person, type PersonRoleType,
} from "@/lib/people/api";
import DuplicateMatchModal from "@/components/people/DuplicateMatchModal";
import { supabase } from "@/integrations/supabase/client";

type RoleBadge = { person_id: string; role_type: PersonRoleType };

export default function PeopleList() {
  const nav = useNavigate();
  const [people, setPeople] = useState<Person[]>([]);
  const [roles, setRoles] = useState<Record<string, PersonRoleType[]>>({});
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<PersonRoleType | "all">("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // create form
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", company: "", city: "", state: "", zip: "",
  });
  const [selectedRoles, setSelectedRoles] = useState<PersonRoleType[]>(["Contact"]);
  const [dupOpen, setDupOpen] = useState(false);

  async function load() {
    const list = await listPeople({
      search: search || undefined,
      role: roleFilter === "all" ? undefined : roleFilter,
    });
    setPeople(list);
    if (list.length) {
      const { data } = await supabase
        .from("person_roles").select("person_id, role_type")
        .in("person_id", list.map((p) => p.id));
      const map: Record<string, PersonRoleType[]> = {};
      for (const r of (data ?? []) as RoleBadge[]) {
        (map[r.person_id] ||= []).push(r.role_type);
      }
      setRoles(map);
    } else setRoles({});
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search, roleFilter]);

  function toggleRole(r: PersonRoleType) {
    setSelectedRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  }

  async function handleCheckDuplicatesAndCreate() {
    const matches = await findMatches({
      email: form.email || undefined, phone: form.phone || undefined,
      name: `${form.first_name} ${form.last_name}`.trim() || undefined,
    });
    if (matches.length > 0) {
      setDupOpen(true);
      return;
    }
    await doCreate();
  }

  async function doCreate() {
    setSaving(true);
    try {
      const p = await createPerson(form, selectedRoles);
      toast.success("Person created");
      setOpen(false);
      setForm({ first_name: "", last_name: "", email: "", phone: "", company: "", city: "", state: "", zip: "" });
      setSelectedRoles(["Contact"]);
      nav(`/people/${p.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create");
    } finally {
      setSaving(false);
      setDupOpen(false);
    }
  }

  const dupQuery = useMemo(() => ({
    email: form.email || undefined,
    phone: form.phone || undefined,
    name: `${form.first_name} ${form.last_name}`.trim() || undefined,
  }), [form.email, form.phone, form.first_name, form.last_name]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> Master People
          </h1>
          <p className="text-sm text-muted-foreground">
            Every person exists once. Roles (Lead, Borrower, Realtor, Partner, …) attach here.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Person
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex gap-3 mb-4">
          <Input
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((p) => (
              <TableRow key={p.id} className="cursor-pointer" onClick={() => nav(`/people/${p.id}`)}>
                <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                <TableCell>{p.email ?? "—"}</TableCell>
                <TableCell>{p.phone ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(roles[p.id] ?? []).map((r) => (
                      <Badge key={r} variant="secondary">{r}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Link to={`/people/${p.id}`} onClick={(e) => e.stopPropagation()}>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {people.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No people yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Person</SheetTitle>
            <SheetDescription>Duplicate detection runs before saving.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First name</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
              <div><Label>Last name</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
            </div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
              <div><Label>Zip</Label><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
            </div>
            <div>
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ALL_ROLES.map((r) => (
                  <Badge
                    key={r}
                    variant={selectedRoles.includes(r) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleRole(r)}
                  >
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCheckDuplicatesAndCreate} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <DuplicateMatchModal
        open={dupOpen}
        onOpenChange={setDupOpen}
        query={dupQuery}
        onUseExisting={(id) => { setDupOpen(false); setOpen(false); nav(`/people/${id}`); }}
        onCreateNew={doCreate}
      />
    </div>
  );
}