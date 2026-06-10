import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fireZapier } from "@/lib/integrations/zapier";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { calcLoanAmountFromProfile } from "@/lib/loan/calcLoanAmount";

interface Props {
  lead: any;
  opportunity?: { id?: string; loan_amount?: number | null; property_address?: string | null } | null;
  mortgageProfile?: any | null;
  onSent?: () => void;
}

const REQUIRED_FIELDS: { key: string; label: string }[] = [
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "loan_purpose", label: "Loan purpose" },
];

export default function SendToLosButton({ lead, opportunity, mortgageProfile, onSent }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const sent = !!lead?.sent_to_los_at;

  const missing = REQUIRED_FIELDS.filter((f) => !lead?.[f.key]);
  const propertyAddress = opportunity?.property_address || lead?.property_address;
  const computed = calcLoanAmountFromProfile(mortgageProfile, lead);
  const loanAmount = opportunity?.loan_amount ?? lead?.loan_amount ?? computed;
  if (!propertyAddress) missing.push({ key: "property_address", label: "Property address" });
  if (!loanAmount) missing.push({ key: "loan_amount", label: "Loan amount" });

  const handleSend = async () => {
    setSending(true);
    try {
      const payload = {
        crm_reference_id: lead.id,
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        loan_purpose: lead.loan_purpose,
        loan_amount: loanAmount,
        estimated_credit_score: lead.credit_range,
        property_address: propertyAddress,
        property_type: lead.property_type,
        property_value: lead.property_value,
        annual_income: lead.annual_income,
        employment_status: lead.employment_type,
        timeline: lead.timeline,
        loan_officer_email: user?.email ?? null,
        deal_id: opportunity?.id ?? null,
        sent_at: new Date().toISOString(),
      };
      await fireZapier("lead.sent_to_los", payload);

      await supabase
        .from("leads")
        .update({ sent_to_los_at: new Date().toISOString() })
        .eq("id", lead.id);

      toast({
        title: "Sent to LOS",
        description: "Zapier received the payload. Check Zap history to confirm.",
      });
      onSent?.();
    } catch (e: any) {
      toast({ title: "Send failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant={sent ? "outline" : "default"}
          className="w-full"
          disabled={sending || (!sent && missing.length > 0)}
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : sent ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
          {sent ? "Re-sync to LOS" : "Send to LOS"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{sent ? "Re-sync this lead to Arive LOS?" : "Send this lead to Arive LOS?"}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                This fires the <code className="text-xs">lead.sent_to_los</code> Zapier event. Zapier will
                create (or update) the loan in Arive. Borrower consent is collected inside Arive.
              </p>
              {missing.length > 0 ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2">
                  <p className="font-medium text-destructive mb-1">Missing required fields:</p>
                  <ul className="list-disc list-inside text-xs">
                    {missing.map((m) => (<li key={m.key}>{m.label}</li>))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  CRM Reference Id: <code>{lead.id}</code>
                </p>
              )}
              {sent && (
                <p className="text-xs text-muted-foreground">
                  Last sent: {format(new Date(lead.sent_to_los_at), "PPp")}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSend} disabled={missing.length > 0}>
            {sent ? "Re-sync" : "Send"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}