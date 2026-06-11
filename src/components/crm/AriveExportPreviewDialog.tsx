import { useMemo } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, AlertTriangle, X, Eye, Loader2 } from "lucide-react";
import { validateAriveLead, type FieldStatus } from "@/lib/los/ariveValidate";

interface Props {
  lead: any;
  mortgageProfile?: any | null;
  sending?: boolean;
  onConfirm: () => void;
  triggerLabel?: string;
}

const statusMeta: Record<FieldStatus, { icon: any; cls: string; label: string }> = {
  valid:   { icon: Check,          cls: "text-emerald-600",  label: "Valid" },
  missing: { icon: AlertTriangle,  cls: "text-amber-500",    label: "Missing" },
  invalid: { icon: X,              cls: "text-destructive",  label: "Invalid Format" },
};

function formatRaw(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function AriveExportPreviewDialog({ lead, mortgageProfile, sending, onConfirm, triggerLabel = "Preview ARIVE payload" }: Props) {
  const result = useMemo(() => validateAriveLead(lead, mortgageProfile), [lead, mortgageProfile]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          <Eye className="h-3.5 w-3.5 mr-1" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ARIVE Export Preview
            <Badge variant={result.ok ? "default" : "destructive"}>
              {result.ok ? "Ready" : `${result.errors.length} issue${result.errors.length === 1 ? "" : "s"}`}
            </Badge>
            <Badge variant="secondary">Readiness {result.score}%</Badge>
          </DialogTitle>
          <DialogDescription>
            Review the flat payload before it ships to Zapier → ARIVE. Empty strings are dropped, dates are ISO 8601, phones are 10 digits.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-4">
          <table className="w-full text-xs border rounded-md overflow-hidden">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="text-left p-2 font-medium">CRM Field</th>
                <th className="text-left p-2 font-medium">CRM Value</th>
                <th className="text-left p-2 font-medium">ARIVE Field</th>
                <th className="text-left p-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.fields.map((f) => {
                const meta = statusMeta[f.status];
                const Icon = meta.icon;
                return (
                  <tr key={f.ariveField} className="border-t">
                    <td className="p-2">
                      <div className="font-medium">{f.crmField}</div>
                      {f.required && <span className="text-[10px] text-muted-foreground">required</span>}
                    </td>
                    <td className="p-2 font-mono text-[11px] break-all">{formatRaw(f.rawValue)}</td>
                    <td className="p-2 font-mono text-[11px]">
                      {f.ariveField}
                      {f.usedDefault && <span className="ml-1 text-[10px] text-muted-foreground">(default)</span>}
                    </td>
                    <td className={"p-2 " + meta.cls}>
                      <span className="inline-flex items-center gap-1">
                        <Icon className="h-3.5 w-3.5" /> {meta.label}
                      </span>
                      {f.message && f.status !== "valid" && (
                        <div className="text-[10px] text-muted-foreground">{f.message}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Final payload</div>
            <pre className="text-[11px] bg-muted/40 border rounded p-2 overflow-x-auto">
{JSON.stringify(result.payload, null, 2)}
            </pre>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={onConfirm} disabled={!result.ok || sending}>
            {sending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            {result.ok ? "Send to ARIVE" : "Resolve issues to send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
