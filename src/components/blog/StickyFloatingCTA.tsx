import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Zap, X } from "lucide-react";
import ApplicationHub from "@/components/landing/ApplicationHub";
import { getScore } from "@/hooks/useBlogTracking";

interface StickyFloatingCTAProps {
  ctaText: string;
  onCTAClick?: (ctaName: string) => void;
  onVariantClick?: () => void;
}

const StickyFloatingCTA = ({ ctaText, onCTAClick, onVariantClick }: StickyFloatingCTAProps) => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      setVisible(scrollPct > 25 && !dismissed);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [dismissed]);

  if (!visible || dismissed) return null;

  const score = getScore();
  const text = score > 60 ? "Talk to an Expert Now" : ctaText;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-primary/30 bg-background/95 px-4 py-3 shadow-xl backdrop-blur-sm transition-all animate-in slide-in-from-bottom-4">
        <Button
          size="sm"
          className="btn-shadow gap-1.5 rounded-full"
          onClick={() => {
            onCTAClick?.("floating_cta");
            onVariantClick?.();
            setHubOpen(true);
          }}
        >
          <Zap className="h-3 w-3" />
          {text}
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <ApplicationHub open={hubOpen} onClose={() => setHubOpen(false)} />
    </>
  );
};

export default StickyFloatingCTA;
