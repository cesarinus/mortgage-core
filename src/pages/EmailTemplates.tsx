import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Eye, Send, Code2 } from "lucide-react";
import { RichTextEditor } from "@/components/email/RichTextEditor";
import type { Tables } from "@/integrations/supabase/types";

type Template = Tables<"email_templates">;

const SAMPLE_VARS = {
  first_name: "Jane",
  last_name: "Doe",
  full_name: "Jane Doe",
  email: "jane@example.com",
  google_review_link: "https://g.page/r/CfDh9HCvSE-WEBE/review",
  portal_link: "https://ngcapital.net/portal/login",
};

function renderMerge(s: string, vars: Record<string, string>) {
  return (s || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => vars[k] ?? `{{${k}}}`);
}

export default function EmailTemplates() {
  const [items, setItems] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [previewing, setPreviewing] = useState<Template | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [editorMode, setEditorMode] = useState<"rich" | "html">("rich");
  const { toast } = useToast();

  const load = async () => {
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    else setItems(data ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const startCreate = () => {
    setEditing({
      id: "",
      name: "",
      alias: "",
      subject: "",
      html_content: "<p>Hi {{first_name}},</p><p>Write your message here.</p>",
      text_content: "Hi {{first_name}},\n\nWrite your message here.",
      category: "general",
      is_system: false,
      created_by: null,
      created_at: "",
      updated_at: "",
    } as any);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name?.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const payload: any = {
      name: editing.name.trim(),
      alias: editing.alias?.trim() || null,
      subject: editing.subject ?? "",
      html_content: editing.html_content ?? "",
      text_content: editing.text_content ?? "",
      category: editing.category || "general",
      merge_fields: (editing as any).merge_fields ?? [],
      trigger_event: (editing as any).trigger_event ?? null,
    };
    const { error } = editing.id
      ? await supabase.from("email_templates").update(payload).eq("id", editing.id)
      : await supabase.from("email_templates").insert(payload);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: editing.id ? "Updated" : "Created" });
      setEditing(null);
      load();
    }
  };

  const remove = async (t: Template) => {
    if (t.is_system) {
      toast({ title: "System template can't be deleted" });
      return;
    }
    if (!confirm(`Delete "${t.name}"?`)) return;
    const { error } = await supabase.from("email_templates").delete().eq("id", t.id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Deleted" });
      load();
    }
  };

  const sendTest = async (t: Template) => {
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      toast({ title: "Enter a valid test email", variant: "destructive" });
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to: testEmail,
        template_alias: t.alias,
        vars: SAMPLE_VARS,
      },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast({ title: "Send failed", description: error?.message || (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: "Test sent", description: testEmail });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground">
            Reusable HTML emails. Use <code>{"{{first_name}}"}</code>, <code>{"{{google_review_link}}"}</code> as merge
            fields.
          </p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.alias || "—"}</p>
                </div>
                {t.is_system && (
                  <Badge variant="secondary" className="text-xs">
                    System
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{t.subject || "(no subject)"}</p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setPreviewing(t)}>
                  <Eye className="mr-1 h-3.5 w-3.5" />
                  Preview
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(t)} disabled={t.is_system}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground col-span-full">No templates yet.</p>}
      </div>

      {/* Editor */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Alias (slug)</Label>
                  <Input
                    value={editing.alias ?? ""}
                    placeholder="welcome-email"
                    onChange={(e) =>
                      setEditing({ ...editing, alias: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Subject</Label>
                <Input
                  value={editing.subject ?? ""}
                  onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Trigger event</Label>
                  <Select
                    value={(editing as any).trigger_event ?? "none"}
                    onValueChange={(v) => setEditing({ ...editing, trigger_event: v === "none" ? null : v } as any)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Manual only</SelectItem>
                      <SelectItem value="lead_created">Lead created</SelectItem>
                      <SelectItem value="qualified_no_docs">Qualified – no docs (3d)</SelectItem>
                      <SelectItem value="deal_closed">Deal closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Merge fields (comma-separated)</Label>
                  <Input
                    value={((editing as any).merge_fields ?? []).join(", ")}
                    placeholder="first_name, portal_link"
                    onChange={(e) => setEditing({ ...editing, merge_fields: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } as any)}
                  />
                </div>
              </div>

              <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as any)}>
                <TabsList>
                  <TabsTrigger value="rich">Rich editor</TabsTrigger>
                  <TabsTrigger value="html">
                    <Code2 className="mr-1 h-3.5 w-3.5" />
                    HTML
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="rich">
                  <RichTextEditor
                    value={editing.html_content ?? ""}
                    onChange={(html) => setEditing({ ...editing, html_content: html })}
                  />
                </TabsContent>
                <TabsContent value="html">
                  <Textarea
                    rows={14}
                    className="font-mono text-xs"
                    value={editing.html_content ?? ""}
                    onChange={(e) => setEditing({ ...editing, html_content: e.target.value })}
                  />
                </TabsContent>
              </Tabs>

              <div className="space-y-1">
                <Label>Plain text version (fallback)</Label>
                <Textarea
                  rows={5}
                  value={editing.text_content ?? ""}
                  onChange={(e) => setEditing({ ...editing, text_content: e.target.value })}
                />
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button onClick={save}>Save</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={!!previewing} onOpenChange={(v) => !v && setPreviewing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewing?.name}</DialogTitle>
          </DialogHeader>
          {previewing && (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Subject: </span>
                <span className="font-medium">{renderMerge(previewing.subject ?? "", SAMPLE_VARS)}</span>
              </div>
              <div className="rounded border bg-white">
                <iframe
                  title="preview"
                  className="w-full h-[500px]"
                  srcDoc={renderMerge(previewing.html_content ?? "", SAMPLE_VARS)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Input placeholder="your@email.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
                <Button onClick={() => sendTest(previewing)} disabled={sending}>
                  <Send className="mr-1 h-3.5 w-3.5" />
                  Send test
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Test sends use the same template with sample merge values.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
