import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Calculator, Info, MessageCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  LOAN_TYPES,
  TERM_OPTIONS,
  DEFAULT_PROPERTY_TAX_ANNUAL,
  DEFAULT_INSURANCE_ANNUAL,
  calculateMortgage,
  formatUSD,
  type LoanType,
} from "@/lib/mortgageCalc";

interface MortgageCalculatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MortgageCalculator = ({ open, onOpenChange }: MortgageCalculatorProps) => {
  // Inputs
  const [homePrice, setHomePrice] = useState(450_000);
  const [downPayment, setDownPayment] = useState(90_000);
  const [downIsPct, setDownIsPct] = useState(false);
  const [loanType, setLoanType] = useState<LoanType>("30-year-fixed");
  const [loanTermYears, setLoanTermYears] = useState(30);

  const defaultRate = LOAN_TYPES.find((l) => l.value === loanType)?.defaultRate ?? 6.605;
  const [rate, setRate] = useState(defaultRate);
  const [editRate, setEditRate] = useState(false);

  const [taxAnnual, setTaxAnnual] = useState(DEFAULT_PROPERTY_TAX_ANNUAL);
  const [taxOverride, setTaxOverride] = useState(false);

  const [insAnnual, setInsAnnual] = useState(DEFAULT_INSURANCE_ANNUAL);
  const [insOverride, setInsOverride] = useState(false);

  // Lead form
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);

  const handleLoanTypeChange = (val: LoanType) => {
    setLoanType(val);
    const lt = LOAN_TYPES.find((l) => l.value === val);
    if (lt) {
      setLoanTermYears(lt.defaultTerm);
      if (!editRate) setRate(lt.defaultRate);
    }
  };

  const downPaymentDollars = downIsPct
    ? (homePrice * downPayment) / 100
    : downPayment;

  const result = useMemo(
    () =>
      calculateMortgage({
        homePrice,
        downPayment: downPaymentDollars,
        loanTermYears,
        annualRatePct: rate,
        propertyTaxAnnual: taxAnnual,
        insuranceAnnual: insAnnual,
        loanType,
      }),
    [homePrice, downPaymentDollars, loanTermYears, rate, taxAnnual, insAnnual, loanType],
  );

  const chartData = [
    { name: "Principal & Interest", value: result.monthlyPI, color: "hsl(var(--primary))" },
    { name: "Property Tax", value: result.monthlyTax, color: "hsl(var(--accent))" },
    { name: "Insurance", value: result.monthlyInsurance, color: "hsl(var(--muted-foreground))" },
    ...(result.pmiRequired
      ? [{ name: "PMI", value: result.monthlyPMI, color: "hsl(var(--destructive))" }]
      : []),
  ];

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadEmail.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSubmitting(true);
    try {
      const parts = leadName.trim().split(/\s+/);
      const first_name = parts[0];
      const last_name = parts.slice(1).join(" ") || "—";
      const loanTypeLabel = LOAN_TYPES.find((l) => l.value === loanType)?.label || loanType;

      const summary = [
        `Source: Mortgage Calculator`,
        `Loan Type: ${loanTypeLabel}`,
        `Home Price: ${formatUSD(homePrice)}`,
        `Down Payment: ${formatUSD(downPaymentDollars)} (${((downPaymentDollars / homePrice) * 100).toFixed(1)}%)`,
        `Loan Amount: ${formatUSD(result.loanAmount)}`,
        `Term: ${loanTermYears} years`,
        `Rate: ${rate.toFixed(3)}%`,
        `Estimated Monthly Payment: ${formatUSD(result.totalMonthly, 2)}`,
        `  • P&I: ${formatUSD(result.monthlyPI, 2)}`,
        `  • Tax: ${formatUSD(result.monthlyTax, 2)}/mo`,
        `  • Insurance: ${formatUSD(result.monthlyInsurance, 2)}/mo`,
        result.pmiRequired ? `  • PMI: ${formatUSD(result.monthlyPMI, 2)}/mo` : null,
        `Total Interest: ${formatUSD(result.totalInterest)}`,
      ]
        .filter(Boolean)
        .join("\n");

      const { data, error } = await supabase.functions.invoke("submit-lead", {
        body: {
          first_name,
          last_name,
          email: leadEmail.trim(),
          phone: leadPhone.trim() || undefined,
          loan_purpose: loanTypeLabel,
          property_value: homePrice,
          source: "calculator",
          notes: summary,
          intent_tag: loanType.includes("fha")
            ? "FHA"
            : loanType.includes("va")
              ? "VA"
              : "purchase",
        },
      });

      if (error || (data && (data as { error?: string }).error)) {
        throw new Error((data as { error?: string })?.error || error?.message || "Submission failed");
      }

      setSubmitted(first_name);
      setLeadName("");
      setLeadEmail("");
      setLeadPhone("");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-[640px] lg:max-w-[960px] xl:max-w-[1040px]"
      >
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/95 px-6 py-4 backdrop-blur">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close calculator"
            className="flex h-9 w-9 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
          </button>
          <Calculator className="h-5 w-5 text-primary" />
          <SheetHeader className="flex-1 text-left">
            <SheetTitle className="font-display text-xl">Mortgage Calculator</SheetTitle>
            <SheetDescription className="text-xs">
              Estimate your monthly payment in seconds.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="grid gap-6 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          {/* LEFT COLUMN — Inputs */}
          <div className="space-y-6">
          {/* Home price */}
          <div className="space-y-2">
            <Label htmlFor="home-price">Home Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="home-price"
                type="number"
                min={0}
                value={homePrice}
                onChange={(e) => setHomePrice(Math.max(0, Number(e.target.value) || 0))}
                className="pl-7"
              />
            </div>
          </div>

          {/* Down payment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="down-payment">Down Payment</Label>
              <div className="flex items-center gap-2 text-xs">
                <span className={!downIsPct ? "font-medium" : "text-muted-foreground"}>$</span>
                <Switch checked={downIsPct} onCheckedChange={setDownIsPct} />
                <span className={downIsPct ? "font-medium" : "text-muted-foreground"}>%</span>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {downIsPct ? "%" : "$"}
              </span>
              <Input
                id="down-payment"
                type="number"
                min={0}
                max={downIsPct ? 100 : undefined}
                value={downPayment}
                onChange={(e) => setDownPayment(Math.max(0, Number(e.target.value) || 0))}
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {formatUSD(downPaymentDollars)} ({homePrice > 0 ? ((downPaymentDollars / homePrice) * 100).toFixed(1) : "0"}% of home price)
            </p>
          </div>

          {/* Loan type */}
          <div className="space-y-2">
            <Label>Loan Type</Label>
            <Select value={loanType} onValueChange={(v) => handleLoanTypeChange(v as LoanType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOAN_TYPES.map((lt) => (
                  <SelectItem key={lt.value} value={lt.value}>
                    {lt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Loan term */}
          <div className="space-y-2">
            <Label>Loan Term</Label>
            <Select value={String(loanTermYears)} onValueChange={(v) => setLoanTermYears(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERM_OPTIONS.map((t) => (
                  <SelectItem key={t} value={String(t)}>
                    {t} years
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Interest rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rate">Interest Rate</Label>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Edit Rate</span>
                <Switch
                  checked={editRate}
                  onCheckedChange={(v) => {
                    setEditRate(v);
                    if (!v) setRate(defaultRate);
                  }}
                />
              </div>
            </div>
            <div className="relative">
              <Input
                id="rate"
                type="number"
                step={0.001}
                min={0}
                max={20}
                value={rate}
                disabled={!editRate}
                onChange={(e) => setRate(Math.max(0, Number(e.target.value) || 0))}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
            <p className="flex items-start gap-1 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
              <span>Based on Mortgage News Daily + 0.275%. Rates are updated daily; your actual rate may vary.</span>
            </p>
          </div>

          {/* Property tax */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tax">Property Tax (annual)</Label>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Override</span>
                <Switch
                  checked={taxOverride}
                  onCheckedChange={(v) => {
                    setTaxOverride(v);
                    if (!v) setTaxAnnual(DEFAULT_PROPERTY_TAX_ANNUAL);
                  }}
                />
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="tax"
                type="number"
                min={0}
                value={taxAnnual}
                disabled={!taxOverride}
                onChange={(e) => setTaxAnnual(Math.max(0, Number(e.target.value) || 0))}
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {formatUSD(taxAnnual / 12, 2)} / month
            </p>
          </div>

          {/* Insurance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ins">Homeowners Insurance (annual)</Label>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Override</span>
                <Switch
                  checked={insOverride}
                  onCheckedChange={(v) => {
                    setInsOverride(v);
                    if (!v) setInsAnnual(DEFAULT_INSURANCE_ANNUAL);
                  }}
                />
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="ins"
                type="number"
                min={0}
                value={insAnnual}
                disabled={!insOverride}
                onChange={(e) => setInsAnnual(Math.max(0, Number(e.target.value) || 0))}
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {formatUSD(insAnnual / 12, 2)} / month
            </p>
          </div>
          </div>

          {/* RIGHT COLUMN — Results & lead capture (sticky on desktop) */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-4 rounded-lg border bg-card p-5">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated Monthly Payment</p>
              <p className="font-display text-4xl font-bold text-primary">
                {formatUSD(result.totalMonthly, 2)}
              </p>
            </div>

            {chartData.some((d) => d.value > 0) && (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {chartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatUSD(value, 2)}
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="space-y-2 text-sm">
              <Row label="Principal & Interest" value={formatUSD(result.monthlyPI, 2)} dotColor="hsl(var(--primary))" />
              <Row label="Property Tax" value={formatUSD(result.monthlyTax, 2)} dotColor="hsl(var(--accent))" />
              <Row label="Homeowners Insurance" value={formatUSD(result.monthlyInsurance, 2)} dotColor="hsl(var(--muted-foreground))" />
              {result.pmiRequired && (
                <Row
                  label={
                    <span className="flex items-center gap-1.5">
                      PMI
                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                        &lt; 20% down
                      </Badge>
                    </span>
                  }
                  value={formatUSD(result.monthlyPMI, 2)}
                  dotColor="hsl(var(--destructive))"
                />
              )}
              <Separator className="my-2" />
              <Row label="Total Loan Amount" value={formatUSD(result.loanAmount)} muted />
              <Row label="Total Interest Paid" value={formatUSD(result.totalInterest)} muted />
              <Row label="Total Cost of Loan" value={formatUSD(result.totalCost)} muted />
            </div>
          </div>

          {/* Lead capture */}
          {!showLeadForm && !submitted && (
            <Button
              size="lg"
              className="btn-shadow w-full"
              onClick={() => setShowLeadForm(true)}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Talk to a Loan Officer
            </Button>
          )}

          {showLeadForm && !submitted && (
            <form onSubmit={handleLeadSubmit} className="space-y-4 rounded-lg border bg-muted/30 p-5">
              <div>
                <h3 className="font-display text-base font-semibold">Talk to a Loan Officer</h3>
                <p className="text-xs text-muted-foreground">
                  Get a personalized rate quote — no credit check.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="lead-name">Full Name *</Label>
                  <Input
                    id="lead-name"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div>
                  <Label htmlFor="lead-email">Email *</Label>
                  <Input
                    id="lead-email"
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    required
                    maxLength={255}
                  />
                </div>
                <div>
                  <Label htmlFor="lead-phone">Phone (optional)</Label>
                  <Input
                    id="lead-phone"
                    type="tel"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    maxLength={20}
                  />
                </div>
              </div>

              <div className="rounded-md border bg-background/60 p-3 text-xs">
                <p className="mb-1.5 font-medium text-muted-foreground">Your Quote Summary</p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <dt className="text-muted-foreground">Loan Type</dt>
                  <dd className="text-right">{LOAN_TYPES.find((l) => l.value === loanType)?.label}</dd>
                  <dt className="text-muted-foreground">Home Price</dt>
                  <dd className="text-right">{formatUSD(homePrice)}</dd>
                  <dt className="text-muted-foreground">Down Payment</dt>
                  <dd className="text-right">{formatUSD(downPaymentDollars)}</dd>
                  <dt className="text-muted-foreground">Est. Monthly</dt>
                  <dd className="text-right font-semibold text-primary">{formatUSD(result.totalMonthly, 2)}</dd>
                </dl>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowLeadForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 btn-shadow" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send My Quote"}
                </Button>
              </div>
            </form>
          )}

          {submitted && (
            <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-semibold">Thanks {submitted}!</p>
                <p className="text-muted-foreground">
                  A loan officer will be in touch shortly. Feel free to keep exploring scenarios.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1 h-auto px-0"
                  onClick={() => setSubmitted(null)}
                >
                  Send another scenario
                </Button>
              </div>
            </div>
          )}

          <p className="pb-4 text-center text-[10px] text-muted-foreground">
            Estimates only. Not a loan commitment. NexGen Capital · NMLS #1766649
          </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const Row = ({
  label,
  value,
  dotColor,
  muted,
}: {
  label: React.ReactNode;
  value: string;
  dotColor?: string;
  muted?: boolean;
}) => (
  <div className={`flex items-center justify-between ${muted ? "text-muted-foreground" : ""}`}>
    <span className="flex items-center gap-2">
      {dotColor && <span className="h-2 w-2 rounded-full" style={{ background: dotColor }} />}
      {label}
    </span>
    <span className="font-medium">{value}</span>
  </div>
);

export default MortgageCalculator;