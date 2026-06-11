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
import { validateAriveLead } from "@/lib/los/ariveValidate";

interface Props {
  lead: any;
  opportunity?: { id?: string; loan_amount?: number | null; property_address?: string | null } | null;
  mortgageProfile?: any | null;
  onSent?: () => void;
}

export default function SendToLosButton({ lead, opportunity, mortgageProfile, onSent }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const sent = !!lead?.sent_to_los_at;

  const validation = validateAriveLead(lead, mortgageProfile);
  const missing = validation.errors.map((e) => ({ key: e.field, label: `${e.field} (${e.code})` }));

  const handleSend = async () => {
    setSending(true);
    const logBase = {
      lead_id: lead.id,
      user_id: user?.id ?? null,
      export_system: "arive",
      payload: validation.payload as any,
      validation_errors: validation.errors as any,
    };
    if (!validation.ok) {
      await (supabase as any).from("lead_export_logs").insert({ ...logBase, status: "invalid" });
      toast({ title: "Cannot export", description: "Resolve validation issues first.", variant: "destructive" });
      setSending(false);
      return;
    }
    try {
      // Flat, ARIVE-compatible payload + small envelope of internal references.
      const payload = {
        ...validation.payload,
        crm_reference_id: lead.id,
        deal_id: opportunity?.id ?? null,
        loan_officer_email: user?.email ?? null,
      };
      await fireZapier("lead.sent_to_los", payload);

      await supabase
        .from("leads")
        .update({ sent_to_los_at: new Date().toISOString() })
        .eq("id", lead.id);

      await (supabase as any).from("lead_export_logs").insert({
        ...logBase,
        status: "success",
        response: { zapier: { note: "no-cors POST — confirm in Zap history" } } as any,
      });

      toast({
        title: "Sent to LOS",
        description: "Zapier received the payload. Check Zap history to confirm.",
      });
      onSent?.();
    } catch (e: any) {
      await (supabase as any).from("lead_export_logs").insert({
        ...logBase,
        status: "failed",
        response: { error: String(e?.message ?? e) } as any,
      });
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