import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock, TrendingUp } from "lucide-react";
import ApplicationHub from "@/components/landing/ApplicationHub";

interface UrgencyCTAProps {
  onCTAClick?: (ctaName: string) => void;
  onVariantClick?: () => void;
}

const UrgencyCTA = ({ onCTAClick, onVariantClick }: UrgencyCTAProps) => {
  const [hubOpen, setHubOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-orange-300/50 bg-gradient-to-br from-orange-50/80 to-amber-50/60 p-6 dark:from-orange-950/20 dark:to-amber-950/10 dark:border-orange-700/30">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
          <TrendingUp className="h-3.5 w-3.5" />
          Rates Are Moving
        </div>
        <h3 className="font-display text-lg font-bold text-foreground">
          Lock In Today's Rates
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Southwest Florida mortgage rates change daily. Get your personalized rate quote before they go up.
        </p>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Takes less than 60 seconds
        </div>
        <Button
          size="sm"
          className="mt-4 w-full bg-orange-600 hover:bg-orange-700 text-white btn-shadow"
          onClick={() => {
            onCTAClick?.("urgency_cta");
            onVariantClick?.();
            setHubOpen(true);
          }}
        >
          Check My Rate Now
        </Button>
      </div>
      <ApplicationHub open={hubOpen} onClose={() => setHubOpen(false)} />
    </>
  );
};

export default UrgencyCTA;
