import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import BookingCalendar from "@/components/booking/BookingCalendar";
import BookingDetailsForm, { type BookingFormValues } from "@/components/booking/BookingDetailsForm";
import BookingSuccess from "@/components/booking/BookingSuccess";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock, Phone, Video, MapPin, ArrowRight } from "lucide-react";
import { formatDateLong, formatTime, SITE_URL_FALLBACK } from "@/lib/booking-meta";

type Step = "pick" | "details" | "done";

export default function Book() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("pick");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    start: Date;
    end: Date;
    meetingType: "call" | "zoom";
    firstName: string;
  } | null>(null);

  const handleSubmit = async (values: BookingFormValues) => {
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-booking", {
        body: { ...values, startAt: selectedSlot },
      });
      if (error || (data as any)?.error) {
        const msg = (data as any)?.error || error?.message || "Something went wrong";
        toast({ title: "Booking failed", description: msg, variant: "destructive" });
        return;
      }
      const start = new Date(selectedSlot);
      const end = new Date(start.getTime() + 30 * 60_000);
      setConfirmed({ start, end, meetingType: values.meetingType, firstName: values.firstName });
      setStep("done");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Book a Meeting | NexGen Capital — Southwest Florida Mortgage</title>
        <meta
          name="description"
          content="Schedule a free 30-minute consultation with NexGen Capital. Pick a time that works, choose call or Zoom, and we'll handle the rest."
        />
        <link rel="canonical" href={`${SITE_URL_FALLBACK}/book`} />
        <meta property="og:title" content="Book a Meeting | NexGen Capital" />
        <meta property="og:description" content="Schedule your free mortgage consultation with NexGen Capital." />
        <meta property="og:type" content="website" />
      </Helmet>

      <Navbar />

      <main className="min-h-screen bg-dotted py-10 md:py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 text-center">
              <h1 className="font-display text-3xl font-bold md:text-4xl">Book a Free Consultation</h1>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Pick a time that works for you. We'll confirm by email and reach out at your meeting time.
              </p>
            </div>

            <div className="card-elevated overflow-hidden p-0">
              <div className="grid md:grid-cols-[280px_1fr]">
                {/* Left info panel */}
                <aside className="border-b bg-secondary/40 p-6 md:border-b-0 md:border-r">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary font-display text-xl font-bold text-primary-foreground">
                    N
                  </div>
                  <p className="mt-3 text-sm font-medium text-muted-foreground">NexGen Capital</p>
                  <h2 className="font-display text-xl font-semibold">Cesar A Martinez</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Mortgage Consultation</p>

                  <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" /> 30 minutes
                    </li>
                    <li className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" /> Phone call
                    </li>
                    <li className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-primary" /> Or Zoom video
                    </li>
                    <li className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" /> Naples, FL · ET
                    </li>
                  </ul>

                  {step !== "done" && selectedSlot && (
                    <div className="mt-6 rounded-lg border border-primary/30 bg-accent/60 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Selected</p>
                      <p className="mt-1 text-sm font-medium">{formatDateLong(new Date(selectedSlot))}</p>
                      <p className="text-sm text-muted-foreground">{formatTime(new Date(selectedSlot))} ET</p>
                    </div>
                  )}
                </aside>

                {/* Right content */}
                <section className="p-6 md:p-8">
                  {step === "pick" && (
                    <>
                      <BookingCalendar selectedSlot={selectedSlot} onSelectSlot={setSelectedSlot} />
                      <div className="mt-6 flex justify-end">
                        <Button disabled={!selectedSlot} onClick={() => setStep("details")} className="btn-shadow">
                          Continue <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}

                  {step === "details" && (
                    <>
                      <h3 className="mb-4 font-display text-lg font-semibold">Your details</h3>
                      <BookingDetailsForm
                        submitting={submitting}
                        onSubmit={handleSubmit}
                        onBack={() => setStep("pick")}
                      />
                    </>
                  )}

                  {step === "done" && confirmed && <BookingSuccess {...confirmed} />}
                </section>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
