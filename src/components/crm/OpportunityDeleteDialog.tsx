import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Props = {
  opportunityId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
};

type Deps = Record<string, number>;

const LABELS: Record<string, string> = {
  tasks: "Tasks",
  activities: "Activities",
  notes: "Notes (lead-linked)",
  documents: "Documents",
  conditions: "Conditions",
  los_records: "LOS records",
  timeline_events: "Timeline events",
  mortgage_snapshots: "Mortgage snapshots",
  custom_fields: "Custom field values",
};

export function OpportunityDeleteDialog({ opportunityId, open, onOpenChange, onDone }: Props) {
  const [deps, setDeps] = useState<Deps | null>(null);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!open || !opportunityId) return;
    setDeps(null);
    setReason("");
    (async () => {
      const { data, error } = await (supabase as any).rpc("opportunity_dependency_counts", { _opp_id: opportunityId });
      if (error) toast.error("Failed to scan dependencies");
      else setDeps((data ?? {}) as Deps);
    })();
  }, [open, opportunityId]);

  const total = deps ? Object.values(deps).reduce((a, b) => a + (Number(b) || 0), 0) : 0;
  const hasDeps = total > 0;

  const archive = async () => {
    if (!opportunityId) return;
    setWorking(true);
    const { data, error } = await (supabase as any).rpc("archive_opportunity", {
      _opp_id: opportunityId, _reason: reason || null,
    });
    setWorking(false);
    if (error) return toast.error("Archive failed", { description: error.message });
    toast.success("Opportunity archived");
    onDone?.();
    onOpenChange(false);
  };

  const hardDelete = async () => {
    if (!opportunityId) return;
    setWorking(true);
    const { data, error } = await (supabase as any).rpc("hard_delete_opportunity", { _opp_id: opportunityId });
    setWorking(false);
    if (error) return toast.error("Delete failed", { description: error.message });
    if (data && data.ok === false) {
      toast.error("Cannot delete: dependencies present");
      return;
    }
    toast.success("Opportunity deleted");
    onDone?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{hasDeps ? "Archive opportunity" : "Delete opportunity"}</AlertDialogTitle>
          <AlertDialogDescription>
            {hasDeps
              ? "This opportunity has dependent records. Hard delete is blocked; archive it instead to keep the audit trail."
              : "No dependent records found. You can permanently delete this opportunity."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 text-sm">
          {deps === null ? (
            <Skeleton className="h-24" />
          ) : (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Dependency scan
              </div>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(deps).map(([k, v]) => (
                  <li key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{LABELS[k] ?? k}</span>
                    <span className={v > 0 ? "font-medium" : "text-muted-foreground"}>{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasDeps && (
            <div className="space-y-1.5">
              <Label htmlFor="archive-reason">Archive reason (optional)</Label>
              <Input id="archive-reason" value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. duplicate, test record, withdrew" />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
          {hasDeps ? (
            <Button onClick={archive} disabled={working}>{working ? "Archiving…" : "Archive instead"}</Button>
          ) : (
            <AlertDialogAction onClick={hardDelete} disabled={working || deps === null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {working ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}