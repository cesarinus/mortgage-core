import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import SendToLosButton from "./SendToLosButton";
import AriveExportPreviewDialog from "./AriveExportPreviewDialog";
import ExportDebugPanel from "./ExportDebugPanel";
import { validateAriveLead } from "@/lib/los/ariveValidate";
import { buildLeadContext, type LeadContext } from "@/lib/los/leadContext";

interface Props {
  lead: any;
  opportunity?: any;
  mortgageProfile?: any | null;
  onSent?: () => void;
}

export default function AriveExportCard({ lead, opportunity, mortgageProfile, onSent }: Props) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [context, setContext] = useState<LeadContext | null>(null);

  useEffect(() => {
    if (!lead?.id) return;
    let cancelled = false;
    buildLeadContext(lead.id).then((ctx) => { if (!cancelled) setContext(ctx); });
    return () => { cancelled = true; };
  }, [lead?.id, refreshKey]);

  // Validate against the canonical context (falls back to raw lead while resolving).
  const validation = useMemo(
    () => validateAriveLead(context ?? lead, mortgageProfile),
    [context, lead, mortgageProfile],
  );

  const blockers = validation.errors.slice(0, 4);

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              {validation.ok ? (
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              Export Readiness
            </span>
            <Badge variant={validation.ok ? "default" : "secondary"}>{validation.score}%</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={validation.score} className="h-1.5" />
          {blockers.length > 0 ? (
            <ul className="text-[11px] text-muted-foreground space-y-0.5">
              {blockers.map((b) => (
                <li key={b.field}>• {b.message}</li>
              ))}
              {validation.errors.length > blockers.length && (
                <li>… and {validation.errors.length - blockers.length} more</li>
              )}
            </ul>
          ) : (
            <p className="text-[11px] text-emerald-600">All required fields look good.</p>
          )}
          <div className="space-y-2">
            <SendToLosButton
              lead={context ?? lead}
              opportunity={opportunity}
              mortgageProfile={mortgageProfile}
              onSent={() => { setRefreshKey((k) => k + 1); onSent?.(); }}
            />
            <AriveExportPreviewDialog
              lead={context ?? lead}
              mortgageProfile={mortgageProfile}
              onConfirm={() => { /* SendToLosButton handles confirmation flow */ }}
              triggerLabel="Preview ARIVE payload"
            />
          </div>
        </CardContent>
      </Card>

      <ExportDebugPanel leadId={lead.id} refreshKey={refreshKey} />
    </div>
  );
}
