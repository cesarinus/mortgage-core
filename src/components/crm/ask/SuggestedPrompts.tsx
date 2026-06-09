import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchTopToolCalls } from "@/lib/crm/askInteractions";

const PROMPTS: { text: string; tool?: string; bucket?: "morning" | "afternoon" | "evening" }[] = [
  { text: "Give me my morning brief", tool: "get_morning_brief", bucket: "morning" },
  { text: "Show leads that need attention", tool: "query_leads" },
  { text: "Which leads are stuck?", tool: "query_leads" },
  { text: "Top 5 high-score leads this week", tool: "query_leads" },
  { text: "Who hasn't been contacted in 7 days?", tool: "query_leads" },
  { text: "What tasks are due today?", tool: "query_tasks", bucket: "morning" },
  { text: "Show overdue tasks", tool: "query_tasks" },
  { text: "What's in my pipeline at Underwriting?", tool: "query_pipeline" },
  { text: "Pipeline stuck at Docs Received", tool: "query_pipeline" },
  { text: "Deals closing this month", tool: "query_deals", bucket: "afternoon" },
  { text: "Wrap-up: what moved today?", tool: "get_morning_brief", bucket: "evening" },
  { text: "Find contacts at Wells Fargo", tool: "query_contacts" },
];

function timeBucket(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export function SuggestedPrompts({ onPick }: { onPick: (text: string) => void }) {
  const { user } = useAuth();
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchTopToolCalls(user.id).then(setOrder).catch(() => setOrder([]));
  }, [user?.id]);

  const bucket = timeBucket();
  const ranked = [...PROMPTS]
    .map((p) => {
      let score = 0;
      if (p.bucket === bucket) score += 10;
      const idx = p.tool ? order.indexOf(p.tool) : -1;
      if (idx >= 0) score += 5 - idx;
      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {ranked.map((p) => (
        <Button
          key={p.text}
          variant="outline"
          size="sm"
          className="rounded-full text-xs font-normal hover:bg-primary/10 hover:border-primary/40 hover:text-foreground"
          onClick={() => onPick(p.text)}
        >
          {p.text}
        </Button>
      ))}
    </div>
  );
}