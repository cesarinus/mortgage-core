import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Facebook, Instagram, Linkedin, Globe, Loader2, RefreshCw, Edit, Trash2, Send, Calendar as CalIcon, Search,
} from "lucide-react";

type SocialPost = {
  id: string;
  platform: string;
  caption: string;
  hashtags: string[] | null;
  media_type: string;
  status: string;
  scheduled_for: string | null;
  published_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

const platformBadge = (p: string) => {
  const base = "gap-1 capitalize";
  if (p === "facebook") return <Badge className={`${base} bg-[#1877F2] text-white hover:bg-[#1877F2]/90`}><Facebook className="h-3 w-3" />Facebook</Badge>;
  if (p === "instagram") return <Badge className={`${base} bg-[#E4405F] text-white hover:bg-[#E4405F]/90`}><Instagram className="h-3 w-3" />Instagram</Badge>;
  if (p === "linkedin") return <Badge className={`${base} bg-[#0A66C2] text-white hover:bg-[#0A66C2]/90`}><Linkedin className="h-3 w-3" />LinkedIn</Badge>;
  return <Badge className={`${base}`} variant="outline"><Globe className="h-3 w-3" />{p}</Badge>;
};

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    approved: "bg-primary/15 text-primary",
    queued: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    published: "bg-green-500/15 text-green-700 dark:text-green-300",
    failed: "bg-destructive/15 text-destructive",
    draft: "bg-muted text-muted-foreground",
  };
  return <Badge className={`capitalize ${map[s] ?? "bg-muted text-muted-foreground"}`}>{s}</Badge>;
};

export default function SocialQueue() {
  const qc = useQueryClient();
  const [platform, setPlatform] = useState<string>("all");
  const [status, setStatus] = useState<string>("approved");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<SocialPost | null>(null);
  const [editForm, setEditForm] = useState({ caption: "", hashtags: "", platform: "facebook", scheduled_for: "" });

  const { data: posts = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["social-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_posts" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SocialPost[];
    },
    refetchInterval: 30_000,
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SocialPost> }) => {
      const { error } = await supabase.from("social_posts" as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-queue"] });
      toast.success("Post updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("social_posts" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-queue"] });
      toast.success("Post deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = posts.filter((p) => {
    if (platform !== "all" && p.platform !== platform) return false;
    if (status !== "all" && p.status !== status) return false;
    if (search && !p.caption.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openEdit = (p: SocialPost) => {
    setEditing(p);
    setEditForm({
      caption: p.caption,
      hashtags: (p.hashtags ?? []).join(" "),
      platform: p.platform,
      scheduled_for: p.scheduled_for ? new Date(p.scheduled_for).toISOString().slice(0, 16) : "",
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    const tags = editForm.hashtags
      .split(/[\s,]+/)
      .map((t) => t.replace(/^#/, "").trim())
      .filter(Boolean);
    const patch: Partial<SocialPost> = {
      caption: editForm.caption,
      hashtags: tags,
      platform: editForm.platform,
    };
    if (editForm.scheduled_for) {
      patch.scheduled_for = new Date(editForm.scheduled_for).toISOString();
      patch.status = "queued";
    }
    updatePost.mutate({ id: editing.id, patch });
    setEditing(null);
  };

  const markPublished = (p: SocialPost) =>
    updatePost.mutate({ id: p.id, patch: { status: "published", published_at: new Date().toISOString() } });

  const markQueued = (p: SocialPost) =>
    updatePost.mutate({ id: p.id, patch: { status: "queued" } });

  return (
    <>
      <Helmet><title>Social Queue | NexGen Capital CRM</title></Helmet>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Social Queue</h1>
            <p className="text-muted-foreground">Review and schedule approved social posts</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Platform" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search captions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <span className="text-sm text-muted-foreground">{filtered.length} post{filtered.length === 1 ? "" : "s"}</span>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No posts match your filters.</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => {
              const isExpanded = expanded[p.id];
              const preview = p.caption.length > 100 && !isExpanded ? p.caption.slice(0, 100) + "…" : p.caption;
              return (
                <Card key={p.id} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {platformBadge(p.platform)}
                      {statusBadge(p.status)}
                      <Badge variant="outline" className="capitalize">{p.media_type}</Badge>
                    </div>

                    <p className="whitespace-pre-wrap text-sm">{preview}</p>
                    {p.caption.length > 100 && (
                      <button
                        className="self-start text-xs text-primary hover:underline"
                        onClick={() => setExpanded((s) => ({ ...s, [p.id]: !s[p.id] }))}
                      >
                        {isExpanded ? "Show less" : "Show more"}
                      </button>
                    )}

                    {p.hashtags && p.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.hashtags.map((t) => (
                          <span key={t} className="text-xs text-primary">#{t}</span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto space-y-1 border-t pt-3 text-xs text-muted-foreground">
                      {p.approved_at && (
                        <div>Approved {new Date(p.approved_at).toLocaleString()}</div>
                      )}
                      {p.scheduled_for && (
                        <div className="flex items-center gap-1"><CalIcon className="h-3 w-3" />Scheduled {new Date(p.scheduled_for).toLocaleString()}</div>
                      )}
                      {p.published_at && (
                        <div>Published {new Date(p.published_at).toLocaleString()}</div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 pt-2">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(p)}>
                        <Edit className="h-3 w-3" />Edit
                      </Button>
                      {p.status !== "queued" && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => markQueued(p)}>
                          <CalIcon className="h-3 w-3" />Queue
                        </Button>
                      )}
                      {p.status !== "published" && (
                        <Button size="sm" className="gap-1" onClick={() => markPublished(p)}>
                          <Send className="h-3 w-3" />Publish
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("Delete this post?")) deletePost.mutate(p.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Edit post</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Platform</label>
                <Select value={editForm.platform} onValueChange={(v) => setEditForm((f) => ({ ...f, platform: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Caption</label>
                <Textarea
                  rows={5}
                  value={editForm.caption}
                  onChange={(e) => setEditForm((f) => ({ ...f, caption: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Hashtags (space or comma separated)</label>
                <Input
                  value={editForm.hashtags}
                  onChange={(e) => setEditForm((f) => ({ ...f, hashtags: e.target.value }))}
                  placeholder="mortgage homebuyer firsttime"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Schedule for</label>
                <Input
                  type="datetime-local"
                  value={editForm.scheduled_for}
                  onChange={(e) => setEditForm((f) => ({ ...f, scheduled_for: e.target.value }))}
                />
                <p className="mt-1 text-xs text-muted-foreground">Setting a schedule will mark this post as Queued.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveEdit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}