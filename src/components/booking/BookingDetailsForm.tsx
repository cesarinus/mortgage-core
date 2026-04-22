import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LOAN_TYPES } from "@/lib/booking";
import { Loader2, ArrowLeft } from "lucide-react";

export interface BookingFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  loanType: string;
  meetingType: "call" | "zoom";
  notes: string;
}

interface Props {
  submitting: boolean;
  onSubmit: (v: BookingFormValues) => void;
  onBack: () => void;
}

export default function BookingDetailsForm({ submitting, onSubmit, onBack }: Props) {
  const [values, setValues] = useState<BookingFormValues>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    loanType: "",
    meetingType: "call",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BookingFormValues, string>>>({});

  const set = <K extends keyof BookingFormValues>(k: K, v: BookingFormValues[K]) =>
    setValues((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!values.firstName.trim()) next.firstName = "Required";
    if (!values.lastName.trim()) next.lastName = "Required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = "Valid email required";
    if (values.phone.trim().length < 7) next.phone = "Valid phone required";
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="firstName">First name *</Label>
          <Input id="firstName" value={values.firstName} onChange={(e) => set("firstName", e.target.value)} maxLength={80} />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="lastName">Last name *</Label>
          <Input id="lastName" value={values.lastName} onChange={(e) => set("lastName", e.target.value)} maxLength={80} />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">Email *</Label>
        <Input id="email" type="email" value={values.email} onChange={(e) => set("email", e.target.value)} maxLength={255} />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="phone">Phone *</Label>
        <Input id="phone" type="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} maxLength={30} />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
      </div>

      <div className="space-y-1">
        <Label>Loan type</Label>
        <Select value={values.loanType} onValueChange={(v) => set("loanType", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a loan type (optional)" />
          </SelectTrigger>
          <SelectContent>
            {LOAN_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Meeting type *</Label>
        <RadioGroup
          value={values.meetingType}
          onValueChange={(v) => set("meetingType", v as "call" | "zoom")}
          className="grid grid-cols-2 gap-3"
        >
          <Label htmlFor="mt-call" className="flex cursor-pointer items-center gap-2 rounded-md border border-input p-3 hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-accent">
            <RadioGroupItem value="call" id="mt-call" />
            <span className="text-sm font-medium">Phone Call</span>
          </Label>
          <Label htmlFor="mt-zoom" className="flex cursor-pointer items-center gap-2 rounded-md border border-input p-3 hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-accent">
            <RadioGroupItem value="zoom" id="mt-zoom" />
            <span className="text-sm font-medium">Zoom Video</span>
          </Label>
        </RadioGroup>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">Anything you'd like us to know? (optional)</Label>
        <Textarea id="notes" value={values.notes} onChange={(e) => set("notes", e.target.value)} maxLength={1000} rows={4} />
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onBack} disabled={submitting}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button type="submit" disabled={submitting} className="btn-shadow">
          {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Booking…</>) : "Confirm Booking"}
        </Button>
      </div>
    </form>
  );
}