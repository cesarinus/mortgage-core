import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";

const POST_TYPES = [
  { value: "featured_business", label: "Featured Spotlight" },
  { value: "local_tips", label: "Local Tips" },
  { value: "ai_tools", label: "Rate / Market Update" },
  { value: "success_stories", label: "Client Success Story" },
  { value: "events_promotions", label: "Promotion / Event" },
  { value: "community_highlight", label: "Community Highlight" },
  { value: "summary_reminder", label: "Weekly Recap" },
];

const PLATFORMS = [
  { value: "all", label: "All (Facebook + Instagram + LinkedIn)" },
  { value: "facebook", label: "Facebook only" },
  { value: "instagram", label: "Instagram only" },
  { value: "linkedin", label: "LinkedIn only" },
];

interface Props {
  onGenerated?: () => void;
}

export function PostGenerator({ onGenerated }: Props) {
  const [postType, setPostType] = useState("local_tips");
  const [platform, setPlatform] = useState("all");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [customPrompt, setCustomPrompt] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-social-content", {
        body: {
          post_type: postType,
          platform,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime + ":00",
          custom_prompt: customPrompt || undefined,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Generation failed");
      return data.post;
    },
    onSuccess: () => {
      toast.success("Draft post generated");
      setCustomPrompt("");
      onGenerated?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Post Generator
        </CardTitle>
        <CardDescription>Create on-brand social posts in seconds</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Post Type</Label>
            <Select value={postType} onValueChange={setPostType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {POST_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Scheduled Date</Label>
            <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Scheduled Time</Label>
            <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Custom Prompt (optional)</Label>
          <Textarea
            placeholder="Add specific guidance for the AI, or leave blank to use the default for this post type."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={3}
          />
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full">
          {mutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Draft</>}
        </Button>
      </CardContent>
    </Card>
  );
}