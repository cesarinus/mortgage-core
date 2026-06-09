import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Trash2, Eye, Pencil, BarChart3, Send } from "lucide-react";
import { Link } from "react-router-dom";
import BlogOptimization from "@/components/blog/BlogOptimization";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

const CATEGORIES = [
  "Real Estate",
  "Mortgage",
  "Credit",
  "Business",
  "AI & Technology",
  "Market Trends",
  "First-Time Buyers",
  "Investment",
];

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  status: string;
  created_at: string;
}

const BlogAdmin = () => {
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("Mortgage");
  const [publishStatus, setPublishStatus] = useState<"draft" | "published">("draft");
  const [generating, setGenerating] = useState(false);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select("id, title, slug, category, status, created_at")
      .order("created_at", { ascending: false });
    if (data) setPosts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: "Enter a topic", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-post", {
        body: { topic, category, status: publishStatus },
      });
      if (error) throw error;
      const result: any = data;
      if (result?.error) throw new Error(result.error);
      toast({ title: "Blog post generated!", description: result?.post?.title ?? "Saved" });
      setTopic("");
      fetchPosts();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Post deleted" });
      fetchPosts();
    }
  };

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("blog_posts")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Post ${newStatus}` });
      fetchPosts();
    }
  };

  const handleDistribute = async (post: BlogPost) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in", variant: "destructive" });
        return;
      }
      const { data, error } = await supabase.functions.invoke("admin-trigger-ping", {
        body: { postId: post.id, type: "update" },
      });
      if (error) throw error;
      const r = (data as any)?.results || {};
      toast({
        title: "Distribution triggered",
        description: `Pingomatic: ${(r.pingomatic as any)?.ok ? "✓" : "✗"} • Webhook: ${(r.webhook as any)?.ok ? "✓" : (r.webhook as any)?.skipped ? "skipped" : "✗"} • Social draft: ${(r.socialDraft as any)?.id ? "queued" : "skipped"}`,
      });
    } catch (e: any) {
      toast({ title: "Distribute failed", description: e.message, variant: "destructive" });
    }
  };

  const openEdit = async (id: string) => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) {
      toast({ title: "Could not load post", description: error?.message, variant: "destructive" });
      return;
    }
    setEditing(data);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("blog_posts")
      .update({
        title: editing.title,
        slug: editing.slug,
        excerpt: editing.excerpt,
        content_html: editing.content_html,
        category: editing.category,
        tags: editing.tags,
        meta_title: editing.meta_title,
        meta_description: editing.meta_description,
        featured_image: editing.featured_image,
        status: editing.status,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Post saved" });
    setEditing(null);
    fetchPosts();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Blog Manager</h1>
        <p className="text-muted-foreground">Generate AI-powered blog content</p>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList>
          <TabsTrigger value="content">Blog Content</TabsTrigger>
          <TabsTrigger value="optimization" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Optimization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="optimization" className="mt-6">
          <BlogOptimization />
        </TabsContent>

        <TabsContent value="content" className="mt-6 space-y-8">


      {/* Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Content Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              placeholder="e.g. First-time home buyer tips in Naples FL"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={publishStatus}
                onValueChange={(v) => setPublishStatus(v as "draft" | "published")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Publish Immediately</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={generating} className="btn-shadow">
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Post
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Post list */}
      <Card>
        <CardHeader>
          <CardTitle>All Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : posts.length === 0 ? (
            <p className="text-muted-foreground">No posts yet. Generate your first one above!</p>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-foreground">{post.title}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge
                        variant={post.status === "published" ? "default" : "secondary"}
                      >
                        {post.status}
                      </Badge>
                      {post.category && (
                        <Badge variant="outline" className="text-xs">
                          {post.category}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(post.id)}
                      title="Edit post"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleStatus(post.id, post.status)}
                      title={post.status === "published" ? "Unpublish" : "Publish"}
                      className="text-xs"
                    >
                      {post.status === "published" ? "Unpublish" : "Publish"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDistribute(post)}
                      title={
                        post.status === "published"
                          ? "Distribute (ping + webhook + social draft)"
                          : "Distribute draft preview"
                      }
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link
                        to={`/blog/${post.slug}${post.status !== "published" ? "?preview=1" : ""}`}
                        target="_blank"
                        title={post.status === "published" ? "View" : "Preview draft"}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(post.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Sheet */}
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit blog post</SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="mt-4 space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={editing.slug ?? ""}
                    onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={editing.category ?? "Mortgage"}
                    onValueChange={(v) => setEditing({ ...editing, category: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Excerpt</Label>
                <Textarea
                  rows={2}
                  value={editing.excerpt ?? ""}
                  onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                />
              </div>
              <div>
                <Label>Featured image URL</Label>
                <Input
                  value={editing.featured_image ?? ""}
                  onChange={(e) => setEditing({ ...editing, featured_image: e.target.value })}
                />
              </div>
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={Array.isArray(editing.tags) ? editing.tags.join(", ") : ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
              <div>
                <Label>Meta title</Label>
                <Input
                  value={editing.meta_title ?? ""}
                  onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })}
                />
              </div>
              <div>
                <Label>Meta description</Label>
                <Textarea
                  rows={2}
                  value={editing.meta_description ?? ""}
                  onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })}
                />
              </div>
              <div>
                <Label>Content (HTML)</Label>
                <Textarea
                  rows={18}
                  className="font-mono text-xs"
                  value={editing.content_html ?? ""}
                  onChange={(e) => setEditing({ ...editing, content_html: e.target.value })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={editing.status ?? "draft"}
                  onValueChange={(v) => setEditing({ ...editing, status: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={saveEdit} disabled={saving} className="flex-1">
                  {saving ? "Saving..." : "Save changes"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default BlogAdmin;
