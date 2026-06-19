import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Globe, Clock, FileCheck, AlertCircle, Mail } from "lucide-react";

interface PortalSummary {
  portal_user_id: string | null;
  deal_id: string | null;
  email: string | null;
  last_login_at: string | null;
  invite_sent_at: string | null;
  invite_accepted_at: string | null;
  stage: string | null;
  completion_pct: number;
  documents_uploaded: number;
  documents_required: number;
  missing_items: string[];
}

function rel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const m = Math.floor(days / 30);
  return m === 1 ? "1 month ago" : `${m} months ago`;
}

export function PortalIntelligencePanel({ leadId }: { leadId: string }) {
  const [data, setData] = useState<PortalSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: rows } = await (supabase as any).rpc("get_portal_applicant_summary", { _lead_id: leadId });
      if (cancelled) return;
      const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      setData(row);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [leadId]);

  if (loading) return null;
  if (!data || !data.portal_user_id) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Borrower Portal</h3>
        </div>
        {data.stage && <Badge variant="outline" className="text-[10px]">{data.stage}</Badge>}
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Application progress</span>
          <span className="font-medium text-foreground">{data.completion_pct}%</span>
        </div>
        <Progress value={data.completion_pct} className="h-1.5" />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Last login: <span className="text-foreground">{rel(data.last_login_at)}</span></span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <FileCheck className="h-3.5 w-3.5" />
          <span>{data.documents_uploaded}/{data.documents_required} docs</span>
        </div>
        {data.invite_sent_at && (
          <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
            <Mail className="h-3.5 w-3.5" />
            <span>
              Invite sent {rel(data.invite_sent_at)}
              {data.invite_accepted_at ? ` · accepted ${rel(data.invite_accepted_at)}` : " · pending"}
            </span>
          </div>
        )}
      </div>

      {data.missing_items?.length > 0 && (
        <div className="rounded border border-amber-500/20 bg-amber-500/5 p-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
            <AlertCircle className="h-3.5 w-3.5" />
            Missing items ({data.missing_items.length})
          </div>
          <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc pl-4">
            {data.missing_items.slice(0, 5).map((m, i) => <li key={i}>{m}</li>)}
            {data.missing_items.length > 5 && (
              <li className="list-none italic">+{data.missing_items.length - 5} more</li>
            )}
          </ul>
        </div>
      )}
    </Card>
  );
}