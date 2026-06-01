import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Contact = Tables<"contacts">;

const typeColors: Record<Enums<"contact_type">, string> = {
  borrower: "bg-primary/10 text-primary",
  partner: "bg-accent/10 text-accent",
  other: "bg-muted text-muted-foreground",
};

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
    setContacts(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      first_name: fd.get("first_name") as string,
      last_name: fd.get("last_name") as string,
      email: (fd.get("email") as string) || null,
      phone: (fd.get("phone") as string) || null,
      address: (fd.get("address") as string) || null,
      contact_type: (fd.get("contact_type") as Enums<"contact_type">) || "borrower",
      notes: (fd.get("notes") as string) || null,
    };
    const { error } = editing
      ? await supabase.from("contacts").update(payload).eq("id", editing.id)
      : await supabase.from("contacts").insert({ ...payload, created_by: user!.id });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editing ? "Contact updated" : "Contact created" });
      setOpen(false);
      setEditing(null);
      load();
    }
  };

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (c: Contact) => { setEditing(c); setOpen(true); };

  const filtered = contacts.filter((c) =>
    `${c.first_name} ${c.last_name} ${c.email ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">Borrowers, partners, and relationships</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Add Contact</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Contact" : "New Contact"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" key={editing?.id ?? "new"}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="first_name">First name</Label>
                  <Input id="first_name" name="first_name" required defaultValue={editing?.first_name ?? ""} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="last_name">Last name</Label>
                  <Input id="last_name" name="last_name" required defaultValue={editing?.last_name ?? ""} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={editing?.email ?? ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={editing?.phone ?? ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" defaultValue={editing?.address ?? ""} />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select name="contact_type" defaultValue={editing?.contact_type ?? "borrower"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrower">Borrower</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={3} defaultValue={editing?.notes ?? ""} />
              </div>
              <Button type="submit" className="w-full">{editing ? "Save Changes" : "Create Contact"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search contacts…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No contacts found</TableCell></TableRow>
              ) : filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => openEdit(c)}>
                  <TableCell className="font-medium">{c.first_name} {c.last_name}</TableCell>
                  <TableCell>{c.email ?? "—"}</TableCell>
                  <TableCell>{c.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={typeColors[c.contact_type]}>
                      {c.contact_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                        title="Open workspace"
                      >
                        <Link to={`/crm/contacts/${c.id}`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
