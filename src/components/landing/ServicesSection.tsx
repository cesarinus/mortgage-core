import { useState } from "react";
import { Home, Building2, Shield, RefreshCw, ArrowRight, Landmark, Wheat, HardHat, X, Info } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Home,
    title: "Conventional Loans",
    purpose: "Buy a home",
    description: "Traditional financing with competitive rates and flexible terms for qualified buyers.",
    detail: `Conventional loans are the most common type of mortgage, not backed by a government agency. They typically offer the best interest rates for borrowers with strong credit and a solid down payment.\n\n**Key highlights:**\n• Down payments as low as 3–5%\n• Fixed-rate and adjustable-rate options\n• No upfront mortgage insurance with 20% down\n• Available for primary, secondary, and investment properties\n• Flexible term lengths (15, 20, or 30 years)\n\nIdeal for buyers with good credit scores (typically 620+) who want predictable monthly payments and long-term stability.`,
  },
  {
    icon: Shield,
    title: "FHA Loans",
    purpose: "Buy a home",
    description: "Low down payment options backed by the Federal Housing Administration for first-time buyers.",
    detail: `FHA loans are government-backed mortgages designed to make homeownership accessible, especially for first-time buyers or those with less-than-perfect credit.\n\n**Key highlights:**\n• Down payment as low as 3.5%\n• Credit scores accepted as low as 580\n• Competitive interest rates\n• Seller can contribute up to 6% toward closing costs\n• Available for single-family and multi-family (up to 4 units)\n\nFHA loans are a great option if you're building or rebuilding your credit and want a clear path to homeownership with lower upfront costs.`,
  },
  {
    icon: Building2,
    title: "VA Loans",
    purpose: "Buy a home",
    description: "Zero down payment mortgage options exclusively for veterans and active-duty service members.",
    detail: `VA loans are one of the most powerful mortgage benefits available, exclusively for eligible veterans, active-duty service members, and qualifying surviving spouses.\n\n**Key highlights:**\n• Zero down payment required\n• No private mortgage insurance (PMI)\n• Competitive, often below-market interest rates\n• Limited closing costs (capped by the VA)\n• No prepayment penalties\n\nIf you've served our country, a VA loan can help you achieve homeownership with some of the best terms available in the mortgage industry.`,
  },
  {
    icon: RefreshCw,
    title: "Refinance",
    purpose: "Refinance",
    description: "Lower your monthly payment or tap into home equity with our streamlined refinancing solutions.",
    detail: `Refinancing replaces your existing mortgage with a new one—often at a lower rate or with better terms. Whether you want to reduce your monthly payment, shorten your loan term, or access your home's equity, refinancing can be a smart financial move.\n\n**Key highlights:**\n• Rate-and-term refinance to lower your rate\n• Cash-out refinance to access home equity\n• Streamline options for FHA and VA borrowers\n• Potential to eliminate PMI\n• Consolidate debt or fund home improvements\n\nWe'll analyze your current loan and help you determine if refinancing makes financial sense for your situation.`,
  },
  {
    icon: Landmark,
    title: "DSCR Loans",
    purpose: "Buy a home",
    description: "Investor-friendly loans qualified by property cash flow rather than personal income.",
    detail: `DSCR (Debt Service Coverage Ratio) loans are designed specifically for real estate investors. Instead of qualifying based on your personal income, approval is based on the rental income the property generates.\n\n**Key highlights:**\n• No personal income verification required\n• Qualify based on property rental income\n• Available for short-term rentals (Airbnb, VRBO)\n• Close in an LLC or business entity\n• Loan amounts up to $2M+\n• Interest-only options available\n\nPerfect for investors who want to scale their portfolio without the limitations of traditional income documentation.`,
  },
  {
    icon: Wheat,
    title: "USDA Loans",
    purpose: "Buy a home",
    description: "Zero down payment mortgages for eligible properties in rural and suburban areas.",
    detail: `USDA loans are government-backed mortgages that help moderate-to-low income borrowers purchase homes in eligible rural and suburban communities—with no down payment required.\n\n**Key highlights:**\n• Zero down payment\n• Below-market interest rates\n• Reduced mortgage insurance costs\n• Flexible credit requirements\n• Available for eligible suburban and rural areas\n• Income limits apply (varies by county)\n\nMany suburban neighborhoods qualify for USDA financing. If you're buying outside a major metro area, this could be one of the most affordable paths to homeownership.`,
  },
  {
    icon: HardHat,
    title: "Construction Loans",
    purpose: "Buy a home",
    description: "Finance your dream home from the ground up with flexible construction-to-permanent lending.",
    detail: `Construction loans provide the financing needed to build a new home or make major renovations. Our construction-to-permanent options let you lock in your rate upfront and convert to a traditional mortgage once the build is complete.\n\n**Key highlights:**\n• One-time close (construction-to-permanent)\n• Interest-only payments during the build phase\n• Finance land purchase + construction costs\n• Available for custom builds and major renovations\n• Fixed and adjustable rate options\n• Draw schedule aligned with builder milestones\n\nWhether you're building your forever home or a spec property, we'll structure financing that keeps your project on track and on budget.`,
  },
];

interface ServicesSectionProps {
  onSelectService?: (purpose: string) => void;
}

const ServicesSection = ({ onSelectService }: ServicesSectionProps) => {
  const [selectedService, setSelectedService] = useState<typeof services[0] | null>(null);

  return (
    <section id="services" className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <span className="feature-pill mb-3 inline-flex">Our Services</span>
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Mortgage Solutions <span className="text-gradient-orange">Tailored to You</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Whether you're buying your first home or refinancing, we have the right loan program for your needs.
          </p>
        </div>

        {/* First row – 4 cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.slice(0, 4).map((service) => (
            <ServiceCard
              key={service.title}
              service={service}
              onGetStarted={() => onSelectService?.(service.purpose)}
              onLearnMore={() => setSelectedService(service)}
            />
          ))}
        </div>

        {/* Second row – 3 cards, centered */}
        <div className="mt-6 flex justify-center">
          <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.slice(4).map((service) => (
              <ServiceCard
                key={service.title}
                service={service}
                onGetStarted={() => onSelectService?.(service.purpose)}
                onLearnMore={() => setSelectedService(service)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Learn More Sheet */}
      <Sheet open={!!selectedService} onOpenChange={(open) => !open && setSelectedService(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedService && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground mb-3">
                  <selectedService.icon className="h-6 w-6" />
                </div>
                <SheetTitle className="font-display text-xl">{selectedService.title}</SheetTitle>
              </SheetHeader>

              <div className="prose prose-sm max-w-none text-muted-foreground space-y-3 mt-2">
                {selectedService.detail.split("\n\n").map((paragraph, i) => {
                  if (paragraph.startsWith("**")) {
                    const heading = paragraph.match(/\*\*(.*?)\*\*/)?.[1] || "";
                    const rest = paragraph.replace(/\*\*.*?\*\*/, "").trim();
                    return (
                      <div key={i}>
                        <p className="font-semibold text-foreground mb-1">{heading}</p>
                        <div className="space-y-0.5">
                          {rest.split("\n").map((line, j) => (
                            <p key={j} className="text-sm leading-relaxed">{line.replace(/^• /, "→ ")}</p>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return <p key={i} className="text-sm leading-relaxed">{paragraph}</p>;
                })}
              </div>

              <div className="mt-8">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    setSelectedService(null);
                    onSelectService?.(selectedService.purpose);
                  }}
                >
                  Get Started <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
};

function ServiceCard({
  service,
  onGetStarted,
  onLearnMore,
}: {
  service: typeof services[0];
  onGetStarted: () => void;
  onLearnMore: () => void;
}) {
  return (
    <div className="card-elevated group relative p-6 text-left transition-transform hover:-translate-y-1">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <service.icon className="h-6 w-6" />
      </div>
      <h3 className="font-display text-lg font-semibold">{service.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{service.description}</p>

      {/* Hover actions */}
      <div className="mt-3 flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={onLearnMore}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Info className="h-3.5 w-3.5" /> Learn More
        </button>
        <button
          onClick={onGetStarted}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary"
        >
          Get Started <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default ServicesSection;
