import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Facebook, Instagram, Linkedin, Globe } from "lucide-react";
import type { SocialPost } from "@/pages/AdminSocialMedia";

interface Props { posts: SocialPost[]; onPostClick: (p: SocialPost) => void; }

const platformIcon = (p: string) => {
  if (p === "facebook") return <Facebook className="h-3 w-3" />;
  if (p === "instagram") return <Instagram className="h-3 w-3" />;
  if (p === "linkedin") return <Linkedin className="h-3 w-3" />;
  return <Globe className="h-3 w-3" />;
};

const statusColor = (s: string) => {
  switch (s) {
    case "published": return "bg-primary text-primary-foreground";
    case "scheduled": return "bg-primary/20 text-primary";
    case "failed": return "bg-destructive/20 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
};

export function ContentCalendar({ posts, onPostClick }: Props) {
  // Group by date
  const grouped = posts.reduce<Record<string, SocialPost[]>>((acc, p) => {
    (acc[p.scheduled_date] ||= []).push(p);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Calendar</CardTitle>
        <CardDescription>Upcoming and recent posts grouped by date</CardDescription>
      </CardHeader>
      <CardContent>
        {dates.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No posts yet. Generate one to get started.</p>
        ) : (
          <div className="space-y-6">
            {dates.map((d) => (
              <div key={d}>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                  {new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                </h3>
                <div className="space-y-2">
                  {grouped[d].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onPostClick(p)}
                      className="flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition hover:bg-muted/50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                        {platformIcon(p.platform)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{p.post_type.replace(/_/g, " ")}</Badge>
                          <Badge className={`text-xs ${statusColor(p.status)}`}>{p.status}</Badge>
                          <span className="text-xs text-muted-foreground">{(p.scheduled_time || "").slice(0, 5)}</span>
                        </div>
                        <p className="line-clamp-2 text-sm">{p.post_text}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}