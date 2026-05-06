import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Upload, Download, Trash2, Pencil, Mail, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Subscriber = Tables<"subscribers">;

const STATUSES = ["subscribed", "unsubscribed", "bounced"] as const;

export default function Subscribers() {
  const [items, setItems] = useState<Subscriber[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subscriber | null>(null);
  const [tagsInput, setTagsInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const load = async () => {
    const { data, error } = await supabase
      .from("subscribers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    else setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((s) => {
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    return (
      s.email.toLowerCase().includes(t) ||
      (s.first_name ?? "").toLowerCase().includes(t) ||
      (s.last_name ?? "").toLowerCase().includes(t) ||
      (s.tags || []).some((tg) => tg.toLowerCase().includes(t))
    );
  });

  const startCreate = () => {
    setEditing({
      id: "", email: "", first_name: "", last_name: "",
      tags: [], status: "subscribed", lead_id: null, source: "manual",
      notes: null, created_at: "", updated_at: "",
    } as any);
    setTagsInput("");
    setOpen(true);
  };

  const startEdit = (s: Subscriber) => {
    setEditing(s);
    setTagsInput((s.tags ?? []).join(", "));
    setOpen(true);
  };

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = {
      email: editing.email.trim().toLowerCase(),
      first_name: editing.first_name?.trim() || null,
      last_name: editing.last_name?.trim() || null,
      status: editing.status,
      tags,
      notes: editing.notes,
      source: editing.source || "manual",
    };
    const { error } = editing.id
      ? await supabase.from("subscribers").update(payload).eq("id", editing.id)
      : await supabase.from("subscribers").insert(payload);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: editing.id ? "Updated" : "Added" }); setOpen(false); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this subscriber?")) return;
    const { error } = await supabase.from("subscribers").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); load(); }
  };

  const sendReview = async (s: Subscriber) => {
    const { data, error } = await supabase.functions.invoke("send-review-request", {
      body: {
        email: s.email,
        first_name: s.first_name || "there",
        last_name: s.last_name || "",
        subscriber_id: s.id,
      },
    });
    if (error || (data as any)?.error) {
      toast({ title: "Send failed", description: error?.message || (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: "Review request sent", description: s.email });
    }
  };

  const exportCsv = () => {
    const header = ["first_name", "last_name", "email", "status", "tags"];
    const rows = items.map((s) =>
      [s.first_name ?? "", s.last_name ?? "", s.email, s.status, (s.tags ?? []).join("|")]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `subscribers-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return;
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));
    const idx = (k: string) => header.indexOf(k);
    const ie = idx("email"), iF = idx("first_name"), iL = idx("last_name"), iS = idx("status"), iT = idx("tags");
    if (ie === -1) {
      toast({ title: "CSV missing 'email' column", variant: "destructive" });
      return;
    }
    const rows = lines.slice(1).map((line) => {
      const cols = line.match(/("([^"]|"")*"|[^,]*)/g)?.filter((_, i) => i % 2 === 0) ?? [];
      const cell = (i: number) => (i >= 0 && cols[i] != null ? cols[i].replace(/^"|"$/g, "").replace(/""/g, '"').trim() : "");
      const email = cell(ie).toLowerCase();
      if (!email) return null;
      const tagsStr = cell(iT);
      const tags = tagsStr ? tagsStr.split(/[|;]/).map((s) => s.trim()).filter(Boolean) : [];
      return {
        email,
        first_name: cell(iF) || null,
        last_name: cell(iL) || null,
        status: STATUSES.includes(cell(iS) as any) ? cell(iS) : "subscribed",
        tags,
        source: "csv_import",
      };
    }).filter(Boolean) as any[];
    if (!rows.length) { toast({ title: "No rows to import" }); return; }
    const { error } = await supabase.from("subscribers").upsert(rows, { onConflict: "email" });
    if (error) toast({ title: "Import failed", description: error.message, variant: "destructive" });
    else { toast({ title: `Imported ${rows.length} subscribers` }); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscribers</h1>
          <p className="text-muted-foreground">Email list for newsletters and review requests</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.currentTarget.value = ""; }} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Import CSV</Button>
          <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export</Button>
          <Button onClick={startCreate}><Plus className="mr-2 h-4 w-4" />Add</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, email, tag…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No subscribers yet. Add one or import a CSV.
                  </TableCell></TableRow>
                )}
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{[s.first_name, s.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "subscribed" ? "default" : "secondary"} className="capitalize">{s.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(s.tags ?? []).map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" title="Send Google review request" onClick={() => sendReview(s)}><Mail className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Subscriber" : "Add Subscriber"}</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>First name</Label>
                  <Input value={editing.first_name ?? ""} onChange={(e) => setEditing({ ...editing, first_name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Last name</Label>
                  <Input value={editing.last_name ?? ""} onChange={(e) => setEditing({ ...editing, last_name: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" required value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Status</Label>
                  <select className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={editing.status}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Tags (comma separated)</Label>
                  <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="closed, vip" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}><X className="mr-1 h-4 w-4" />Cancel</Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}