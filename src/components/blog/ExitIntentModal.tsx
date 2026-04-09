import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";
import ApplicationHub from "@/components/landing/ApplicationHub";

interface ExitIntentModalProps {
  enabled?: boolean;
  onCTAClick?: (ctaName: string) => void;
}

const ExitIntentModal = ({ enabled = true, onCTAClick }: ExitIntentModalProps) => {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);

  const handleMouseLeave = useCallback(
    (e: MouseEvent) => {
      if (!enabled || dismissed || show) return;
      if (e.clientY <= 5) {
        // Check if already shown this session
        const key = "ng_exit_intent_shown";
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
        setShow(true);
      }
    },
    [enabled, dismissed, show]
  );

  useEffect(() => {
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [handleMouseLeave]);

  if (!show || dismissed) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDismissed(true)}>
        <div
          className="relative mx-4 w-full max-w-md rounded-2xl border border-border bg-background p-8 shadow-2xl animate-in zoom-in-90"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setDismissed(true)}
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary" />
            <h3 className="font-display text-xl font-bold text-foreground">Wait — Don't Miss Out!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Get a free, no-obligation mortgage rate quote for Southwest Florida in under 60 seconds.
            </p>
            <Button
              className="mt-5 w-full btn-shadow"
              onClick={() => {
                onCTAClick?.("exit_intent");
                setDismissed(true);
                setHubOpen(true);
              }}
            >
              See My Options
            </Button>
            <button
              className="mt-3 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setDismissed(true)}
            >
              No thanks, I'll pass
            </button>
          </div>
        </div>
      </div>
      <ApplicationHub open={hubOpen} onClose={() => setHubOpen(false)} />
    </>
  );
};

export default ExitIntentModal;
