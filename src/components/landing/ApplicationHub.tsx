import { useState, useEffect, useCallback } from "react";
import { getScore, getSessionId } from "@/hooks/useBlogTracking";
import { X, ArrowLeft, ArrowRight, Check, Shield, Clock, Lock, Home, Building2, Users, DollarSign, Phone, Mail, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_KEY = "ng_application_progress";
const TOTAL_STEPS = 7;

interface ApplicationData {
  loan_purpose: string;
  refinance_type: string;
  cash_out_purpose: string;
  property_type: string;
  property_value: string;
  credit_range: string;
  employment_type: string;
  annual_income: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  timeline: string;
}

const defaultData: ApplicationData = {
  loan_purpose: "",
  refinance_type: "",
  cash_out_purpose: "",
  property_type: "",
  property_value: "",
  credit_range: "",
  employment_type: "",
  annual_income: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  timeline: "",
};

interface ApplicationHubProps {
  open: boolean;
  onClose: () => void;
  prefillPurpose?: string;
}

// Option card component
const OptionCard = ({ selected, onClick, icon: Icon, label }: { selected: boolean; onClick: () => void; icon?: React.ElementType; label: string }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left text-sm font-medium transition-all ${
      selected
        ? "border-primary bg-primary/5 text-foreground shadow-sm"
        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent/30"
    }`}
  >
    {Icon && <Icon className={`h-5 w-5 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />}
    <span>{label}</span>
    {selected && <Check className="ml-auto h-4 w-4 text-primary" />}
  </button>
);

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const ApplicationHub = ({ open, onClose, prefillPurpose }: ApplicationHubProps) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<ApplicationData>(defaultData);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load saved progress
  useEffect(() => {
    if (!open) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setData({ ...defaultData, ...parsed.data });
        setStep(parsed.step || 1);
        setSubmitted(false);
      }
    } catch {}
  }, [open]);

  // Apply prefill
  useEffect(() => {
    if (open && prefillPurpose) {
      setData((prev) => ({ ...prev, loan_purpose: prefillPurpose }));
      if (prefillPurpose) setStep(2); // skip step 1 if prefilled
    }
  }, [open, prefillPurpose]);

  // Save progress
  const saveProgress = useCallback(
    (newData: ApplicationData, newStep: number) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: newData, step: newStep }));
      } catch {}
    },
    []
  );

  const updateFields = (updates: Partial<ApplicationData>, nextStep?: number) => {
    setData((prev) => {
      const updated = { ...prev, ...updates };
      saveProgress(updated, nextStep ?? step);
      return updated;
    });
    if (nextStep !== undefined) setStep(nextStep);
    setErrors((prev) => {
      const updatedErrors = { ...prev };
      Object.keys(updates).forEach((field) => {
        updatedErrors[field] = "";
      });
      return updatedErrors;
    });
  };

  const updateField = (field: keyof ApplicationData, value: string) => {
    updateFields({ [field]: value });
  };

  const advanceFromStepOne = (updates: Partial<ApplicationData>) => {
    updateFields(updates, 2);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1: {
        if (!data.loan_purpose) return false;
        if (data.loan_purpose === "Refinance") {
          if (!data.refinance_type) return false;
          if (data.refinance_type === "CashOut" && !data.cash_out_purpose) return false;
        }
        return true;
      }
      case 2: return !!data.property_type;
      case 3: return !!data.credit_range;
      case 4: return !!data.employment_type;
      case 5: {
        if (!data.first_name.trim() || !data.last_name.trim()) return false;
        if (data.email && !isValidEmail(data.email)) return false;
        return true;
      }
      case 6: return !!data.timeline;
      default: return true;
    }
  };

  const validateStep5 = () => {
    const errs: Record<string, string> = {};
    if (!data.first_name.trim()) errs.first_name = "First name is required";
    if (!data.last_name.trim()) errs.last_name = "Last name is required";
    if (data.email && !isValidEmail(data.email)) errs.email = "Invalid email address";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (step === 5 && !validateStep5()) return;
    const newStep = Math.min(step + 1, TOTAL_STEPS);
    setStep(newStep);
    saveProgress(data, newStep);
  };

  const back = () => {
    const newStep = Math.max(step - 1, 1);
    setStep(newStep);
    saveProgress(data, newStep);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await supabase.functions.invoke("submit-lead", {
        body: {
          first_name: data.first_name.trim(),
          last_name: data.last_name.trim(),
          email: data.email.trim() || null,
          phone: data.phone.trim() || null,
          loan_purpose: data.loan_purpose,
          refinance_type: data.loan_purpose === "Refinance" ? (data.refinance_type || null) : null,
          cash_out_purpose:
            data.loan_purpose === "Refinance" && data.refinance_type === "CashOut"
              ? (data.cash_out_purpose || null)
              : null,
          property_type: data.property_type,
          property_value: data.property_value ? Number(data.property_value) : null,
          credit_range: data.credit_range,
          employment_type: data.employment_type,
          annual_income: data.annual_income ? Number(data.annual_income) : null,
          timeline: data.timeline,
          source: "application_hub",
          lead_score: getScore(),
          blog_session_id: getSessionId(),
          variant_shown: (() => {
            try {
              const v = localStorage.getItem("ng_blog_variant");
              return v ? JSON.parse(v) : null;
            } catch { return null; }
          })(),
          notes: [
            data.loan_purpose && `Loan Purpose: ${data.loan_purpose}`,
            data.refinance_type && `Refinance Type: ${data.refinance_type}`,
            data.cash_out_purpose && `Cash Out Purpose: ${data.cash_out_purpose}`,
            data.property_type && `Property Type: ${data.property_type}`,
            data.property_value && `Property Value: $${data.property_value}`,
            data.credit_range && `Credit Range: ${data.credit_range}`,
            data.employment_type && `Employment: ${data.employment_type}`,
            data.annual_income && `Annual Income: $${data.annual_income}`,
            data.timeline && `Timeline: ${data.timeline}`,
          ].filter(Boolean).join("\n"),
        },
      });

      setSubmitting(false);

      if (res.error || res.data?.error) {
        toast.error(res.data?.error || "Something went wrong. Please try again.");
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setSubmitted(true);
        toast.success("Application submitted successfully!");
      }
    } catch {
      setSubmitting(false);
      toast.error("Something went wrong. Please try again.");
    }
  };

  const handleClose = () => {
    onClose();
    // Reset after animation
    setTimeout(() => {
      if (submitted) {
        setStep(1);
        setData(defaultData);
        setSubmitted(false);
      }
    }, 350);
  };

  const progress = (step / TOTAL_STEPS) * 100;

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Slide-in panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-background shadow-2xl transition-transform duration-300 ease-out sm:max-w-[540px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">
              {submitted ? "You're All Set!" : "Get Your Mortgage Options"}
            </h2>
            {!submitted && (
              <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Takes &lt;60 seconds</span>
                <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Secure</span>
              </div>
            )}
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress bar */}
        {!submitted && (
          <div className="px-5 pt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Step {step} of {TOTAL_STEPS}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {submitted ? (
            <SuccessState onClose={handleClose} />
          ) : (
            <>
              {step === 1 && (
                <StepGoal
                  data={data}
                  onSelect={(v) => {
                    if (v !== "Refinance") {
                      advanceFromStepOne({ loan_purpose: v, refinance_type: "", cash_out_purpose: "" });
                      return;
                    }
                    updateFields({ loan_purpose: v, refinance_type: "", cash_out_purpose: "" });
                  }}
                  onSelectRefinanceType={(v) => {
                    if (v !== "CashOut") {
                      advanceFromStepOne({ refinance_type: v, cash_out_purpose: "" });
                      return;
                    }
                    updateFields({ refinance_type: v, cash_out_purpose: "" });
                  }}
                  onSelectCashOutPurpose={(v) => advanceFromStepOne({ cash_out_purpose: v })}
                />
              )}
              {step === 2 && <StepProperty data={data} onChange={updateField} />}
              {step === 3 && <StepCredit data={data} onSelect={(v) => updateField("credit_range", v)} />}
              {step === 4 && <StepEmployment data={data} onChange={updateField} />}
              {step === 5 && <StepContact data={data} onChange={updateField} errors={errors} />}
              {step === 6 && <StepTimeline data={data} onSelect={(v) => updateField("timeline", v)} />}
              {step === 7 && <StepReview data={data} />}
            </>
          )}
        </div>

        {/* Footer navigation */}
        {!submitted && (
          <div className="border-t border-border px-5 py-4">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <Button variant="outline" onClick={back} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              )}
              <div className="flex-1" />
              {step < TOTAL_STEPS ? (
                <Button onClick={next} disabled={!canProceed()} className="btn-shadow gap-1.5">
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting || !canProceed()} className="btn-shadow gap-1.5">
                  {submitting ? "Submitting..." : <><Sparkles className="h-4 w-4" /> Get My Options</>}
                </Button>
              )}
            </div>
            <div className="mt-3 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Shield className="h-3 w-3" /> No impact to your credit · Secure & confidential
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ─── Step Components ──────────────────────────────────────

function StepGoal({
  data,
  onSelect,
  onSelectRefinanceType,
  onSelectCashOutPurpose,
}: {
  data: ApplicationData;
  onSelect: (v: string) => void;
  onSelectRefinanceType: (v: string) => void;
  onSelectCashOutPurpose: (v: string) => void;
}) {
  const [refinanceTypes, setRefinanceTypes] = useState<{ value: string; label: string }[]>([]);
  const [cashOutPurposes, setCashOutPurposes] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("crm_field_options")
        .select("value, label, sort_order, crm_fields!inner(internal_name, crm_modules!inner(slug))")
        .in("crm_fields.internal_name", ["refinance_type", "cash_out_purpose"])
        .eq("crm_fields.crm_modules.slug", "leads")
        .order("sort_order", { ascending: true });
      const rt: { value: string; label: string }[] = [];
      const co: { value: string; label: string }[] = [];
      (rows ?? []).forEach((r: any) => {
        const name = r.crm_fields?.internal_name;
        const opt = { value: r.value as string, label: r.label as string };
        if (name === "refinance_type") rt.push(opt);
        else if (name === "cash_out_purpose") co.push(opt);
      });
      setRefinanceTypes(rt);
      setCashOutPurposes(co);
    })().catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-xl font-bold">What are you looking to do?</h3>
        <p className="mt-1 text-sm text-muted-foreground">Select the option that best describes your goal.</p>
      </div>
      <div className="grid gap-3">
        <OptionCard selected={data.loan_purpose === "Buy a home"} onClick={() => onSelect("Buy a home")} icon={Home} label="Buy a home" />
        <OptionCard selected={data.loan_purpose === "Refinance"} onClick={() => onSelect("Refinance")} icon={Building2} label="Refinance" />
      </div>

      {data.loan_purpose === "Refinance" && (
        <div className="space-y-3 pt-2">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Refinance type</h4>
            <p className="text-xs text-muted-foreground">Choose the option that fits your goal.</p>
          </div>
          <div className="grid gap-2">
            {refinanceTypes.map((o) => (
              <OptionCard
                key={o.value}
                selected={data.refinance_type === o.value}
                onClick={() => onSelectRefinanceType(o.value)}
                label={o.label}
              />
            ))}
          </div>
        </div>
      )}

      {data.loan_purpose === "Refinance" && data.refinance_type === "CashOut" && (
        <div className="space-y-3 pt-2">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Cash out purpose</h4>
            <p className="text-xs text-muted-foreground">What will you use the funds for?</p>
          </div>
          <div className="grid gap-2">
            {cashOutPurposes.map((o) => (
              <OptionCard
                key={o.value}
                selected={data.cash_out_purpose === o.value}
                onClick={() => onSelectCashOutPurpose(o.value)}
                label={o.label}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepProperty({ data, onChange }: { data: ApplicationData; onChange: (k: keyof ApplicationData, v: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-xl font-bold">Tell us about the property</h3>
        <p className="mt-1 text-sm text-muted-foreground">What type of property and estimated value?</p>
      </div>
      <div className="grid gap-3">
        <OptionCard selected={data.property_type === "Single-family"} onClick={() => onChange("property_type", "Single-family")} icon={Home} label="Single-family home" />
        <OptionCard selected={data.property_type === "Condo"} onClick={() => onChange("property_type", "Condo")} icon={Building2} label="Condo / Townhome" />
        <OptionCard selected={data.property_type === "Multi-family"} onClick={() => onChange("property_type", "Multi-family")} icon={Users} label="Multi-family (2-4 units)" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Estimated value or purchase price</label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="number"
            placeholder="350,000"
            className="pl-9"
            value={data.property_value}
            onChange={(e) => onChange("property_value", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function StepCredit({ data, onSelect }: { data: ApplicationData; onSelect: (v: string) => void }) {
  const ranges = ["740+", "700–739", "660–699", "620–659", "Below 620"];
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-xl font-bold">What's your estimated credit score?</h3>
        <p className="mt-1 text-sm text-muted-foreground">No hard pull — just a rough estimate is fine.</p>
      </div>
      <div className="grid gap-3">
        {ranges.map((r) => (
          <OptionCard key={r} selected={data.credit_range === r} onClick={() => onSelect(r)} label={r} />
        ))}
      </div>
    </div>
  );
}

function StepEmployment({ data, onChange }: { data: ApplicationData; onChange: (k: keyof ApplicationData, v: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-xl font-bold">Employment & income</h3>
        <p className="mt-1 text-sm text-muted-foreground">This helps us find the right programs for you.</p>
      </div>
      <div className="grid gap-3">
        <OptionCard selected={data.employment_type === "W2"} onClick={() => onChange("employment_type", "W2")} label="W-2 Employee" />
        <OptionCard selected={data.employment_type === "Self-employed"} onClick={() => onChange("employment_type", "Self-employed")} label="Self-employed" />
        <OptionCard selected={data.employment_type === "Retired"} onClick={() => onChange("employment_type", "Retired")} label="Retired" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Estimated annual income</label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="number"
            placeholder="85,000"
            className="pl-9"
            value={data.annual_income}
            onChange={(e) => onChange("annual_income", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function StepContact({ data, onChange, errors }: { data: ApplicationData; onChange: (k: keyof ApplicationData, v: string) => void; errors: Record<string, string> }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-xl font-bold">How can we reach you?</h3>
        <p className="mt-1 text-sm text-muted-foreground">We'll use this to send your personalized options.</p>
      </div>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">First name *</label>
            <Input value={data.first_name} onChange={(e) => onChange("first_name", e.target.value)} placeholder="John" />
            {errors.first_name && <p className="mt-1 text-xs text-destructive">{errors.first_name}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Last name *</label>
            <Input value={data.last_name} onChange={(e) => onChange("last_name", e.target.value)} placeholder="Smith" />
            {errors.last_name && <p className="mt-1 text-xs text-destructive">{errors.last_name}</p>}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              className="pl-9"
              value={data.email}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="john@example.com"
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Phone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="tel"
              className="pl-9"
              value={data.phone}
              onChange={(e) => onChange("phone", formatPhone(e.target.value))}
              placeholder="(239) 555-0100"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepTimeline({ data, onSelect }: { data: ApplicationData; onSelect: (v: string) => void }) {
  const options = [
    { label: "ASAP — I'm ready now", value: "ASAP", icon: Sparkles },
    { label: "30–60 days", value: "30-60 days", icon: Calendar },
    { label: "2–6 months", value: "2-6 months", icon: Clock },
    { label: "Just exploring", value: "Just exploring", icon: Home },
  ];
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-xl font-bold">How soon are you looking to move forward?</h3>
        <p className="mt-1 text-sm text-muted-foreground">This helps us prioritize your application.</p>
      </div>
      <div className="grid gap-3">
        {options.map((o) => (
          <OptionCard key={o.value} selected={data.timeline === o.value} onClick={() => onSelect(o.value)} icon={o.icon} label={o.label} />
        ))}
      </div>
    </div>
  );
}

function StepReview({ data }: { data: ApplicationData }) {
  const rows = [
    { label: "Goal", value: data.loan_purpose },
    { label: "Property", value: [data.property_type, data.property_value && `$${Number(data.property_value).toLocaleString()}`].filter(Boolean).join(" · ") },
    { label: "Credit", value: data.credit_range },
    { label: "Employment", value: [data.employment_type, data.annual_income && `$${Number(data.annual_income).toLocaleString()}/yr`].filter(Boolean).join(" · ") },
    { label: "Name", value: `${data.first_name} ${data.last_name}`.trim() },
    { label: "Email", value: data.email },
    { label: "Phone", value: data.phone },
    { label: "Timeline", value: data.timeline },
  ].filter((r) => r.value);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-xl font-bold">Review your information</h3>
        <p className="mt-1 text-sm text-muted-foreground">Make sure everything looks correct before submitting.</p>
      </div>
      <div className="card-elevated divide-y divide-border overflow-hidden">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className="text-sm font-medium text-foreground">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuccessState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
        <Check className="h-8 w-8" />
      </div>
      <h3 className="font-display text-2xl font-bold">You're one step closer!</h3>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        A mortgage expert will review your information and reach out shortly with personalized options.
      </p>
      <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
        <Button className="btn-shadow w-full" onClick={onClose}>
          Back to Home
        </Button>
      </div>
    </div>
  );
}

export default ApplicationHub;
