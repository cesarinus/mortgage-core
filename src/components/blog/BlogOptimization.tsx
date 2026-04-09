import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Eye, MousePointer, UserCheck, Zap } from "lucide-react";

interface VariantResult {
  cta_position: string;
  cta_text: string;
  sidebar_module: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversion_rate: number;
}

interface OptimizeResponse {
  status: string;
  message?: string;
  results?: VariantResult[];
  recommendations?: {
    best_performing: VariantResult | null;
    worst_performing: VariantResult | null;
    deprioritize: VariantResult[];
    boost: VariantResult[];
  };
}

interface PostMetric {
  post_id: string;
  title: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

const BlogOptimization = () => {
  const [data, setData] = useState<OptimizeResponse | null>(null);
  const [postMetrics, setPostMetrics] = useState<PostMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollData, setScrollData] = useState<{ range: string; count: number }[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Fetch variant optimization data
    const { data: session } = await supabase.auth.getSession();
    if (session?.session) {
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/optimize-variants`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );
        const result = await resp.json();
        setData(result);
      } catch {}
    }

    // Fetch per-post metrics
    const { data: metrics } = await supabase
      .from("blog_variant_metrics")
      .select("post_id, event_type");

    const { data: posts } = await supabase
      .from("blog_posts")
      .select("id, title")
      .eq("status", "published");

    if (metrics && posts) {
      const postMap: Record<string, PostMetric> = {};
      const titleMap = Object.fromEntries(posts.map((p) => [p.id, p.title]));

      for (const m of metrics) {
        if (!m.post_id) continue;
        if (!postMap[m.post_id]) {
          postMap[m.post_id] = {
            post_id: m.post_id,
            title: titleMap[m.post_id] || "Unknown",
            impressions: 0,
            clicks: 0,
            conversions: 0,
            ctr: 0,
          };
        }
        if (m.event_type === "impression") postMap[m.post_id].impressions++;
        if (m.event_type === "click") postMap[m.post_id].clicks++;
        if (m.event_type === "conversion") postMap[m.post_id].conversions++;
      }

      const postList = Object.values(postMap).map((p) => ({
        ...p,
        ctr: p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0,
      }));
      postList.sort((a, b) => b.conversions - a.conversions);
      setPostMetrics(postList);
    }

    // Fetch scroll depth distribution
    const { data: events } = await supabase
      .from("blog_events")
      .select("event_type")
      .in("event_type", ["page_view", "scroll_50", "scroll_90"]);

    if (events) {
      const counts = { "0-50%": 0, "50-90%": 0, "90-100%": 0 };
      const pageViews = events.filter((e) => e.event_type === "page_view").length;
      const scroll50 = events.filter((e) => e.event_type === "scroll_50").length;
      const scroll90 = events.filter((e) => e.event_type === "scroll_90").length;
      counts["0-50%"] = Math.max(0, pageViews - scroll50);
      counts["50-90%"] = Math.max(0, scroll50 - scroll90);
      counts["90-100%"] = scroll90;
      setScrollData(Object.entries(counts).map(([range, count]) => ({ range, count })));
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  const results = data?.results || [];
  const recs = data?.recommendations;
  const totalImpressions = results.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = results.reduce((s, r) => s + r.clicks, 0);
  const totalConversions = results.reduce((s, r) => s + r.conversions, 0);
  const overallCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Blog Optimization</h2>
        <p className="text-sm text-muted-foreground">A/B test performance and engagement analytics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2"><Eye className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalImpressions.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Impressions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2"><MousePointer className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalClicks.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">CTA Clicks</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2"><UserCheck className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalConversions}</p>
              <p className="text-xs text-muted-foreground">Conversions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2"><Zap className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{overallCTR.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Overall CTR</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best & Worst Performing */}
      {recs && (
        <div className="grid gap-4 md:grid-cols-2">
          {recs.best_performing && (
            <Card className="border-green-200 dark:border-green-900">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-600" /> Top Performing Variant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{recs.best_performing.cta_position}</Badge>
                  <Badge variant="outline">{recs.best_performing.cta_text}</Badge>
                  <Badge variant="outline">{recs.best_performing.sidebar_module}</Badge>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>CTR: <strong className="text-foreground">{recs.best_performing.ctr.toFixed(1)}%</strong></span>
                  <span>Conv: <strong className="text-foreground">{recs.best_performing.conversion_rate.toFixed(1)}%</strong></span>
                </div>
              </CardContent>
            </Card>
          )}
          {recs.worst_performing && results.length > 1 && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingDown className="h-4 w-4 text-red-500" /> Lowest Performing Variant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{recs.worst_performing.cta_position}</Badge>
                  <Badge variant="outline">{recs.worst_performing.cta_text}</Badge>
                  <Badge variant="outline">{recs.worst_performing.sidebar_module}</Badge>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>CTR: <strong className="text-foreground">{recs.worst_performing.ctr.toFixed(1)}%</strong></span>
                  <span>Conv: <strong className="text-foreground">{recs.worst_performing.conversion_rate.toFixed(1)}%</strong></span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Variant Performance Table */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Variant Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Position</th>
                    <th className="pb-2 pr-4">CTA Text</th>
                    <th className="pb-2 pr-4">Module</th>
                    <th className="pb-2 pr-4 text-right">Impressions</th>
                    <th className="pb-2 pr-4 text-right">Clicks</th>
                    <th className="pb-2 pr-4 text-right">Conv.</th>
                    <th className="pb-2 pr-4 text-right">CTR</th>
                    <th className="pb-2 text-right">Conv Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 pr-4"><Badge variant="secondary" className="text-xs">{r.cta_position}</Badge></td>
                      <td className="py-2 pr-4 text-foreground">{r.cta_text}</td>
                      <td className="py-2 pr-4"><Badge variant="outline" className="text-xs">{r.sidebar_module}</Badge></td>
                      <td className="py-2 pr-4 text-right text-foreground">{r.impressions}</td>
                      <td className="py-2 pr-4 text-right text-foreground">{r.clicks}</td>
                      <td className="py-2 pr-4 text-right text-foreground">{r.conversions}</td>
                      <td className="py-2 pr-4 text-right font-medium text-foreground">{r.ctr.toFixed(1)}%</td>
                      <td className="py-2 text-right font-medium text-foreground">{r.conversion_rate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Scroll Depth Distribution */}
        {scrollData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Scroll Depth Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={scrollData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="range" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* CTA Position Performance */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">CTR by Position</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={(() => {
                    const posMap: Record<string, { clicks: number; impressions: number }> = {};
                    for (const r of results) {
                      if (!posMap[r.cta_position]) posMap[r.cta_position] = { clicks: 0, impressions: 0 };
                      posMap[r.cta_position].clicks += r.clicks;
                      posMap[r.cta_position].impressions += r.impressions;
                    }
                    return Object.entries(posMap).map(([pos, d]) => ({
                      position: pos,
                      ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
                    }));
                  })()}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="position" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="ctr" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="CTR %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Per-Post Conversion */}
      {postMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Conversion Rate per Post</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {postMetrics.slice(0, 10).map((p) => (
                <div key={p.post_id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <p className="min-w-0 flex-1 truncate text-sm text-foreground">{p.title}</p>
                  <div className="ml-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{p.impressions} views</span>
                    <span>{p.clicks} clicks</span>
                    <span className="font-semibold text-foreground">{p.conversions} conv</span>
                    <Badge variant={p.ctr > 5 ? "default" : "secondary"} className="text-xs">
                      {p.ctr.toFixed(1)}% CTR
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data?.status === "insufficient_data" && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Not enough data yet. The system needs at least 50 events to start optimizing. Current layout defaults are being used.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BlogOptimization;
