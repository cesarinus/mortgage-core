import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar, Plus, Send, Edit, Trash2, Facebook, Instagram, Linkedin, Globe,
  TrendingUp, Users, MessageSquare, Settings, Bug, CheckCircle2, XCircle, MinusCircle, Loader2, Clock,
} from "lucide-react";
import { ContentCalendar } from "@/components/social-media/ContentCalendar";
import { PostGenerator } from "@/components/social-media/PostGenerator";
import { PostEditor } from "@/components/social-media/PostEditor";
import { ScheduleManager } from "@/components/social-media/ScheduleManager";
import { SocialAnalytics } from "@/components/social-media/SocialAnalytics";
import { SocialAccountSettings } from "@/components/social-media/SocialAccountSettings";

export type SocialPost = {
  id: string;
  post_type: string;
  platform: "facebook" | "instagram" | "linkedin" | "all";
  post_text: string;
  image_placeholder: string | null;
  image_url: string | null;
  cta_link: string | null;
  hashtags: string[] | null;
  scheduled_date: string;
  scheduled_time: string;
  status: "draft" | "scheduled" | "published" | "failed";
  leads_generated: number;
  engagement_clicks: number;
  created_at: string;
};

const platformIcon = (p: string) => {
  if (p === "facebook") return <Facebook className="h-4 w-4 text-primary" />;
  if (p === "instagram") return <Instagram className="h-4 w-4 text-primary" />;
  if (p === "linkedin") return <Linkedin className="h-4 w-4 text-primary" />;
  return <Globe className="h-4 w-4 text-muted-foreground" />;
};

const statusColor = (s: string) => {
  switch (s) {
    case "published": return "bg-primary text-primary-foreground";
    case "scheduled": return "bg-primary/20 text-primary";
    case "failed": return "bg-destructive text-destructive-foreground";
    default: return "bg-muted text-muted-foreground";
  }
};

export default function AdminSocialMedia() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("calendar");
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["social-media-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_media_posts")
        .select("*")
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true });
      if (error) throw error;
      return data as SocialPost[];
    },
  });

  const stats = posts.reduce(
    (acc, p) => {
      acc.total++;
      if (p.status === "published") acc.published++;
      if (p.status === "scheduled") acc.scheduled++;
      if (p.status === "draft") acc.draft++;
      acc.leads += p.leads_generated || 0;
      acc.clicks += p.engagement_clicks || 0;
      return acc;
    },
    { total: 0, published: 0, scheduled: 0, draft: 0, leads: 0, clicks: 0 },
  );

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("social_media_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-media-posts"] });
      toast.success("Post deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publishNow = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("publish-to-social", { body: { postId: id } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["social-media-posts"] });
      if (data?.success) toast.success("Published");
      else {
        const errs = Object.entries(data?.results || {})
          .filter(([_, v]: any) => !v.success)
          .map(([k, v]: any) => `${k}: ${v.error}`)
          .join(" • ");
        toast.error(errs || "Publish failed");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runDebug = async (id: string) => {
    setDebugOpen(true);
    setDebugLoading(true);
    setDebugResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("debug-social-post", { body: { postId: id } });
      if (error) throw error;
      setDebugResult(data);
    } catch (e: any) {
      setDebugResult({ error: e.message || "Debug failed" });
    } finally {
      setDebugLoading(false);
    }
  };

  const stepIcon = (s: string) => {
    if (s === "success") return <CheckCircle2 className="h-4 w-4 text-primary" />;
    if (s === "fail") return <XCircle className="h-4 w-4 text-destructive" />;
    return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <>
      <Helmet><title>Social Media | NexGen Capital CRM</title></Helmet>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Social Media</h1>
            <p className="text-muted-foreground">Generate, schedule, and publish posts to Facebook, Instagram, and LinkedIn.</p>
          </div>
          <Button onClick={() => setActiveTab("generate")} className="gap-2">
            <Plus className="h-4 w-4" />Generate Post
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">{stats.draft} drafts • {stats.scheduled} scheduled</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.published}</div>
              <p className="text-xs text-muted-foreground">Sent to social</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads Generated</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.leads}</div>
              <p className="text-xs text-muted-foreground">From social posts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clicks</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.clicks}</div>
              <p className="text-xs text-muted-foreground">CTA link clicks</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
            <TabsTrigger value="calendar"><Calendar className="mr-1 h-4 w-4" />Calendar</TabsTrigger>
            <TabsTrigger value="generate"><Plus className="mr-1 h-4 w-4" />Generate</TabsTrigger>
            <TabsTrigger value="posts"><MessageSquare className="mr-1 h-4 w-4" />All Posts</TabsTrigger>
            <TabsTrigger value="schedule"><Clock className="mr-1 h-4 w-4" />Schedule</TabsTrigger>
            <TabsTrigger value="analytics"><TrendingUp className="mr-1 h-4 w-4" />Analytics</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="mr-1 h-4 w-4" />Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-6">
            <ContentCalendar posts={posts} onPostClick={(p) => { setSelectedPost(p); setActiveTab("edit"); }} />
          </TabsContent>

          <TabsContent value="generate" className="mt-6">
            <PostGenerator onGenerated={() => { qc.invalidateQueries({ queryKey: ["social-media-posts"] }); setActiveTab("posts"); }} />
          </TabsContent>

          <TabsContent value="posts" className="mt-6">
            <Card>
              <CardHeader><CardTitle>All Posts</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : posts.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No posts yet.</p>
                ) : (
                  <div className="space-y-3">
                    {posts.map((post) => (
                      <div key={post.id} className="rounded-lg border p-4 transition hover:bg-muted/50">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              {platformIcon(post.platform)}
                              <Badge variant="outline" className="capitalize">{post.post_type.replace(/_/g, " ")}</Badge>
                              <Badge className={statusColor(post.status)}>{post.status}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(post.scheduled_date + "T12:00:00").toLocaleDateString()} {(post.scheduled_time || "").slice(0, 5)}
                              </span>
                            </div>
                            <p className="line-clamp-2 text-sm">{post.post_text}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button variant="ghost" size="icon" title="Debug" onClick={() => runDebug(post.id)}><Bug className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" title="Edit" onClick={() => { setSelectedPost(post); setActiveTab("edit"); }}><Edit className="h-4 w-4" /></Button>
                            {(post.status === "draft" || post.status === "scheduled") && (
                              <Button variant="ghost" size="icon" title="Publish now"
                                onClick={() => { if (confirm("Publish this post now?")) publishNow.mutate(post.id); }}>
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" title="Delete"
                              onClick={() => { if (confirm("Delete this post?")) deletePost.mutate(post.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="edit" className="mt-6">
            {selectedPost ? (
              <PostEditor post={selectedPost} onSaved={() => setActiveTab("posts")} />
            ) : (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Select a post to edit.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="schedule" className="mt-6"><ScheduleManager /></TabsContent>
          <TabsContent value="analytics" className="mt-6"><SocialAnalytics /></TabsContent>
          <TabsContent value="settings" className="mt-6"><SocialAccountSettings /></TabsContent>
        </Tabs>

        <Dialog open={debugOpen} onOpenChange={setDebugOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Pipeline Debug</DialogTitle></DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              {debugLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}
              {debugResult?.error && <p className="text-destructive">{debugResult.error}</p>}
              {debugResult?.steps && (
                <ol className="space-y-2">
                  {debugResult.steps.map((s: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 rounded border p-2 text-sm">
                      {stepIcon(s.status)}
                      <div className="flex-1">
                        <div className="font-medium">{s.step}</div>
                        {s.message && <div className="text-xs text-muted-foreground">{s.message}</div>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}