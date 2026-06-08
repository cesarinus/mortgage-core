import { useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  feature: string;
  context?: Record<string, unknown>;
  profile?: string;
  className?: string;
  label?: string;
}

/**
 * Lightweight thumbs up/down widget for AI-generated content.
 * Submits to the `ai-feedback` edge function (service-role insert).
 */
export function AiFeedback({ feature, context, profile = "crm", className, label = "Was this helpful?" }: Props) {
  const [submitted, setSubmitted] = useState<null | "up" | "down">(null);
  const [thanks, setThanks] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async (rating: "up" | "down") => {
    if (busy || submitted) return;
    setBusy(true);
    try {
      await supabase.functions.invoke("ai-feedback", {
        body: {
          feature,
          profile,
          context: { ...(context ?? {}), route: typeof window !== "undefined" ? window.location.pathname : undefined },
          rating,
        },
      });
      setSubmitted(rating);
      setThanks(true);
      setTimeout(() => setThanks(false), 3000);
    } catch {
      // silent — keep buttons enabled for retry
      setBusy(false);
      return;
    }
    setBusy(false);
  };

  return (
    <div className={cn("flex items-center gap-2 text-[11px] text-muted-foreground", className)}>
      <span>{label}</span>
      <button
        type="button"
        aria-label="Helpful"
        disabled={busy || !!submitted}
        onClick={() => send("up")}
        className={cn(
          "inline-flex items-center justify-center h-6 w-6 rounded-md border border-border hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-default",
          submitted === "up" && "bg-[#F97316]/10 border-[#F97316] text-[#F97316]",
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Not helpful"
        disabled={busy || !!submitted}
        onClick={() => send("down")}
        className={cn(
          "inline-flex items-center justify-center h-6 w-6 rounded-md border border-border hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-default",
          submitted === "down" && "bg-muted border-foreground/30",
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
      {thanks && (
        <span className="inline-flex items-center gap-1 text-[#16a34a]">
          <Check className="h-3 w-3" /> thanks
        </span>
      )}
    </div>
  );
}