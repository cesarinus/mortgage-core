import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface Props { leadId: string }

export default function LosSyncCard({ leadId }: Props) {
  const [loan, setLoan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("los_loans")
        .select("*")
        .eq("lead_id", leadId)
        .order("last_synced_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) { setLoan(data); setLoading(false); }
    })();
    return () => { active = false; };
  }, [leadId]);

  if (loading || !loan) return null;

  const conditions: string[] = Array.isArray(loan.conditions) ? loan.conditions : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <RefreshCw className="h-4 w-4 text-primary" /> Arive LOS sync
          {loan.loan_status && <Badge variant="secondary" className="capitalize">{String(loan.loan_status).replace(/_/g, " ")}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Arive loan id" value={loan.arive_loan_id} />
          <Field label="Loan program" value={loan.loan_program} />
          <Field label="Purchase price" value={loan.purchase_price ? `$${Number(loan.purchase_price).toLocaleString()}` : null} />
          <Field label="Loan amount" value={loan.loan_amount ? `$${Number(loan.loan_amount).toLocaleString()}` : null} />
          <Field label="Interest rate" value={loan.interest_rate ? `${loan.interest_rate}%` : null} />
          <Field label="Est. close date" value={loan.estimated_close_date ? format(new Date(loan.estimated_close_date), "PP") : null} />
          <Field label="DU findings" value={loan.du_findings} />
          <Field label="Last synced" value={loan.last_synced_at ? format(new Date(loan.last_synced_at), "PPp") : null} />
        </div>
        {conditions.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Outstanding conditions</div>
            <ul className="list-disc list-inside text-xs space-y-0.5">
              {conditions.map((c, i) => (<li key={i}>{c}</li>))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div>{value || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}