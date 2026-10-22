import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Send, Users, CalendarClock, FlaskConical, Trash2 } from "lucide-react";

const AUDIENCES = [
  { value: "Realtor", label: "Real Estate Agents" },
  { value: "ReferralPartner", label: "Referral Partners" },
  { value: "Builder", label: "Builders" },
  { value: "Attorney", label: "Attorneys" },
  { value: "Vendor", label: "Vendors" },
  { value: "Contact", label: "General Contacts" },
];
const audienceLabel = (v: string) => AUDIENCES.find((a) => a.value === v)?.label ?? v;

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline", scheduled: "secondary", sending: "default", sent: "default", failed: "destructive",
};

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("send-campaign", { body });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try { msg = (await error.context.json()).error ?? msg; } catch { /* keep */ }
    }
    throw new Error(msg);
  }
  return data;
}

export default function EmailCampaigns() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", template_id: "", subject: "", audience_role: "Realtor", scheduled_at: "" });
  const [selected, setSelected] = useState<any | null>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: c }, { data: t }] = await Promise.all([
      supabase.from("email_campaigns").select("*, email_templates(name)").order("created_at", { ascending: false }),
      supabase.from("email_templates").select("id, name, subject").order("name"),
    ]);
    setCampaigns(c ?? []);
    setTemplates(t ?? []);
  };
  useEffect(() => { load(); }, []);

  const loadRecipients = async (id: string) => {
    const { data } = await supabase.from("email_campaign_recipients").select("*").eq("campaign_id", id).order("email");
    setRecipients(data ?? []);
  };

  const create = async () => {
    if (!form.name.trim() || !form.template_id) {
      toast({ title: "Name and template are required", variant: "destructive" });
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("email_campaigns").insert({
      name: form.name.trim(),
      template_id: form.template_id,
      subject: form.subject.trim() || null,
      audience_role: form.audience_role,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      status: form.scheduled_at ? "scheduled" : "draft",
      created_by: u.user?.id,
    });
    if (error) return toast({ title: "Could not create campaign", description: error.message, variant: "destructive" });
    setOpen(false);
    setForm({ name: "", template_id: "", subject: "", audience_role: "Realtor", scheduled_at: "" });
    toast({ title: form.scheduled_at ? "Campaign scheduled" : "Campaign saved as draft" });
    load();
  };

  const run = async (label: string, body: Record<string, unknown>, after?: (d: any) => void) => {
    setBusy(true);
    try {
      const d = await invoke(body);
      after?.(d);
      toast({ title: label });
    } catch (e: any) {
      toast({ title: "Something went wrong", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
      load();
      if (selected) loadRecipients(selected.id);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    await supabase.from("email_campaigns").delete().eq("id", id);
    setSelected(null);
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Email Campaigns</h1>
          <p className="text-sm text-muted-foreground">Send your email templates to a group of contacts — like your real estate agent list.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Campaign</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Campaigns</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{campaigns.length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Emails sent</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{campaigns.reduce((s, c) => s + (c.sent_count || 0), 0)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Scheduled</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{campaigns.filter((c) => c.status === "scheduled").length}</CardContent></Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead><TableHead>Audience</TableHead><TableHead>Template</TableHead>
              <TableHead>Status</TableHead><TableHead>Sent / Failed</TableHead><TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No campaigns yet. Create your first one.</TableCell></TableRow>
            )}
            {campaigns.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => { setSelected(c); loadRecipients(c.id); }}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{audienceLabel(c.audience_role)}</TableCell>
                <TableCell>{c.email_templates?.name ?? "—"}</TableCell>
                <TableCell><Badge variant={statusVariant[c.status] ?? "outline"}>{c.status}</Badge></TableCell>
                <TableCell>{c.sent_count} / {c.failed_count}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.completed_at ? new Date(c.completed_at).toLocaleString() : c.scheduled_at ? `Scheduled ${new Date(c.scheduled_at).toLocaleString()}` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Campaign name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Agent Partner Introduction" /></div>
            <div><Label>Email template</Label>
              <Select value={form.template_id} onValueChange={(v) => setForm({ ...form, template_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger>
                <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label>Subject line (optional — uses the template's subject if blank)</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Hi {{first_name}}, let's help your buyers close faster" /></div>
            <div><Label>Send to</Label>
              <Select value={form.audience_role} onValueChange={(v) => setForm({ ...form, audience_role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AUDIENCES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label>Schedule (optional — leave blank to save as a draft)</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">Use {"{{first_name}}"} in the template to personalize. An unsubscribe link is added automatically, and anyone who unsubscribed is skipped.</p>
          </div>
          <DialogFooter><Button onClick={create}>Save Campaign</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          {selected && (
            <>
              <DialogHeader><DialogTitle>{selected.name}</DialogTitle></DialogHeader>
              <div className="text-sm text-muted-foreground">
                {audienceLabel(selected.audience_role)} · Template: {selected.email_templates?.name ?? "—"} · Status: {selected.status}
              </div>
              {selected.status !== "sent" && selected.status !== "sending" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" disabled={busy} onClick={() => run("Audience refreshed", { action: "preview_audience", campaign_id: selected.id }, (d) => toast({ title: `${d.recipients} recipients` }))}>
                      <Users className="h-4 w-4 mr-2" />Load Recipients
                    </Button>
                    <Button disabled={busy} onClick={() => { if (confirm("Send this campaign to everyone in the audience now?")) run("Campaign sent", { action: "send", campaign_id: selected.id }); }}>
                      <Send className="h-4 w-4 mr-2" />Send Now
                    </Button>
                    <Button variant="ghost" disabled={busy} onClick={() => remove(selected.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="your@email.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
                    <Button variant="outline" disabled={busy || !testTo} onClick={() => run("Test email sent", { action: "send_test", campaign_id: selected.id, to: testTo })}>
                      <FlaskConical className="h-4 w-4 mr-2" />Send Test
                    </Button>
                  </div>
                  {selected.scheduled_at && (
                    <p className="text-xs flex items-center gap-1 text-muted-foreground"><CalendarClock className="h-3 w-3" />Sends automatically on {new Date(selected.scheduled_at).toLocaleString()}</p>
                  )}
                </div>
              )}
              <div className="max-h-80 overflow-auto border rounded-md">
                <Table>
                  <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Sent</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {recipients.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No recipients loaded yet.</TableCell></TableRow>}
                    {recipients.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.email}</TableCell><TableCell>{r.first_name ?? "—"}</TableCell>
                        <TableCell><Badge variant={r.status === "failed" ? "destructive" : r.status === "sent" ? "default" : "outline"}>{r.status}</Badge>
                          {r.error_message && <span className="block text-xs text-muted-foreground">{r.error_message}</span>}</TableCell>
                        <TableCell className="text-xs">{r.sent_at ? new Date(r.sent_at).toLocaleString() : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
