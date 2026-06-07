import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Brain, Info, RefreshCw, Sparkles } from "lucide-react";

export type IncomeAnalysis = {
  trend: "stable" | "increasing" | "decreasing" | "volatile" | "unknown" | string;
  summary: string;
  highlights: string[];
  suggestions: string[];
  risk_flags: string[];
};

interface Props {
  leadId?: string;
  /** "admin" shows everything incl. risk flags. "borrower" hides risks and softens suggestions. */
  audience?: "admin" | "borrower";
  /** Bump to force refetch (e.g. after Save/Calculate). */
  refreshKey?: number | string;
}

const TREND_STYLE: Record<string, string> = {
  stable: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  increasing: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  decreasing: "border-orange-500/40 bg-orange-500/10 text-orange-400",
  volatile: "border-red-500/40 bg-red-500/10 text-red-400",
  unknown: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
};

function softenForBorrower(s: string): string {
  // Light rewording — strip "request"/"verify" loan-officer phrasing, keep tone friendly.
  return s
    .replace(/^request\b/i, "consider providing")
    .replace(/\bborrower\b/gi, "you")
    .replace(/loan officer/gi, "your loan team");
}

export function IncomeAiAnalysis({ leadId, audience = "admin", refreshKey }: Props) {
  const [data, setData] = useState<IncomeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (force = false) => {
    if (!leadId) return;
    setLoading(true); setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke("income-analysis", {
        body: { lead_id: leadId, force },
      });
      if (err) throw err;
      setData(res as IncomeAnalysis);
    } catch (e: any) {
      setError(e?.message ?? "Analysis temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { run(false); }, [run, refreshKey]);

  if (!leadId) return null;

  const isBorrower = audience === "borrower";
  const trend = (data?.trend ?? "unknown").toLowerCase();
  const trendCls = TREND_STYLE[trend] ?? TREND_STYLE.unknown;

  return (
    <Card className={isBorrower ? "" : "bg-card border-border"}>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {isBorrower ? <Sparkles className="h-4 w-4 text-[#F97316]" /> : <Brain className="h-4 w-4 text-[#F97316]" />}
            AI Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            {data && (
              <Badge variant="outline" className={`text-[10px] capitalize ${trendCls}`}>
                {trend}
              </Badge>
            )}
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => run(true)} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="ml-1 text-xs">refresh analysis</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && !data ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        ) : error ? (
          <p className="text-xs text-muted-foreground">Analysis temporarily unavailable.</p>
        ) : data ? (
          <>
            <p className="text-sm font-semibold leading-snug">{data.summary}</p>

            {data.highlights.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">highlights</div>
                <ul className="space-y-1">
                  {data.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <Info className="h-3.5 w-3.5 mt-0.5 text-[#F97316] shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.suggestions.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {isBorrower ? "tips" : "suggestions"}
                </div>
                <ol className="space-y-1">
                  {data.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-[#F97316] font-semibold tabular-nums">{i + 1}.</span>
                      <span>{isBorrower ? softenForBorrower(s) : s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {!isBorrower && data.risk_flags.length > 0 && (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-red-400 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> risk flags
                </div>
                <ul className="space-y-0.5 text-xs text-red-300">
                  {data.risk_flags.map((r, i) => <li key={i}>• {r}</li>)}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">No analysis yet.</p>
        )}
      </CardContent>
    </Card>
  );
}