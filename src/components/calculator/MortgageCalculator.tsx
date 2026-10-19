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
import { Calculator, Info, MessageCircle, CheckCircle2, Loader2, X, Printer, Mail, ExternalLink } from "lucide-react";

const CALCULATOR_URL = "https://nexgen-capital.com/calculators";
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
  const [submitting, setSubmitting] = useState<null | "quote" | "email" | "print">(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"quote" | "email" | "print">("quote");

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

  const buildSummary = (loanTypeLabel: string) =>
    [
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

  const printQuote = (name: string, loanTypeLabel: string) => {
    const w = window.open("", "_blank", "width=820,height=900");
    if (!w) {
      toast.error("Pop-up blocked. Allow pop-ups to print your quote.");
      return;
    }
    const pmiRow = result.pmiRequired
      ? `<tr><td>PMI</td><td style="text-align:right">${formatUSD(result.monthlyPMI, 2)}</td></tr>`
      : "";
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>NexGen Capital Mortgage Quote</title>
      <style>
        body{font-family:Arial,sans-serif;color:#0f172a;max-width:720px;margin:32px auto;padding:0 24px;}
        h1{color:#ea580c;margin:0 0 4px;font-size:24px;}
        h2{font-size:14px;margin:24px 0 8px;}
        .hero{background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:18px;text-align:center;margin:16px 0 24px;}
        .hero .label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#9a3412;}
        .hero .amount{font-size:32px;font-weight:700;color:#ea580c;margin-top:4px;}
        table{width:100%;border-collapse:collapse;font-size:14px;margin-bottom:8px;}
        td{padding:6px 0;color:#334155;}
        td.label{color:#64748b;}
        tr.total td{border-top:1px solid #e2e8f0;font-weight:700;color:#ea580c;padding-top:10px;}
        footer{margin-top:32px;font-size:11px;color:#94a3b8;text-align:center;}
      </style></head><body>
      <h1>Your Mortgage Quote</h1>
      <p>Prepared for ${name} · NexGen Capital</p>
      <div class="hero"><div class="label">Estimated Monthly Payment</div><div class="amount">${formatUSD(result.totalMonthly, 2)}</div></div>
      <h2>Loan Details</h2>
      <table>
        <tr><td class="label">Loan Type</td><td style="text-align:right">${loanTypeLabel}</td></tr>
        <tr><td class="label">Home Price</td><td style="text-align:right">${formatUSD(homePrice)}</td></tr>
        <tr><td class="label">Down Payment</td><td style="text-align:right">${formatUSD(downPaymentDollars)} (${((downPaymentDollars / homePrice) * 100).toFixed(1)}%)</td></tr>
        <tr><td class="label">Loan Amount</td><td style="text-align:right">${formatUSD(result.loanAmount)}</td></tr>
        <tr><td class="label">Term</td><td style="text-align:right">${loanTermYears} years</td></tr>
        <tr><td class="label">Interest Rate</td><td style="text-align:right">${rate.toFixed(3)}%</td></tr>
      </table>
      <h2>Monthly Breakdown</h2>
      <table>
        <tr><td>Principal &amp; Interest</td><td style="text-align:right">${formatUSD(result.monthlyPI, 2)}</td></tr>
        <tr><td>Property Tax</td><td style="text-align:right">${formatUSD(result.monthlyTax, 2)}</td></tr>
        <tr><td>Homeowners Insurance</td><td style="text-align:right">${formatUSD(result.monthlyInsurance, 2)}</td></tr>
        ${pmiRow}
        <tr class="total"><td>Total Monthly</td><td style="text-align:right">${formatUSD(result.totalMonthly, 2)}</td></tr>
      </table>
      <p style="font-size:13px;color:#475569;">Total Interest Paid: <strong>${formatUSD(result.totalInterest)}</strong></p>
      <footer>Estimates only. Not a loan commitment. NexGen Capital · NMLS #1766649</footer>
      <script>window.onload=()=>{setTimeout(()=>window.print(),250);}</script>
      </body></html>`);
    w.document.close();
  };

  const handleAction = async (action: "quote" | "email" | "print", e?: React.FormEvent) => {
    e?.preventDefault();
    if (!leadName.trim() || !leadEmail.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSubmitting(action);
    try {
      const parts = leadName.trim().split(/\s+/);
      const first_name = parts[0];
      const last_name = parts.slice(1).join(" ") || "—";
      const loanTypeLabel = LOAN_TYPES.find((l) => l.value === loanType)?.label || loanType;
      const sourceMap = { quote: "calculator", email: "calculator_email", print: "calculator_print" } as const;

      const { data, error } = await supabase.functions.invoke("submit-lead", {
        body: {
          first_name,
          last_name,
          email: leadEmail.trim(),
          phone: leadPhone.trim() || undefined,
          loan_purpose: loanTypeLabel,
          property_value: homePrice,
          source: sourceMap[action],
          notes: buildSummary(loanTypeLabel),
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

      if (action === "email") {
        const { error: emailErr } = await supabase.functions.invoke("email-quote", {
          body: {
            to: leadEmail.trim(),
            name: first_name,
            loanType: loanTypeLabel,
            homePrice,
            downPayment: downPaymentDollars,
            downPaymentPct: homePrice > 0 ? (downPaymentDollars / homePrice) * 100 : 0,
            loanAmount: result.loanAmount,
            termYears: loanTermYears,
            rate,
            monthlyPI: result.monthlyPI,
            monthlyTax: result.monthlyTax,
            monthlyInsurance: result.monthlyInsurance,
            monthlyPMI: result.monthlyPMI,
            pmiRequired: result.pmiRequired,
            totalMonthly: result.totalMonthly,
            totalInterest: result.totalInterest,
          },
        });
        if (emailErr) {
          toast.error("We saved your info, but the email failed to send. A loan officer will reach out.");
        } else {
          toast.success("Quote sent to your inbox!");
        }
      } else if (action === "print") {
        printQuote(first_name, loanTypeLabel);
        toast.success("Opening print preview…");
      }

      setSubmitted(first_name);
      setLeadName("");
      setLeadEmail("");
      setLeadPhone("");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[640px] lg:max-w-[960px] xl:max-w-[1040px]"
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

        <div className="flex flex-1 flex-col">
          <iframe
            src={CALCULATOR_URL}
            title="NexGen Capital mortgage calculators"
            className="w-full flex-1 border-0"
            style={{ minHeight: "calc(100vh - 120px)" }}
            loading="lazy"
          />
          <div className="border-t px-6 py-3 text-center text-xs text-muted-foreground">
            Calculator not loading?{" "}
            <a href={CALCULATOR_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
              Open in new tab <ExternalLink className="h-3 w-3" />
            </a>
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