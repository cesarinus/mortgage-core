import ZapierIntegrationSettings from "@/components/settings/ZapierIntegrationSettings";
export default function ZapierSection() {
  return (
    <div className="max-w-3xl space-y-4">
      <div><h1 className="text-2xl font-bold tracking-tight">Zapier</h1><p className="text-muted-foreground text-sm">Outbound webhooks to Zapier for LOS, Slack, and other automations.</p></div>
      <ZapierIntegrationSettings />
    </div>
  );
}