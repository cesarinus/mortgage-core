import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, AlertTriangle, CheckCircle2 } from "lucide-react";
import { loadMappings, type LosFieldMapping } from "@/lib/los/mappings";
import { buildLosPayload } from "@/lib/los/buildPayload";
import { computeReadiness } from "@/lib/los/readiness";
import { fireZapier } from "@/lib/integrations/zapier";
import { useToast } from "@/hooks/use-toast";

export default function LosPayloadTester() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<any[]>([]);
  const [leadId, setLeadId] = useState<string>("");
  const [mappings, setMappings] = useState<LosFieldMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: ls }, m] = await Promise.all([
        supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(50),
        loadMappings("arive"),
      ]);
      setLeads(ls ?? []);
      setMappings(m);
      setLoading(false);
    })();
  }, []);

  const lead = useMemo(() => leads.find((l) => l.id === leadId), [leads, leadId]);
  const built = useMemo(() => (lead ? buildLosPayload(lead, mappings) : null), [lead, mappings]);
  const readiness = useMemo(() => (lead ? computeReadiness(lead, mappings) : null), [lead, mappings]);

  const handleSend = async () => {
    if (!built || !lead) return;
    setSending(true);
    try {
      await fireZapier("lead.sent_to_los", { ...built.payload, crm_reference_id: lead.id, test_mode: true });
      toast({ title: "Test payload sent", description: "Check Zap history + LOS Logs to confirm." });
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  if (loading) return <div className="flex items-center gap-2 p-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">LOS Payload Tester</h1>
        <p className="text-muted-foreground text-sm">Pick any lead, preview the generated payload, see validation issues, and optionally send a test fire to Zapier.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Pick a lead</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Select value={leadId} onValueChange={setLeadId}>
            <SelectTrigger className="w-96"><SelectValue placeholder="Select a lead…" /></SelectTrigger>
            <SelectContent>
              {leads.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {(l.first_name ?? "") + " " + (l.last_name ?? "")} — {l.email ?? l.phone ?? l.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSend} disabled={!built || !built.validation.ok || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            Send test payload
          </Button>
        </CardContent>
      </Card>

      {built && readiness && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Readiness
                <Badge variant={readiness.score >= 80 ? "default" : readiness.score >= 50 ? "secondary" : "destructive"}>
                  {readiness.score}%
                </Badge>
              </CardTitle>
              <CardDescription>
                {readiness.requiredFilled}/{readiness.requiredTotal} required fields filled · {readiness.filled}/{readiness.total} total
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {built.validation.ok
                  ? <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Validation passed</>
                  : <><AlertTriangle className="h-4 w-4 text-amber-500" /> Validation issues</>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {built.validation.missing.length > 0 && (
                <div>
                  <p className="font-medium text-destructive mb-1">Missing required:</p>
                  <ul className="list-disc list-inside">
                    {built.validation.missing.map((i) => <li key={i.crm_field}>{i.external_field} <span className="text-muted-foreground">(CRM: {i.crm_field})</span></li>)}
                  </ul>
                </div>
              )}
              {built.validation.invalid.length > 0 && (
                <div>
                  <p className="font-medium text-amber-600 mb-1">Invalid format:</p>
                  <ul className="list-disc list-inside">
                    {built.validation.invalid.map((i) => <li key={i.crm_field}>{i.message} <span className="text-muted-foreground">(CRM: {i.crm_field})</span></li>)}
                  </ul>
                </div>
              )}
              {built.validation.ok && <p className="text-muted-foreground">All required fields present and well-formed.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Outbound payload preview</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-[420px]">{JSON.stringify(built.payload, null, 2)}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Field mappings</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-xs">
                <thead className="text-left text-muted-foreground">
                  <tr><th className="py-1">CRM</th><th>External</th><th>Type</th><th>Req</th><th>Value</th></tr>
                </thead>
                <tbody>
                  {mappings.filter((m) => m.active).map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="py-1">{m.crm_field}</td>
                      <td>{m.external_field}</td>
                      <td>{m.data_type}</td>
                      <td>{m.required ? "✓" : ""}</td>
                      <td className="font-mono">{JSON.stringify(built.payload[m.external_field])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}