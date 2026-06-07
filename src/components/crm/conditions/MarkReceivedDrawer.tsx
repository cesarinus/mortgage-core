import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  LoanCondition,
  markConditionReceived,
  uploadConditionFile,
} from "@/lib/crm/conditions";
import { recalcIncome } from "@/lib/crm/income";

const VIA_OPTIONS = ["portal", "email", "text", "whatsapp", "phone", "other"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  condition: LoanCondition | null;
  onSaved: () => void;
}

export function MarkReceivedDrawer({ open, onOpenChange, condition, onSaved }: Props) {
  const [receivedAt, setReceivedAt] = useState<string>(
    () => new Date().toISOString().slice(0, 10),
  );
  const [via, setVia] = useState<string>("portal");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setReceivedAt(new Date().toISOString().slice(0, 10));
    setVia("portal");
    setNotes("");
    setFile(null);
  };

  const submit = async () => {
    if (!condition) return;
    setBusy(true);
    const t = toast.loading("Saving…");
    try {
      let docUrl: string | null = null;
      let docName: string | null = null;
      if (file) {
        const up = await uploadConditionFile(condition.lead_id, condition.id, file);
        docUrl = up.path;
        docName = up.name;
      }
      await markConditionReceived(condition.id, {
        received_at: new Date(receivedAt).toISOString(),
        received_via: via,
        notes: notes || null,
        document_url: docUrl,
        document_name: docName,
      });
      toast.success("Condition received", { id: t });
      if (condition.category === "income") {
        const r = toast.loading("Recalculating income…");
        try {
          await recalcIncome(condition.lead_id);
          toast.success("Income updated", { id: r });
        } catch (err: any) {
          toast.error(err?.message ?? "Income recalc failed", { id: r });
        }
      }
      reset();
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save", { id: t });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:max-w-[420px]">
        <SheetHeader>
          <SheetTitle>Mark condition received</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          {condition && (
            <p className="text-sm text-muted-foreground">{condition.title}</p>
          )}
          <div className="space-y-1.5">
            <Label>Received date</Label>
            <Input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Received via</Label>
            <Select value={via} onValueChange={setVia}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VIA_OPTIONS.map((v) => (
                  <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Document (optional)</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}