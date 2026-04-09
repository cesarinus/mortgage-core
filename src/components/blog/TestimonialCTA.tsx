import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Star, Quote } from "lucide-react";
import ApplicationHub from "@/components/landing/ApplicationHub";

interface TestimonialCTAProps {
  onCTAClick?: (ctaName: string) => void;
  onVariantClick?: () => void;
}

const TestimonialCTA = ({ onCTAClick, onVariantClick }: TestimonialCTAProps) => {
  const [hubOpen, setHubOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10 p-6">
        <div className="mb-3 flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
          ))}
        </div>
        <Quote className="mb-2 h-5 w-5 text-primary/40" />
        <p className="text-sm italic text-foreground/80">
          "NexGenSWFL made our home buying process seamless. From pre-approval to closing, they were with us every step. Highly recommend for anyone in Southwest Florida!"
        </p>
        <p className="mt-2 text-xs font-semibold text-muted-foreground">
          — Maria & Carlos R., Naples FL
        </p>
        <Button
          size="sm"
          className="mt-4 w-full btn-shadow"
          onClick={() => {
            onCTAClick?.("testimonial_cta");
            onVariantClick?.();
            setHubOpen(true);
          }}
        >
          Start Your Journey
        </Button>
      </div>
      <ApplicationHub open={hubOpen} onClose={() => setHubOpen(false)} />
    </>
  );
};

export default TestimonialCTA;
