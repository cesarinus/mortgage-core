import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image as ImageIcon, Save, Send, Loader2 } from "lucide-react";
import type { SocialPost } from "@/pages/AdminSocialMedia";

interface Props { post: SocialPost; onSaved?: () => void; }

export function PostEditor({ post, onSaved }: Props) {
  const qc = useQueryClient();
  const [postText, setPostText] = useState(post.post_text);
  const [hashtags, setHashtags] = useState((post.hashtags || []).join(" "));
  const [imageUrl, setImageUrl] = useState(post.image_url || "");
  const [imagePrompt, setImagePrompt] = useState(post.image_placeholder || "");
  const [ctaLink, setCtaLink] = useState(post.cta_link || "");
  const [platform, setPlatform] = useState(post.platform);
  const [scheduledDate, setScheduledDate] = useState(post.scheduled_date);
  const [scheduledTime, setScheduledTime] = useState((post.scheduled_time || "10:00:00").slice(0, 5));
  const [status, setStatus] = useState(post.status);

  useEffect(() => {
    setPostText(post.post_text);
    setHashtags((post.hashtags || []).join(" "));
    setImageUrl(post.image_url || "");
    setImagePrompt(post.image_placeholder || "");
    setCtaLink(post.cta_link || "");
    setPlatform(post.platform);
    setScheduledDate(post.scheduled_date);
    setScheduledTime((post.scheduled_time || "10:00:00").slice(0, 5));
    setStatus(post.status);
  }, [post]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("social_media_posts")
        .update({
          post_text: postText,
          hashtags: hashtags.split(/\s+/).filter(Boolean).map(h => h.startsWith("#") ? h : "#" + h),
          image_url: imageUrl || null,
          image_placeholder: imagePrompt || null,
          cta_link: ctaLink || null,
          platform: platform as any,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime + ":00",
          status: status as any,
        })
        .eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-media-posts"] });
      toast.success("Post saved");
      onSaved?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const imageMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-social-image", {
        body: { prompt: imagePrompt || postText.slice(0, 120), postId: post.id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Image generation failed");
      return data.image_url as string;
    },
    onSuccess: (url) => {
      setImageUrl(url);
      qc.invalidateQueries({ queryKey: ["social-media-posts"] });
      toast.success("Image generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("publish-to-social", {
        body: { postId: post.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["social-media-posts"] });
      if (data?.success) toast.success("Published!");
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Post</CardTitle>
        <CardDescription>Refine copy, generate visuals, and publish.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Post Text</Label>
              <Textarea rows={6} value={postText} onChange={(e) => setPostText(e.target.value)} />
              <p className="text-xs text-muted-foreground">{postText.length} chars</p>
            </div>
            <div className="space-y-2">
              <Label>Hashtags (space-separated)</Label>
              <Input value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>CTA Link</Label>
              <Input value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Image Prompt</Label>
              <Textarea rows={3} value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} placeholder="Describe the visual…" />
              <Button variant="outline" onClick={() => imageMutation.mutate()} disabled={imageMutation.isPending} className="w-full">
                {imageMutation.isPending
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
                  : <><ImageIcon className="mr-2 h-4 w-4" />Generate AI Image</>}
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
              {imageUrl && (
                <div className="overflow-hidden rounded-lg border">
                  <img src={imageUrl} alt="Preview" className="aspect-square w-full object-cover" />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex-1">
            <Save className="mr-2 h-4 w-4" />Save Changes
          </Button>
          <Button
            variant="default"
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending}
            className="flex-1"
          >
            {publishMutation.isPending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publishing…</>
              : <><Send className="mr-2 h-4 w-4" />Publish Now</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}