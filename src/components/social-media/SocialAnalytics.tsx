import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Facebook, Instagram, Linkedin, TrendingUp, Eye } from "lucide-react";

export function SocialAnalytics() {
  const { data } = useQuery({
    queryKey: ["social-analytics-summary"],
    queryFn: async () => {
      const { data: posts } = await supabase.from("social_media_posts").select("platform, status, leads_generated, engagement_clicks");
      const summary = { facebook: 0, instagram: 0, linkedin: 0, all: 0 };
      const leads = { facebook: 0, instagram: 0, linkedin: 0, all: 0 };
      const clicks = { facebook: 0, instagram: 0, linkedin: 0, all: 0 };
      (posts || []).filter(p => p.status === "published").forEach((p: any) => {
        const k = (p.platform as keyof typeof summary);
        summary[k] = (summary[k] || 0) + 1;
        leads[k] = (leads[k] || 0) + (p.leads_generated || 0);
        clicks[k] = (clicks[k] || 0) + (p.engagement_clicks || 0);
      });
      return { summary, leads, clicks };
    },
  });

  const rows = [
    { key: "facebook", label: "Facebook", Icon: Facebook },
    { key: "instagram", label: "Instagram", Icon: Instagram },
    { key: "linkedin", label: "LinkedIn", Icon: Linkedin },
    { key: "all", label: "Cross-platform", Icon: TrendingUp },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance by Platform</CardTitle>
        <CardDescription>Aggregated metrics for published posts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {rows.map(({ key, label, Icon }) => (
            <div key={key} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                <h4 className="font-medium">{label}</h4>
              </div>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Posts</dt><dd className="font-semibold">{data?.summary[key] ?? 0}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" />Clicks</dt><dd className="font-semibold">{data?.clicks[key] ?? 0}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Leads</dt><dd className="font-semibold text-primary">{data?.leads[key] ?? 0}</dd></div>
              </dl>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}