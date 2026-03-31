import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, TrendingUp, MapPin } from "lucide-react";

const HeroSection = () => {
  const scrollToContact = () => {
    const el = document.getElementById("contact");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToServices = () => {
    const el = document.getElementById("services");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden bg-dotted">
      {/* Orange blob decoration */}
      <div className="orange-blob pointer-events-none absolute -right-32 -top-32 h-96 w-96" />
      <div className="orange-blob pointer-events-none absolute -bottom-24 -left-24 h-72 w-72" />

      <div className="container relative mx-auto px-4 py-16 md:py-24 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          {/* Trust badge */}
          <div className="animate-fade-up mb-6">
            <span className="trust-badge">
              <Shield className="h-4 w-4" />
              Southwest Florida's Trusted Mortgage Partner
            </span>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-up font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl" style={{ animationDelay: "0.1s" }}>
            Your Path to{" "}
            <span className="text-gradient-orange">Homeownership</span>{" "}
            Starts Here
          </h1>

          {/* Subtitle */}
          <p className="animate-fade-up mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg" style={{ animationDelay: "0.2s" }}>
            NexGen Capital provides fast pre-approvals, competitive rates, and personalized mortgage solutions for every stage of your journey.
          </p>

          {/* CTA buttons */}
          <div className="animate-fade-up mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center" style={{ animationDelay: "0.3s" }}>
            <Button size="lg" className="btn-shadow w-full sm:w-auto" onClick={scrollToContact}>
              Apply Now <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={scrollToServices}>
              Learn More
            </Button>
          </div>

          {/* Feature pills */}
          <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-2" style={{ animationDelay: "0.4s" }}>
            <span className="feature-pill"><TrendingUp className="h-3.5 w-3.5" /> Fast Pre-Approvals</span>
            <span className="feature-pill"><Shield className="h-3.5 w-3.5" /> Competitive Rates</span>
            <span className="feature-pill"><MapPin className="h-3.5 w-3.5" /> Local Expertise</span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="animate-fade-up mt-16 grid grid-cols-2 gap-4 md:grid-cols-4" style={{ animationDelay: "0.5s" }}>
          {[
            { value: "500+", label: "Loans Funded" },
            { value: "15+", label: "Years Experience" },
            { value: "4.9★", label: "Average Rating" },
            { value: "100%", label: "SWFL Focused" },
          ].map((stat) => (
            <div key={stat.label} className="card-elevated flex flex-col items-center p-4 text-center">
              <span className="font-display text-2xl font-bold text-primary md:text-3xl">{stat.value}</span>
              <span className="mt-1 text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
