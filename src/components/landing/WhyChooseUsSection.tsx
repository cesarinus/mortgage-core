import { CheckCircle2, Star } from "lucide-react";

const benefits = [
  "Licensed mortgage professionals",
  "Fast closings — often under 30 days",
  "Personalized service, not a call center",
  "Transparent process with no hidden fees",
  "Deep Southwest Florida market knowledge",
];

const WhyChooseUsSection = () => {
  return (
    <section id="about" className="bg-dotted py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Content */}
          <div>
            <span className="feature-pill mb-3 inline-flex">Why NexGen Capital</span>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              A Partner You Can <span className="text-gradient-orange">Trust</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              At NexGen Capital, we believe getting a mortgage shouldn't be stressful. Our team of local experts guides you through every step with clarity and care.
            </p>

            <ul className="mt-6 space-y-3">
              {benefits.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Testimonial card */}
          <div className="card-elevated relative p-8">
            <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-primary/10" />
            <div className="flex items-center gap-1 text-primary">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-current" />
              ))}
            </div>
            <blockquote className="mt-4 text-lg font-medium italic leading-relaxed">
              "NexGen Capital made the entire mortgage process seamless. From pre-approval to closing, they were with us every step of the way. Highly recommend!"
            </blockquote>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
                MJ
              </div>
              <div>
                <p className="text-sm font-semibold">Maria J.</p>
                <p className="text-xs text-muted-foreground">First-Time Homebuyer, Fort Myers</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUsSection;
