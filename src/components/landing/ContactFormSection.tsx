import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, MapPin, Clock, Send } from "lucide-react";
import { EmailContactSheet } from "./EmailContactSheet";

const ContactFormSection = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    loan_type: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name) {
      toast({ title: "Please fill in your first and last name.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await supabase.functions.invoke("submit-lead", {
        body: {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email || null,
          phone: form.phone || null,
          notes: [form.loan_type && `Loan Type: ${form.loan_type}`, form.message].filter(Boolean).join("\n"),
          source: "contact_form",
        },
      });

      setLoading(false);

      if (res.error || res.data?.error) {
        toast({ title: res.data?.error || "Something went wrong. Please try again.", variant: "destructive" });
      } else {
        toast({ title: "Thank you! We'll be in touch soon." });
        setForm({ first_name: "", last_name: "", email: "", phone: "", loan_type: "", message: "" });
      }
    } catch {
      setLoading(false);
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  return (
    <section id="contact" className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <span className="feature-pill mb-3 inline-flex">Get Started</span>
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Ready to <span className="text-gradient-orange">Get Started?</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Fill out the form below and one of our mortgage specialists will reach out within 24 hours.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-5">
          {/* Form */}
          <form onSubmit={handleSubmit} className="card-elevated space-y-4 p-6 lg:col-span-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                placeholder="First Name *"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                required
              />
              <Input
                placeholder="Last Name *"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                required
              />
            </div>
            <Input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              type="tel"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Select value={form.loan_type} onValueChange={(v) => setForm({ ...form, loan_type: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Loan Type (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conventional">Conventional</SelectItem>
                <SelectItem value="fha">FHA</SelectItem>
                <SelectItem value="va">VA</SelectItem>
                <SelectItem value="refinance">Refinance</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Tell us about your situation..."
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
            <Button type="submit" className="btn-shadow w-full" disabled={loading}>
              {loading ? "Sending..." : <><Send className="mr-2 h-4 w-4" /> Send Message</>}
            </Button>
          </form>

          {/* Contact info */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="card-elevated p-6">
              <h3 className="mb-4 font-display text-lg font-semibold">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">(239) 645-4580</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">hello@ngcapital.net</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Office</p>
                    <p className="text-sm text-muted-foreground">Naples, FL</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Hours</p>
                    <p className="text-sm text-muted-foreground">Mon–Fri 9am–6pm</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactFormSection;
