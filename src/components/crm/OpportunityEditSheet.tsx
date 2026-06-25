import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS } from "@/lib/crm/stages";

type Props = {
  opportunityId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

type Form = {
  name: string;
  stage: string;
  loan_amount: string;
  loan_type: string;
  property_address: string;
  close_date: string;
  notes: string;
  primary_contact_id: string;
};

const EMPTY: Form = {
  name: "",
  stage: "application_sent",
  loan_amount: "",
  loan_type: "",
  property_address: "",
  close_date: "",
  notes: "",
  primary_contact_id: "",
};

export function OpportunityEditSheet({ opportunityId, open, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !opportunityId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("pipeline_opportunities")
        .select(
          "id,name,stage,loan_amount,loan_type,property_address,close_date,notes,primary_contact_id,contact_id"
        )
        .eq("id", opportunityId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast.error("Failed to load opportunity");
      } else if (data) {
        setForm({
          name: data.name ?? "",
          stage: data.stage ?? "application_sent",
          loan_amount: data.loan_amount != null ? String(data.loan_amount) : "",
          loan_type: data.loan_type ?? "",
          property_address: data.property_address ?? "",
          close_date: data.close_date ? data.close_date.slice(0, 10) : "",
          notes: data.notes ?? "",
          primary_contact_id: data.primary_contact_id ?? data.contact_id ?? "",
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, opportunityId]);

  const save = async () => {
    if (!opportunityId) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: form.name.trim() || null,
      stage: form.stage,
      loan_amount: form.loan_amount === "" ? null : Number(form.loan_amount),
      loan_type: form.loan_type.trim() || null,
      property_address: form.property_address.trim() || null,
      close_date: form.close_date ? new Date(form.close_date).toISOString() : null,
      notes: form.notes.trim() || null,
    };
    const { error } = await supabase
      .from("pipeline_opportunities")
      .update(payload)
      .eq("id", opportunityId);
    setSaving(false);
    if (error) {
      toast.error("Save failed", { description: error.message });
      return;
    }
    toast.success("Opportunity updated");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Opportunity</SheetTitle>
          <SheetDescription>Update core opportunity fields. Custom fields are edited in the workspace.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="opp-name">Name</Label>
            <Input id="opp-name" value={form.name} disabled={loading}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label>Stage</Label>
            <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{PIPELINE_STAGE_LABELS[s] ?? s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="opp-amt">Loan amount</Label>
              <Input id="opp-amt" inputMode="decimal" value={form.loan_amount} disabled={loading}
                onChange={(e) => setForm((f) => ({ ...f, loan_amount: e.target.value.replace(/[^0-9.]/g, "") }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="opp-type">Loan type</Label>
              <Input id="opp-type" value={form.loan_type} disabled={loading}
                onChange={(e) => setForm((f) => ({ ...f, loan_type: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="opp-addr">Property address</Label>
            <Input id="opp-addr" value={form.property_address} disabled={loading}
              onChange={(e) => setForm((f) => ({ ...f, property_address: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="opp-close">Close date</Label>
            <Input id="opp-close" type="date" value={form.close_date} disabled={loading}
              onChange={(e) => setForm((f) => ({ ...f, close_date: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="opp-notes">Notes</Label>
            <Textarea id="opp-notes" rows={4} value={form.notes} disabled={loading}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading}>{saving ? "Saving…" : "Save changes"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}