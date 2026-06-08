import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Building2, MoreHorizontal, Eye, Pencil, Trash2, Copy } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast as sonnerToast } from "sonner";
import { TablePagination } from "@/components/ui/table-pagination";
import { SmartEmailComposer } from "@/components/email/SmartEmailComposer";

const typeColors: Record<string, string> = {
  lender: "bg-primary/15 text-primary",
  title_company: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  insurance_agency: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  real_estate_brokerage: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  other: "bg-muted text-muted-foreground",
};

export default function Companies() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [linkedPeople, setLinkedPeople] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [emailTarget, setEmailTarget] = useState<{ to: string; name: string } | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const load = async () => {
    const { data: cos } = await supabase.from("crm_companies").select("*").order("name");
    setCompanies(cos ?? []);
    const { data: people } = await supabase.from("contacts").select("id, company_id");
    const map: Record<string, number> = {};
    (people ?? []).forEach((p: any) => { if (p.company_id) map[p.company_id] = (map[p.company_id] ?? 0) + 1; });
    setCounts(map);
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (co: any) => {
    setDetail(co);
    const { data } = await supabase.from("contacts")
      .select("id, first_name, last_name, email, role, job_title")
      .eq("company_id", co.id);
    setLinkedPeople(data ?? []);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      name: fd.get("name") as string,
      domain: (fd.get("domain") as string) || null,
      phone: (fd.get("phone") as string) || null,
      company_type: (fd.get("company_type") as any) || "other",
      notes: (fd.get("notes") as string) || null,
    };
    const { error } = editing
      ? await supabase.from("crm_companies").update(payload).eq("id", editing.id)
      : await supabase.from("crm_companies").insert({ ...payload, created_by: user!.id } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: editing ? "Company updated" : "Company created" }); setOpen(false); setEditing(null); load(); }
  };

  const filtered = useMemo(() => companies.filter((c) => {
    const q = search.toLowerCase();
    const matchQ = `${c.name} ${c.domain ?? ""}`.toLowerCase().includes(q);
    const matchT = typeFilter === "all" || c.company_type === typeFilter;
    return matchQ && matchT;
  }), [companies, search, typeFilter]);
  useEffect(() => { setPage(1); }, [search, typeFilter, pageSize]);
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const snap = deleteTarget;
    setDeleteTarget(null);
    const { error } = await supabase.from("crm_companies").delete().eq("id", snap.id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { sonnerToast.success(`Deleted ${snap.name}`); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">Lenders, title, insurance, and brokerage partners</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />New Company</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search companies…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.keys(typeColors).map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
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
                <TableHead>Domain</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>People</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No companies found</TableCell></TableRow>
              ) : paged.map((c) => {
                const t = c.company_type ?? "other";
                return (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => openDetail(c)}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />{c.name}
                    </TableCell>
                    <TableCell>{c.domain ?? "—"}</TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`capitalize ${typeColors[t] ?? typeColors.other}`}>
                        {String(t).replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{counts[c.id] ?? 0}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetail(c)}>
                            <Eye className="h-3.5 w-3.5 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditing(c); setOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          {c.domain && (
                            <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(c.domain); sonnerToast.success("Domain copied"); }}>
                              <Copy className="h-3.5 w-3.5 mr-2" /> Copy Domain
                            </DropdownMenuItem>
                          )}
                          {c.phone && (
                            <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(c.phone); sonnerToast.success("Phone copied"); }}>
                              <Copy className="h-3.5 w-3.5 mr-2" /> Copy Phone
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(c)}>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete company?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (counts[deleteTarget.id] ?? 0) > 0
                ? `${counts[deleteTarget.id]} people are linked to this company. Their company field will be cleared.`
                : `This will permanently delete ${deleteTarget?.name}.`}
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

      {/* Create/Edit sheet */}
      <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{editing ? "Edit Company" : "New Company"}</SheetTitle></SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-6" key={editing?.id ?? "new"}>
            <div className="space-y-1"><Label htmlFor="name">Name</Label><Input id="name" name="name" required defaultValue={editing?.name ?? ""} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="domain">Domain</Label><Input id="domain" name="domain" defaultValue={editing?.domain ?? ""} /></div>
              <div className="space-y-1"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" defaultValue={editing?.phone ?? ""} /></div>
            </div>
            <div className="space-y-1">
              <Label>Company type</Label>
              <Select name="company_type" defaultValue={editing?.company_type ?? "other"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(typeColors).map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" rows={3} defaultValue={editing?.notes ?? ""} /></div>
            <Button type="submit" className="w-full">{editing ? "Save Changes" : "Create Company"}</Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Detail sheet */}
      <Sheet open={!!detail} onOpenChange={(o) => { if (!o) { setDetail(null); setLinkedPeople([]); } }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{detail?.name}</SheetTitle></SheetHeader>
          {detail && (
            <div className="space-y-6 mt-6">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={`capitalize ${typeColors[detail.company_type ?? "other"]}`}>
                  {String(detail.company_type ?? "other").replace(/_/g, " ")}
                </Badge>
                {detail.domain && <span className="text-sm text-muted-foreground">{detail.domain}</span>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditing(detail); setDetail(null); setOpen(true); }}>Edit</Button>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Linked people ({linkedPeople.length})</h3>
                {linkedPeople.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No people linked.</p>
                ) : (
                  <ul className="space-y-2">
                    {linkedPeople.map((p) => (
                      <li key={p.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                        <div>
                          <div className="font-medium">{p.first_name} {p.last_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.email ? (
                              <a
                                href={`mailto:${p.email}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setEmailTarget({ to: p.email, name: `${p.first_name} ${p.last_name}`.trim() });
                                }}
                                className="text-primary hover:underline"
                              >
                                {p.job_title ?? p.email}
                              </a>
                            ) : (p.job_title ?? "—")}
                          </div>
                        </div>
                        {p.role && <Badge variant="outline" className="capitalize">{String(p.role).replace(/_/g, " ")}</Badge>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <SmartEmailComposer
        open={!!emailTarget}
        onOpenChange={(o) => { if (!o) setEmailTarget(null); }}
        to={emailTarget?.to ?? ""}
        recipientName={emailTarget?.name}
      />
    </div>
  );
}