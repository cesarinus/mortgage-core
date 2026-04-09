import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import ApplicationHub from "@/components/landing/ApplicationHub";
import { EmailContactSheet } from "@/components/landing/EmailContactSheet";
import { getScore } from "@/hooks/useBlogTracking";

interface BlogCTAProps {
  onCTAClick?: (ctaName: string) => void;
}

const BlogCTA = ({ onCTAClick }: BlogCTAProps) => {
  const [hubOpen, setHubOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [autoTriggered, setAutoTriggered] = useState(false);

  // Poll score every 5s to react to changes
  useEffect(() => {
    const interval = setInterval(() => {
      setScore(getScore());
    }, 5000);
    setScore(getScore());
    return () => clearInterval(interval);
  }, []);

  // Auto-trigger expert modal at score > 80
  useEffect(() => {
    if (score > 80 && !autoTriggered) {
      setAutoTriggered(true);
      setContactOpen(true);
    }
  }, [score, autoTriggered]);

  const isHighIntent = score > 60;

  return (
    <>
      <div
        className={`rounded-2xl border p-6 text-center transition-all ${
          isHighIntent
            ? "border-primary bg-gradient-to-br from-primary/10 to-accent/20 shadow-lg"
            : "border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10"
        }`}
      >
        {isHighIntent && (
          <div className="mb-2 flex items-center justify-center gap-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3 w-3" />
            Personalized for You
          </div>
        )}
        <h3 className="font-display text-lg font-bold text-foreground sm:text-xl">
          {isHighIntent
            ? "You're Ready — Let's Make It Happen!"
            : "Ready to Take the Next Step?"}
        </h3>
        <p className="mx-auto mt-2 text-sm text-muted-foreground">
          {isHighIntent
            ? "Based on your research, you're well-prepared. Connect with our SWFL mortgage experts today."
            : "Whether you're buying your first home or growing your investment portfolio in Southwest Florida, our team is here to help."}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            size="sm"
            className={`w-full ${isHighIntent ? "animate-pulse btn-shadow" : "btn-shadow"}`}
            onClick={() => {
              onCTAClick?.("get_pre_qualified");
              setHubOpen(true);
            }}
          >
            {isHighIntent ? "🚀 Get Pre-Qualified Now" : "Get Pre-Qualified"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              onCTAClick?.("talk_to_expert");
              setContactOpen(true);
            }}
          >
            Talk to an Expert
          </Button>
        </div>
      </div>

      <ApplicationHub open={hubOpen} onClose={() => setHubOpen(false)} />
      <EmailContactSheet open={contactOpen} onOpenChange={setContactOpen} />
    </>
  );
};

export default BlogCTA;
