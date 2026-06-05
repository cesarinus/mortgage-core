import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, ChevronLeft, ChevronRight, Flame, Snowflake, ThermometerSun } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  EMPTY_INTAKE, IntakeData, computeDti, computeScore, computeTemperature,
  deriveSignals, estimateMonthlyPayment, saveLeadIntake,
} from "@/lib/crm/leadIntake";
import { RecordLookup } from "@/components/crm/RecordLookup";
import { fetchAllContacts, fetchAllCompanies } from "@/lib/crm/queries";

interface Props {
  leadId?: string | null;
  initial?: IntakeData;
  sources?: { id: string; name: string }[];
  onSaved?: (leadId: string, result?: any) => void;
  onCancel?: () => void;
}

const STEPS = ["Basics", "Mortgage Intent", "Financial Snapshot", "Smart Summary"] as const;

const DRAFT_KEY = (id?: string | null) => `smartLeadDraft:${id ?? "new"}`;

export function SmartLeadForm({ leadId, initial, sources = [], onSaved, onCancel }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<IntakeData>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY(leadId));
      if (raw) return { ...EMPTY_INTAKE, ...(initial ?? {}), ...JSON.parse(raw) };
    } catch {}
    return { ...EMPTY_INTAKE, ...(initial ?? {}) };
  });

  const [contactsList, setContactsList] = useState<any[]>([]);
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  useEffect(() => {
    fetchAllContacts().then(setContactsList).catch(() => {});
    fetchAllCompanies().then(setCompaniesList).catch(() => {});
  }, []);

  const contactItems = useMemo(() => contactsList.map((c: any) => ({
    id: c.id,
    label: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "(no name)",
    sub: [c.email, c.role].filter(Boolean).join(" · "),
  })), [contactsList]);
  const companyItems = useMemo(() => companiesList.map((c: any) => ({
    id: c.id,
    label: c.name,
    sub: [c.company_type, c.industry].filter(Boolean).join(" · "),
  })), [companiesList]);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY(leadId), JSON.stringify(data)); } catch {}
  }, [data, leadId]);

  const set = <K extends keyof IntakeData>(k: K, v: IntakeData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const score = computeScore(data);
  const temp = computeTemperature(score);
  const dti = computeDti(data);
  const monthly = estimateMonthlyPayment(data);
  const signals = useMemo(() => deriveSignals(data), [data]);

  const canNext =
    (step === 0 && data.first_name && data.last_name) ||
    step !== 0;

  const submit = async () => {
    if (!user?.id) { toast({ title: "Not authenticated", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const result = await saveLeadIntake(user.id, leadId ?? null, data);
      try { localStorage.removeItem(DRAFT_KEY(leadId)); } catch {}
      toast({ title: leadId ? "Intake updated" : "Lead created", description: `Score ${result.score} · ${result.temperature.toUpperCase()}` });
      onSaved?.(result.leadId, result);
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              i === step
                ? "bg-primary text-primary-foreground border-primary"
                : i < step
                ? "bg-muted text-foreground border-border"
                : "bg-background text-muted-foreground border-border"
            }`}
          >
            <span className="font-mono mr-1">{i + 1}</span>{label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>Score</span>
          <Badge variant="secondary" className="font-mono">{score}</Badge>
          <TempBadge t={temp} />
        </div>
      </div>

      {step === 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name *"><Input value={data.first_name} onChange={e => set("first_name", e.target.value)} /></Field>
          <Field label="Last name *"><Input value={data.last_name} onChange={e => set("last_name", e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={data.email} onChange={e => set("email", e.target.value)} /></Field>
          <Field label="Phone"><Input value={data.phone} onChange={e => set("phone", e.target.value)} /></Field>
          <Field label="Source">
            <Select value={data.source_id ?? ""} onValueChange={v => set("source_id", v || null)}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                {sources.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Preferred contact time">
            <Select value={data.preferred_contact_time || ""} onValueChange={v => set("preferred_contact_time", v as any)}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Referral source" className="col-span-2">
            <Select value={data.referral_source || ""} onValueChange={v => set("referral_source", v as any)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="realtor">Realtor</SelectItem>
                <SelectItem value="zillow">Zillow</SelectItem>
                <SelectItem value="paid_ads">Paid ads</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="repeat">Repeat</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Primary borrower (link existing contact — optional)" className="col-span-2">
            <RecordLookup
              value={data.primary_borrower_id}
              onChange={(id) => set("primary_borrower_id", id)}
              items={contactItems}
              placeholder="Auto-create from name above, or pick existing contact"
              emptyText="No contacts yet"
            />
          </Field>
          <Field label="Co-borrower (optional)">
            <RecordLookup
              value={data.co_borrower_id}
              onChange={(id) => set("co_borrower_id", id)}
              items={contactItems.filter(i => i.id !== data.primary_borrower_id)}
              placeholder="Select co-borrower"
              emptyText="No contacts yet"
            />
          </Field>
          <Field label="Company (employer, title, brokerage — optional)">
            <RecordLookup
              value={data.company_id}
              onChange={(id) => set("company_id", id)}
              items={companyItems}
              placeholder="Select company"
              emptyText="No companies yet"
            />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Loan purpose">
            <Select value={data.loan_purpose || ""} onValueChange={v => set("loan_purpose", v as any)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="refinance">Refinance</SelectItem>
                <SelectItem value="cash_out_refi">Cash-out refi</SelectItem>
                <SelectItem value="heloc">HELOC</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Property type">
            <Select value={data.property_type || ""} onValueChange={v => set("property_type", v as any)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single_family">Single family</SelectItem>
                <SelectItem value="condo">Condo</SelectItem>
                <SelectItem value="townhome">Townhome</SelectItem>
                <SelectItem value="multi_unit">Multi-unit</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Occupancy">
            <Select value={data.occupancy || ""} onValueChange={v => set("occupancy", v as any)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Timeline">
            <Select value={data.timeline || ""} onValueChange={v => set("timeline", v as any)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="immediately">Immediately</SelectItem>
                <SelectItem value="1_3_months">1-3 months</SelectItem>
                <SelectItem value="3_6_months">3-6 months</SelectItem>
                <SelectItem value="just_browsing">Just browsing</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={`Property value: $${(data.property_value ?? 0).toLocaleString()}`} className="col-span-2">
            <Slider
              value={[Number(data.property_value ?? 0)]}
              min={0} max={2000000} step={5000}
              onValueChange={(v) => set("property_value", v[0])}
            />
            <Input
              type="number" className="mt-2"
              value={data.property_value ?? ""}
              onChange={e => set("property_value", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
          <Field label={`Down payment: $${(data.down_payment ?? 0).toLocaleString()}`} className="col-span-2">
            <Slider
              value={[Number(data.down_payment ?? 0)]}
              min={0} max={Math.max(500000, Number(data.property_value ?? 0))} step={1000}
              onValueChange={(v) => set("down_payment", v[0])}
            />
            <Input
              type="number" className="mt-2"
              value={data.down_payment ?? ""}
              onChange={e => set("down_payment", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
          <Field label="Estimated credit range" className="col-span-2">
            <Select value={data.credit_range || ""} onValueChange={v => set("credit_range", v as any)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excellent (740+)</SelectItem>
                <SelectItem value="good">Good (660-739)</SelectItem>
                <SelectItem value="fair">Fair (580-659)</SelectItem>
                <SelectItem value="needs_work">Needs work (&lt;580)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Annual household income">
            <Input type="number" value={data.annual_income ?? ""} onChange={e => set("annual_income", e.target.value === "" ? null : Number(e.target.value))} />
          </Field>
          <Field label="Monthly debts (car, student, cards)">
            <Input type="number" value={data.monthly_debts ?? ""} onChange={e => set("monthly_debts", e.target.value === "" ? null : Number(e.target.value))} />
          </Field>
          <Field label="Employment status" className="col-span-2">
            <Select value={data.employment_type || ""} onValueChange={v => set("employment_type", v)} disabled={data.self_employed}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="w2">W-2 Employee</SelectItem>
                <SelectItem value="1099">1099 Contractor</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
                <SelectItem value="unemployed">Unemployed</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="col-span-2 flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Self-employed</p>
              <p className="text-xs text-muted-foreground">Requires extra documentation</p>
            </div>
            <Switch checked={!!data.self_employed} onCheckedChange={(v) => set("self_employed", v)} />
          </div>
          {data.self_employed && (
            <Card className="col-span-2 bg-muted/30">
              <CardContent className="p-3 text-sm space-y-1">
                <p className="font-medium">Self-employed checklist</p>
                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                  <li>2 years of personal tax returns</li>
                  <li>2 years of business tax returns</li>
                  <li>YTD profit & loss statement</li>
                </ul>
              </CardContent>
            </Card>
          )}
          <Card className="col-span-2">
            <CardContent className="p-3 grid grid-cols-2 gap-3 text-sm">
              <Stat label="Est. DTI" value={`${dti}%`} accent={dti > 43 ? "danger" : dti > 36 ? "warn" : "ok"} />
              <Stat label="Est. monthly payment" value={monthly ? `$${monthly.toLocaleString()}` : "—"} />
            </CardContent>
          </Card>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Lead Score</p>
                  <p className="text-2xl font-semibold font-mono">{score}</p>
                </div>
                <TempBadge t={temp} large />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Est. DTI" value={`${dti}%`} accent={dti > 43 ? "danger" : "ok"} />
                <Stat label="Est. monthly" value={monthly ? `$${monthly.toLocaleString()}` : "—"} />
              </div>
              <Separator />
              <p className="text-sm">{signals.summary}</p>
            </CardContent>
          </Card>

          <SignalList title="Positive signals" items={signals.positives} tone="ok" />
          <SignalList title="Challenges" items={signals.challenges} tone="warn" />
          <SignalList title="Recommended next steps" items={signals.recommendations} tone="info" />

          <Field label="Notes">
            <Textarea rows={3} value={data.notes ?? ""} onChange={e => set("notes", e.target.value)} />
          </Field>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2">
          {onCancel && <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>}
          {step > 0 && (
            <Button variant="outline" type="button" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {step < STEPS.length - 1 ? (
            <Button type="button" disabled={!canNext} onClick={() => setStep(s => s + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button type="button" disabled={saving || !data.first_name || !data.last_name} onClick={submit}>
              <Check className="h-4 w-4 mr-1" /> {leadId ? "Save Intake" : "Create Lead"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "ok" | "warn" | "danger" }) {
  const color = accent === "danger" ? "text-red-600" : accent === "warn" ? "text-amber-600" : "text-foreground";
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function TempBadge({ t, large = false }: { t: "hot" | "warm" | "cold"; large?: boolean }) {
  const size = large ? "text-sm py-1 px-2.5" : "";
  if (t === "hot") return <Badge className={`bg-red-500/15 text-red-600 gap-1 border-red-500/20 ${size}`}><Flame className="h-3 w-3" />HOT</Badge>;
  if (t === "warm") return <Badge className={`bg-amber-500/15 text-amber-600 gap-1 border-amber-500/20 ${size}`}><ThermometerSun className="h-3 w-3" />WARM</Badge>;
  return <Badge variant="secondary" className={`gap-1 ${size}`}><Snowflake className="h-3 w-3" />COLD</Badge>;
}

function SignalList({ title, items, tone }: { title: string; items: string[]; tone: "ok" | "warn" | "info" }) {
  if (items.length === 0) return null;
  const cls = tone === "ok"
    ? "border-emerald-500/30 bg-emerald-500/5"
    : tone === "warn"
    ? "border-amber-500/30 bg-amber-500/5"
    : "border-primary/30 bg-primary/5";
  return (
    <Card className={cls}>
      <CardContent className="p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{title}</p>
        <ul className="text-sm space-y-1 list-disc pl-4">
          {items.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </CardContent>
    </Card>
  );
}