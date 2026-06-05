import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Props { leadId?: string; opportunityId?: string }

export default function EmailLogList({ leadId, opportunityId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      let q = supabase.from("email_logs")
        .select("id, recipient_email, subject, status, error_message, sent_at, template_alias")
        .order("sent_at", { ascending: false }).limit(100);
      if (leadId) q = q.eq("lead_id", leadId);
      if (opportunityId) q = q.eq("opportunity_id", opportunityId);
      const { data } = await q;
      setRows(data ?? []);
      setLoading(false);
    };
    load();
  }, [leadId, opportunityId]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No emails sent yet.</p>;

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="rounded-md border p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium truncate">{r.subject || "(no subject)"}</p>
              <p className="text-xs text-muted-foreground truncate">
                To {r.recipient_email}{r.template_alias ? ` · ${r.template_alias}` : ""}
              </p>
            </div>
            <Badge variant={r.status === "sent" ? "secondary" : r.status === "failed" ? "destructive" : "outline"}>
              {r.status}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{new Date(r.sent_at).toLocaleString()}</p>
          {r.error_message && <p className="mt-1 text-xs text-destructive">{r.error_message}</p>}
        </div>
      ))}
    </div>
  );
}