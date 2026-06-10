import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { loadMappings, type LosFieldMapping } from "@/lib/los/mappings";

interface Row { crm_field: string; external_field: string; required: boolean; nullPct: number; present: boolean; }

export default function SchemaGapReport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [missingCols, setMissingCols] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: leads, count }, mappings] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact" }).limit(1000),
        loadMappings("arive"),
      ]);
      const all = leads ?? [];
      setTotal(count ?? all.length);
      const sampleKeys = new Set(Object.keys(all[0] ?? {}));

      const out: Row[] = mappings.filter((m: LosFieldMapping) => m.active).map((m) => {
        const present = sampleKeys.has(m.crm_field);
        const nulls = present
          ? all.filter((r: any) => r[m.crm_field] === null || r[m.crm_field] === undefined || r[m.crm_field] === "").length
          : all.length;
        return {
          crm_field: m.crm_field, external_field: m.external_field, required: m.required,
          present, nullPct: all.length ? Math.round((nulls / all.length) * 100) : 0,
        };
      });
      setRows(out);
      setMissingCols(out.filter((r) => !r.present).map((r) => r.crm_field));
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center gap-2 p-6"><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</div>;

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lead Schema Gap Report</h1>
        <p className="text-muted-foreground text-sm">Coverage of mapped LOS fields against {total} lead records.</p>
      </div>

      {missingCols.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-amber-600">Recommended schema additions</CardTitle>
            <CardDescription>These mapped CRM fields don't exist as columns on `leads`. Add them via a future migration if you need to capture them in-app.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {missingCols.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Field coverage</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr><th className="py-1">CRM field</th><th>External</th><th>Required</th><th>Present</th><th>% empty</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.crm_field} className="border-t">
                  <td className="py-1 font-mono text-xs">{r.crm_field}</td>
                  <td className="font-mono text-xs">{r.external_field}</td>
                  <td>{r.required ? <Badge>required</Badge> : <span className="text-muted-foreground">optional</span>}</td>
                  <td>{r.present ? "✓" : <span className="text-destructive">missing column</span>}</td>
                  <td>
                    <Badge variant={r.nullPct > 70 ? "destructive" : r.nullPct > 30 ? "secondary" : "default"}>{r.nullPct}%</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}