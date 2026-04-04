import { Home, Building2, Shield, RefreshCw, ArrowRight } from "lucide-react";

const services = [
  {
    icon: Home,
    title: "Conventional Loans",
    purpose: "Buy a home",
    description: "Traditional financing with competitive rates and flexible terms for qualified buyers.",
  },
  {
    icon: Shield,
    title: "FHA Loans",
    purpose: "Buy a home",
    description: "Low down payment options backed by the Federal Housing Administration for first-time buyers.",
  },
  {
    icon: Building2,
    title: "VA Loans",
    purpose: "Buy a home",
    description: "Zero down payment mortgage options exclusively for veterans and active-duty service members.",
  },
  {
    icon: RefreshCw,
    title: "Refinance",
    purpose: "Refinance",
    description: "Lower your monthly payment or tap into home equity with our streamlined refinancing solutions.",
  },
];

interface ServicesSectionProps {
  onSelectService?: (purpose: string) => void;
}

const ServicesSection = ({ onSelectService }: ServicesSectionProps) => {
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

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <button
              key={service.title}
              onClick={() => onSelectService?.(service.purpose)}
              className="card-elevated group p-6 text-left transition-transform hover:-translate-y-1"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <service.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-semibold">{service.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{service.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
