import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface LogRow {
  id: string;
  lead_id: string | null;
  event: string;
  status: string;
  error: string | null;
  retry_count: number;
  payload: any;
  response: any;
  created_at: string;
}

export default function LosIntegrationLogs() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<LogRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("los_integration_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data as LogRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const hay = `${r.event} ${r.status} ${r.error ?? ""} ${JSON.stringify(r.payload ?? {})}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const statusColor = (s: string) =>
    s === "sent" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    : s === "failed" ? "bg-destructive/15 text-destructive"
    : "bg-muted text-muted-foreground";

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">LOS Integration Logs</h1>
          <p className="text-muted-foreground">Every Send-to-LOS / Zapier call from this CRM. Last 200 events.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Search by event, status, error, or any payload field.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="rounded-md border border-border/60 divide-y divide-border/60">
            {filtered.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">No logs yet.</div>
            )}
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full text-left p-3 hover:bg-accent/40 flex items-center gap-3"
              >
                <Badge className={statusColor(r.status)}>{r.status}</Badge>
                <code className="text-xs">{r.event}</code>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(r.created_at), "PPp")}
                </span>
                {r.error && <span className="text-xs text-destructive truncate">{r.error}</span>}
                {r.lead_id && <span className="ml-auto text-[10px] font-mono text-muted-foreground">lead {r.lead_id.slice(0, 8)}</span>}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payload — {selected.event}</CardTitle>
            <CardDescription>{format(new Date(selected.created_at), "PPpp")}</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[500px]">
              {JSON.stringify(selected.payload, null, 2)}
            </pre>
            {selected.response && (
              <>
                <p className="text-sm font-medium mt-4 mb-1">Response</p>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[300px]">
                  {JSON.stringify(selected.response, null, 2)}
                </pre>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}