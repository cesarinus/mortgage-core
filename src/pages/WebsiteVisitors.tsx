import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";

export default function WebsiteVisitors() {
  const [rows, setRows] = useState<any[]>([]);
  const [leads, setLeads] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [onlyKnown, setOnlyKnown] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("website_visitors").select("*").order("last_seen_at", { ascending: false }).limit(200);
    if (onlyKnown) q = q.not("lead_id", "is", null);
    const { data } = await q;
    const list = data ?? [];
    const ids = [...new Set(list.map((r) => r.lead_id).filter(Boolean))] as string[];
    const map: Record<string, any> = {};
    if (ids.length) {
      const { data: l } = await supabase.from("leads").select("id, first_name, last_name").in("id", ids);
      (l ?? []).forEach((x) => (map[x.id] = x));
    }
    setRows(list);
    setLeads(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, [onlyKnown]);

  const activeCutoff = Date.now() - 30 * 60 * 1000;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-display font-bold">Website Visitors</h1>
          <p className="text-sm text-muted-foreground">Recent visitors to your websites. Known leads are named.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={onlyKnown ? "default" : "outline"} size="sm" onClick={() => setOnlyKnown((v) => !v)}>
            {onlyKnown ? "Showing known leads" : "Show only known leads"}
          </Button>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>
      {loading ? <Skeleton className="h-60 w-full" /> : rows.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">No visits recorded yet. Visits appear once the tracker is on your websites.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr className="text-left">
                <th className="p-3">Visitor</th><th className="p-3">Site</th><th className="p-3">Source</th>
                <th className="p-3 text-right">Visits</th><th className="p-3 text-right">Pages</th>
                <th className="p-3 text-right">Points</th><th className="p-3">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => {
                const lead = r.lead_id ? leads[r.lead_id] : null;
                const active = new Date(r.last_seen_at).getTime() > activeCutoff;
                return (
                  <tr key={r.id}>
                    <td className="p-3">
                      {lead ? (
                        <Link to={`/crm/leads/${lead.id}`} className="font-medium text-primary hover:underline">
                          {lead.first_name} {lead.last_name}
                        </Link>
                      ) : <span className="text-muted-foreground">Anonymous · {r.device ?? ""}</span>}
                      {active && <Badge className="ml-2" variant="secondary">On site now</Badge>}
                    </td>
                    <td className="p-3">{r.site ?? "—"}</td>
                    <td className="p-3">{[r.utm_source, r.utm_campaign].filter(Boolean).join(" / ") || (r.first_referrer ? new URL(r.first_referrer, "https://x").hostname : "Direct")}</td>
                    <td className="p-3 text-right">{r.visit_count}</td>
                    <td className="p-3 text-right">{r.pageview_count}</td>
                    <td className="p-3 text-right">{r.intent_score}</td>
                    <td className="p-3 whitespace-nowrap">{new Date(r.last_seen_at).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
