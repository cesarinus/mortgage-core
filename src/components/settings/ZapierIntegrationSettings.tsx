import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Zap, Loader2 } from "lucide-react";
import { fireZapier } from "@/lib/integrations/zapier";

const EVENT_OPTIONS: { id: string; label: string; description: string }[] = [
  { id: "lead.created", label: "Lead created", description: "Fires when a new lead is added to the CRM." },
  { id: "lead.status_changed", label: "Lead status changed", description: "Fires on new → contacted → qualified transitions." },
  { id: "lead.sent_to_los", label: "Lead sent to LOS", description: "Fires when you click 'Send to LOS' on a lead/deal. Use this in Zapier to create the loan in Arive." },
  { id: "deal.stage_changed", label: "Deal stage changed", description: "Fires when a pipeline opportunity moves stages." },
  { id: "deal.closed", label: "Deal closed", description: "Fires when a deal reaches the closed stage." },
  { id: "document.uploaded", label: "Document uploaded", description: "Fires when a borrower document is uploaded." },
];

export default function ZapierIntegrationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [events, setEvents] = useState<string[]>(["lead.created", "deal.stage_changed", "deal.closed"]);
  const [lastFiredAt, setLastFiredAt] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("integration_webhooks")
      .select("url, enabled, events, last_fired_at, last_status")
      .eq("user_id", user.id)
      .eq("provider", "zapier")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setUrl(data.url ?? "");
          setEnabled(data.enabled ?? true);
          setEvents(data.events ?? []);
          setLastFiredAt(data.last_fired_at ?? null);
          setLastStatus(data.last_status ?? null);
        }
        setLoading(false);
      });
  }, [user]);

  const toggleEvent = (id: string, checked: boolean) => {
    setEvents((prev) => (checked ? Array.from(new Set([...prev, id])) : prev.filter((e) => e !== id)));
  };

  const save = async () => {
    if (!user) return;
    if (!url.startsWith("https://hooks.zapier.com/")) {
      toast({
        title: "Invalid URL",
        description: "Paste a Zapier catch hook URL (https://hooks.zapier.com/...).",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("integration_webhooks")
      .upsert(
        { user_id: user.id, provider: "zapier", url, enabled, events },
        { onConflict: "user_id,provider" },
      );
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Zapier integration saved" });
    }
  };

  const sendTest = async () => {
    setTesting(true);
    await fireZapier("test.ping", {
      message: "Test payload from NexGen CRM",
      user_email: user?.email ?? null,
    });
    setTesting(false);
    toast({
      title: "Test payload sent",
      description: "Check your Zap's run history in Zapier to confirm it fired.",
    });
    // refresh diagnostics
    if (user) {
      const { data } = await supabase
        .from("integration_webhooks")
        .select("last_fired_at, last_status")
        .eq("user_id", user.id)
        .eq("provider", "zapier")
        .maybeSingle();
      if (data) {
        setLastFiredAt(data.last_fired_at ?? null);
        setLastStatus(data.last_status ?? null);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> Zapier Integration
        </CardTitle>
        <CardDescription>
          Push CRM events to Zapier, which can forward them to Arive LOS or any other Zapier-connected app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1">
          <Label>Webhook URL</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            In Zapier: create a Zap with the trigger <strong>Webhooks by Zapier → Catch Hook</strong>, then paste the URL here.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
          <div>
            <Label>Enabled</Label>
            <p className="text-xs text-muted-foreground">When off, no events are sent.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <Label>Events to send</Label>
          <div className="space-y-2">
            {EVENT_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className="flex items-start gap-3 rounded-md border border-border/60 p-3 cursor-pointer hover:bg-accent/40"
              >
                <Checkbox
                  checked={events.includes(opt.id)}
                  onCheckedChange={(c) => toggleEvent(opt.id, c === true)}
                />
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {lastFiredAt && (
          <p className="text-xs text-muted-foreground">
            Last fired: {new Date(lastFiredAt).toLocaleString()} — {lastStatus ?? "—"}
          </p>
        )}

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
          <Button variant="outline" onClick={sendTest} disabled={testing || !url}>
            {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send test payload
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}