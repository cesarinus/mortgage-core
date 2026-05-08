import { CheckCircle2, Star } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const benefits = [
  "Licensed mortgage professionals",
  "Fast closings — often under 30 days",
  "Personalized service, not a call center",
  "Transparent process with no hidden fees",
  "Deep Southwest Florida market knowledge",
];

type Review = {
  author_name: string;
  profile_photo_url?: string;
  author_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
};

type ReviewsPayload = {
  place_name?: string;
  rating?: number;
  user_ratings_total?: number;
  url?: string;
  reviews: Review[];
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

const WhyChooseUsSection = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [data, setData] = useState<ReviewsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("google-reviews");
        if (cancelled) return;
        if (error) throw error;
        // Filter out empty-text reviews so cards always show a quote
        const filtered = {
          ...data,
          reviews: (data.reviews ?? []).filter((r: Review) => r.text?.trim()),
        } as ReviewsPayload;
        setData(filtered);
      } catch (err) {
        console.error("Failed to load Google reviews", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const reviews = data?.reviews ?? [];
  const googleUrl =
    data?.url ?? "https://g.page/r/CfDh9HCvSE-WEBM/review";

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

          {/* Google Reviews carousel */}
          <div className="relative">
            {loading ? (
              <div className="card-elevated p-8">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="mt-4 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-11/12" />
                <Skeleton className="mt-2 h-4 w-9/12" />
                <div className="mt-6 flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </div>
            ) : reviews.length === 0 ? (
              <div className="card-elevated p-8 text-center text-sm text-muted-foreground">
                Reviews are loading from Google. Please check back soon.
              </div>
            ) : (
              <>
            <Carousel
              setApi={setApi}
              opts={{ loop: true, align: "start" }}
              plugins={[Autoplay({ delay: 6000, stopOnInteraction: true })]}
              className="w-full"
            >
              <CarouselContent>
                {reviews.map((review) => (
                  <CarouselItem key={`${review.author_name}-${review.time}`}>
                    <div className="card-elevated relative p-8">
                      <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-primary/10" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-primary">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} className="h-5 w-5 fill-current" />
                          ))}
                        </div>
                        <a
                          href={googleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                          aria-label="View Google reviews"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden="true">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
                          </svg>
                          Google
                        </a>
                      </div>
                      <blockquote className="mt-4 line-clamp-6 text-base font-medium italic leading-relaxed md:text-lg">
                        "{review.text}"
                      </blockquote>
                      <div className="mt-6 flex items-center gap-3">
                        {review.profile_photo_url ? (
                          <img
                            src={review.profile_photo_url}
                            alt={review.author_name}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
                            {initials(review.author_name)}
                          </div>
                        )}
                        <div>
                          {review.author_url ? (
                            <a
                              href={review.author_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-semibold hover:text-primary"
                            >
                              {review.author_name}
                            </a>
                          ) : (
                            <p className="text-sm font-semibold">{review.author_name}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {review.relative_time_description} · Google review
                          </p>
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </Carousel>

            <div className="mt-4 flex items-center justify-center gap-2">
              {reviews.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to review ${i + 1}`}
                  onClick={() => api?.scrollTo(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === current ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            {data?.rating && data?.user_ratings_total ? (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{data.rating.toFixed(1)}★</span>
                {" "}from {data.user_ratings_total} Google reviews
              </p>
            ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUsSection;
