import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePortalBinding } from "@/hooks/usePortalBinding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle2 } from "lucide-react";
import { AiFeedback } from "@/components/crm/AiFeedback";

export default function PortalDocuments() {
  const { user } = useAuth();
  const { binding } = usePortalBinding();
  const [categories, setCategories] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const { toast } = useToast();

  const reload = useCallback(async () => {
    if (!binding) return;
    const [{ data: c }, { data: f }] = await Promise.all([
      supabase.from("crm_document_categories").select("*").order("sort_order"),
      supabase.from("crm_attachments").select("*").eq("deal_id", binding.deal_id).order("created_at", { ascending: false }),
    ]);
    setCategories(c ?? []); setFiles(f ?? []);
  }, [binding]);

  useEffect(() => { reload(); }, [reload]);

  const handleUpload = async (categorySlug: string, file: File) => {
    if (!binding || !user) return;
    setUploading(categorySlug);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `portal/${binding.deal_id}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("crm-documents").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("crm_attachments").insert({
        deal_id: binding.deal_id,
        lead_id: binding.lead_id,
        contact_id: binding.contact_id,
        file_path: path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        category_slug: categorySlug,
        uploaded_by: user.id,
      });
      if (insErr) throw insErr;
      toast({ title: "Uploaded", description: file.name });
      reload();
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Try again", variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  if (!binding) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-muted-foreground text-sm">Upload the items your loan officer needs to close your loan.</p>
        <div className="mt-3">
          <AiFeedback
            feature="portal_docs"
            profile="borrower"
            context={{ borrower_id: binding.contact_id ?? null, deal_id: binding.deal_id ?? null, chat_thread_id: null }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => {
          const items = files.filter((f) => f.category_slug === cat.slug);
          return (
            <Card key={cat.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    {cat.name}
                    {items.length > 0 && <Badge variant="secondary" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />{items.length}</Badge>}
                  </CardTitle>
                  {cat.description && <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>}
                </div>
                <label>
                  <input
                    type="file"
                    className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(cat.slug, f); e.currentTarget.value = ""; }}
                  />
                  <Button size="sm" variant="outline" asChild disabled={uploading === cat.slug}>
                    <span className="cursor-pointer"><Upload className="h-3.5 w-3.5 mr-1.5" />{uploading === cat.slug ? "Uploading…" : "Upload"}</span>
                  </Button>
                </label>
              </CardHeader>
              {items.length > 0 && (
                <CardContent className="pt-0">
                  <ul className="space-y-1.5 text-sm">
                    {items.map((it) => (
                      <li key={it.id} className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate flex-1">{it.file_name}</span>
                        <span className="text-xs">{new Date(it.created_at).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          );
        })}
        {categories.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No document categories configured yet.</CardContent></Card>
        )}
      </div>
    </div>
  );
}