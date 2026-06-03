import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Upload, CheckCircle2, AlertCircle, FileCheck2 } from "lucide-react";

interface Props {
  deals: any[];
}

type StageDoc = { id: string; stage: string; label: string; required: boolean; sort_order: number };
type DealDoc = { id: string; deal_id: string; stage_document_id: string; status: "missing" | "uploaded" | "verified"; url: string | null };

const statusMeta = {
  missing: { label: "Missing", icon: AlertCircle, variant: "destructive" as const },
  uploaded: { label: "Uploaded", icon: Upload, variant: "secondary" as const },
  verified: { label: "Verified", icon: CheckCircle2, variant: "default" as const },
};

export function DocumentsTab({ deals }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stageDocs, setStageDocs] = useState<StageDoc[]>([]);
  const [dealDocs, setDealDocs] = useState<DealDoc[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  // Use the first deal as the active one for this record (RecordWorkspace usually shows a single borrower).
  const deal = deals[0];
  const stage: string | undefined = deal?.stage;

  const load = useCallback(async () => {
    if (!stage || !deal?.id) { setStageDocs([]); setDealDocs([]); return; }
    const [{ data: sd }, { data: dd }] = await Promise.all([
      (supabase as any).from("stage_documents").select("*").eq("stage", stage).order("sort_order"),
      (supabase as any).from("deal_documents").select("*").eq("deal_id", deal.id),
    ]);
    setStageDocs(sd ?? []);
    setDealDocs(dd ?? []);
  }, [stage, deal?.id]);

  useEffect(() => { load(); }, [load]);

  const docFor = (sdId: string) => dealDocs.find((d) => d.stage_document_id === sdId);

  const upload = async (sd: StageDoc, file: File) => {
    if (!deal?.id || !user) return;
    setBusy(sd.id);
    try {
      const path = `${deal.id}/${sd.stage}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("crm-documents").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const existing = docFor(sd.id);
      if (existing) {
        await (supabase as any).from("deal_documents").update({
          status: "uploaded", url: path, uploaded_by: user.id,
        }).eq("id", existing.id);
      } else {
        await (supabase as any).from("deal_documents").insert({
          deal_id: deal.id, stage_document_id: sd.id, status: "uploaded", url: path, uploaded_by: user.id,
        });
      }
      toast({ title: "Uploaded", description: sd.label });
      load();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const markVerified = async (sd: StageDoc) => {
    const existing = docFor(sd.id);
    if (!existing) return;
    await (supabase as any).from("deal_documents").update({ status: "verified" }).eq("id", existing.id);
    load();
  };

  if (!deal) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">No deal linked to this record yet. Documents become available once a deal is created.</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <FileCheck2 className="h-4 w-4" />
          Documents · <span className="text-muted-foreground font-normal">{stage}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {stageDocs.length === 0 && (
          <p className="text-sm text-muted-foreground">No required documents for this stage.</p>
        )}
        {stageDocs.map((sd) => {
          const d = docFor(sd.id);
          const status = d?.status ?? "missing";
          const Meta = statusMeta[status];
          return (
            <div key={sd.id} className="flex items-center justify-between gap-2 rounded-md border p-3">
              <div className="flex items-center gap-2 min-w-0">
                <Meta.icon className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{sd.label}</p>
                  {sd.required && <span className="text-[10px] text-muted-foreground">Required</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={Meta.variant} className="text-xs">{Meta.label}</Badge>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    disabled={busy === sd.id}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) upload(sd, f);
                      e.currentTarget.value = "";
                    }}
                  />
                  <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent">
                    <Upload className="h-3 w-3" />{d ? "Replace" : "Upload"}
                  </span>
                </label>
                {d && status !== "verified" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markVerified(sd)}>
                    Verify
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}