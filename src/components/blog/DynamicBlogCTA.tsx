import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, TrendingUp } from "lucide-react";
import ApplicationHub from "@/components/landing/ApplicationHub";
import { EmailContactSheet } from "@/components/landing/EmailContactSheet";
import { getScore } from "@/hooks/useBlogTracking";
import type { BlogVariant } from "@/hooks/useBlogVariants";

interface DynamicBlogCTAProps {
  variant: BlogVariant;
  onCTAClick?: (ctaName: string) => void;
  onVariantClick?: () => void;
}

const DynamicBlogCTA = ({ variant, onCTAClick, onVariantClick }: DynamicBlogCTAProps) => {
  const [hubOpen, setHubOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [autoTriggered, setAutoTriggered] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setScore(getScore()), 5000);
    setScore(getScore());
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (score > 80 && !autoTriggered) {
      setAutoTriggered(true);
      setContactOpen(true);
    }
  }, [score, autoTriggered]);

  const isHighIntent = score > 60;
  const ctaText = isHighIntent ? "Talk to an Expert Now" : variant.cta_text;

  const handlePrimaryClick = () => {
    onCTAClick?.("get_pre_qualified");
    onVariantClick?.();
    setHubOpen(true);
  };

  const handleSecondaryClick = () => {
    onCTAClick?.("talk_to_expert");
    onVariantClick?.();
    setContactOpen(true);
  };

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
          Ready to Take the Next Step?
        </h3>
        <p className="mx-auto mt-2 text-sm text-muted-foreground">
          Whether you're buying your first home or growing your investment portfolio in Southwest Florida, our team is here to help.
        </p>
        <div className="mt-4">
          <Button
            size="sm"
            className={`w-full ${isHighIntent ? "animate-pulse btn-shadow" : "btn-shadow"}`}
            onClick={handlePrimaryClick}
          >
            {isHighIntent ? <><Zap className="mr-1 h-3 w-3" /> {ctaText}</> : ctaText}
          </Button>
        </div>
      </div>

      <ApplicationHub open={hubOpen} onClose={() => setHubOpen(false)} />
      <EmailContactSheet open={contactOpen} onOpenChange={setContactOpen} />
    </>
  );
};

export default DynamicBlogCTA;
