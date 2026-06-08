import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, ExternalLink, MoreHorizontal, Eye, Pencil, Trash2, Copy, ArrowUpRightSquare } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast as sonnerToast } from "sonner";
import type { Tables, Enums } from "@/integrations/supabase/types";
import { RecordLookup } from "@/components/crm/RecordLookup";
import { fetchAllCompanies } from "@/lib/crm/queries";
import { TablePagination } from "@/components/ui/table-pagination";
import { SmartEmailComposer } from "@/components/email/SmartEmailComposer";

type Contact = Tables<"contacts">;

const roleColors: Record<string, string> = {
  lead: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  borrower: "bg-primary/15 text-primary",
  co_borrower: "bg-primary/10 text-primary",
  real_estate_agent: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  title_agent: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  insurance_agent: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  referral_partner: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  other: "bg-muted text-muted-foreground",
};

export default function People() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [createCoOpen, setCreateCoOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [deleteBlock, setDeleteBlock] = useState<{ leads: number } | null>(null);
  const [deleteChecking, setDeleteChecking] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [emailTarget, setEmailTarget] = useState<{ to: string; name: string } | null>(null);

  const load = async () => {
    const [{ data: contactsData }, { data: pdData }] = await Promise.all([supabase.from("contacts").select("*").order("created_at", { ascending: false }), supabase.from("borrower_payment_details").select("contact_id, borrower_type")]); const pdMap = new Map(); pdData?.forEach((pd: any) => { if (pd.contact_id) pdMap.set(pd.contact_id, pd.borrower_type); }); const enriched = (contactsData ?? []).map((c: any) => ({ ...c, borrower_type: pdMap.get(c.id) || null })); setContacts(enriched as any); return;
    setContacts((data ?? []) as Contact[]);
  };
  const loadCompanies = async () => setCompanies(await fetchAllCompanies());

  useEffect(() => { load(); loadCompanies(); }, []);
  useEffect(() => { if (open) setCompanyId((editing as any)?.company_id ?? null); }, [open, editing]);

  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      first_name: fd.get("first_name") as string,
      last_name: fd.get("last_name") as string,
      email: (fd.get("email") as string) || null,
      phone: (fd.get("phone") as string) || null,
      address: (fd.get("address") as string) || null,
      contact_type: (fd.get("contact_type") as Enums<"contact_type">) || "borrower",
      job_title: (fd.get("job_title") as string) || null,
      company_id: companyId,
      notes: (fd.get("notes") as string) || null,
    };
    const { error } = editing
      ? await supabase.from("contacts").update(payload).eq("id", editing.id)
      : await supabase.from("contacts").insert({ ...payload, created_by: user!.id });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: editing ? "Person updated" : "Person created" });
      setOpen(false); setEditing(null); load();
    }
  };

  const handleCreateCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { data, error } = await supabase.from("crm_companies").insert({
      name: fd.get("name") as string,
      domain: (fd.get("domain") as string) || null,
      phone: (fd.get("phone") as string) || null,
      company_type: (fd.get("company_type") as any) || "other",
      created_by: user!.id,
    } as any).select("id, name, industry, is_self_employed, company_type, domain").maybeSingle();
    if (error || !data) { toast({ title: "Error", description: error?.message, variant: "destructive" }); return; }
    setCompanies((p) => [data, ...p]);
    setCompanyId(data.id);
    setCreateCoOpen(false);
    toast({ title: "Company created" });
  };

  const filtered = contacts.filter((c: any) => {
    const q = search.toLowerCase();
    const matchQ = `${c.first_name} ${c.last_name} ${c.email ?? ""} ${c.role ?? ""}`.toLowerCase().includes(q);
    const matchR = roleFilter === "all" || c.role === roleFilter;
    return matchQ && matchR;
  });
  useEffect(() => { setPage(1); }, [search, roleFilter, pageSize]);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (c: Contact) => { setEditing(c); setOpen(true); };
  const openView = (c: Contact) => { setEditing(c); setOpen(true); };

  const openDelete = async (c: Contact) => {
    setDeleteTarget(c);
    setDeleteBlock(null);
    setDeleteChecking(true);
    const { count } = await supabase
      .from("lead_contacts").select("lead_id", { count: "exact", head: true }).eq("contact_id", c.id);
    setDeleteBlock({ leads: count ?? 0 });
    setDeleteChecking(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const snap = deleteTarget;
    setDeleteTarget(null);
    setDeleteBlock(null);
    const { error } = await supabase.from("contacts").delete().eq("id", snap.id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { sonnerToast.success(`Deleted ${snap.first_name} ${snap.last_name}`); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">People</h1>
          <p className="text-muted-foreground">Borrowers, partners, and contacts</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />New Person</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search people…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {Object.keys(roleColors).map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="[&_td]:py-1.5 [&_th]:py-2 text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Borrower Type</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Temp</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No people found</TableCell></TableRow>
              ) : paged.map((c: any) => {
                const co = c.company_id ? companyById.get(c.company_id) : null;
                const role = c.role ?? "other";
                const bType = c.borrower_type || "employee";
                return (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => openEdit(c)}>
                    <TableCell className="font-medium">{c.first_name} {c.last_name}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          onClick={(e) => {
                            e.preventDefault();
                            setEmailTarget({ to: c.email, name: `${c.first_name} ${c.last_name}`.trim() });
                          }}
                          className="text-primary hover:underline"
                        >
                          {c.email}
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell>{co?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`capitalize ${roleColors[role] ?? roleColors.other}`}>
                        {String(role).replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{c.lead_score ?? "—"}</TableCell>
                    <TableCell className="capitalize">{c.temperature ?? "—"}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openView(c)}>
                            <Eye className="h-3.5 w-3.5 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/crm/contacts/${c.id}`)}>
                            <ArrowUpRightSquare className="h-3.5 w-3.5 mr-2" /> Open Workspace
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          {c.email && (
                            <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(c.email!); sonnerToast.success("Email copied"); }}>
                              <Copy className="h-3.5 w-3.5 mr-2" /> Copy Email
                            </DropdownMenuItem>
                          )}
                          {c.phone && (
                            <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(c.phone!); sonnerToast.success("Phone copied"); }}>
                              <Copy className="h-3.5 w-3.5 mr-2" /> Copy Phone
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDelete(c)}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setDeleteBlock(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete person?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteChecking ? "Checking linked records…" : deleteBlock && deleteBlock.leads > 0
                ? `This person is linked to ${deleteBlock.leads} lead(s). Deleting will remove those links.`
                : `This will permanently delete ${deleteTarget?.first_name} ${deleteTarget?.last_name}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{editing ? "Edit Person" : "New Person"}</SheetTitle></SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-6 mt-6" key={editing?.id ?? "new"}>
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">General</h3>
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
                <Label htmlFor="job_title">Job title</Label>
                <Input id="job_title" name="job_title" defaultValue={(editing as any)?.job_title ?? ""} />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</h3>
              <div className="space-y-1"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" defaultValue={editing?.email ?? ""} /></div>
              <div className="space-y-1"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" defaultValue={editing?.phone ?? ""} /></div>
              <div className="space-y-1"><Label htmlFor="address">Address</Label><Input id="address" name="address" defaultValue={editing?.address ?? ""} /></div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Business</h3>
              <div className="space-y-1">
                <Label>Company</Label>
                <RecordLookup
                  value={companyId}
                  onChange={setCompanyId}
                  items={companies.map((c) => ({ id: c.id, label: c.name, sub: c.company_type?.replace(/_/g, " ") ?? c.domain ?? undefined }))}
                  placeholder="Search companies…"
                  emptyText="No companies found."
                />
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setCreateCoOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Create company
                </Button>
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
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">System</h3>
              <div className="space-y-1"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" rows={3} defaultValue={editing?.notes ?? ""} /></div>
            </section>

            <Button type="submit" className="w-full">{editing ? "Save Changes" : "Create Person"}</Button>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={createCoOpen} onOpenChange={setCreateCoOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Company</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateCompany} className="space-y-3">
            <div className="space-y-1"><Label htmlFor="co_name">Name</Label><Input id="co_name" name="name" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="co_domain">Domain</Label><Input id="co_domain" name="domain" placeholder="acme.com" /></div>
              <div className="space-y-1"><Label htmlFor="co_phone">Phone</Label><Input id="co_phone" name="phone" /></div>
            </div>
            <div className="space-y-1">
              <Label>Company type</Label>
              <Select name="company_type" defaultValue="other">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lender">Lender</SelectItem>
                  <SelectItem value="title_company">Title company</SelectItem>
                  <SelectItem value="insurance_agency">Insurance agency</SelectItem>
                  <SelectItem value="real_estate_brokerage">Real estate brokerage</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Create</Button>
          </form>
        </DialogContent>
      </Dialog>

      <SmartEmailComposer
        open={!!emailTarget}
        onOpenChange={(o) => { if (!o) setEmailTarget(null); }}
        to={emailTarget?.to ?? ""}
        recipientName={emailTarget?.name}
      />
    </div>
  );
}