import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { NOTIFICATION_CATALOG, getNotificationPrefs, upsertNotificationPrefs, type NotifChannel } from "@/lib/notifications/dispatch";
import { logAudit } from "@/lib/crm-fields/api";

const CHANNELS: { key: NotifChannel; label: string }[] = [
  { key: "in_app", label: "In-App" }, { key: "email", label: "Email" }, { key: "sms", label: "SMS" }, { key: "push", label: "Push" },
];

export default function NotificationCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<any>({ channels: {}, quiet_hours: { enabled: false, start: "22:00", end: "07:00", tz: "America/New_York" }, digest_mode: "instant" });

  useEffect(() => { if (user) getNotificationPrefs(user.id).then((p) => p && setPrefs((curr: any) => ({ ...curr, ...p }))); }, [user]);

  const setChan = (typeKey: string, ch: NotifChannel, val: boolean) => {
    setPrefs((p: any) => ({ ...p, channels: { ...p.channels, [typeKey]: { ...(p.channels?.[typeKey] ?? {}), [ch]: val } } }));
  };

  const save = async () => {
    if (!user) return;
    try {
      await upsertNotificationPrefs({ ...prefs, user_id: user.id });
      await logAudit({ entity_type: "notification_preference", entity_id: user.id, action: "updated", after: prefs });
      toast({ title: "Notification preferences saved" });
    } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground text-sm">Choose how and when you want to be alerted across the CRM.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Delivery</CardTitle><CardDescription>Quiet hours and digest mode apply to all categories below.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Quiet hours</Label><Switch checked={!!prefs.quiet_hours?.enabled} onCheckedChange={(v) => setPrefs((p: any) => ({ ...p, quiet_hours: { ...p.quiet_hours, enabled: v } }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="time" value={prefs.quiet_hours?.start ?? "22:00"} onChange={(e) => setPrefs((p: any) => ({ ...p, quiet_hours: { ...p.quiet_hours, start: e.target.value } }))} />
              <Input type="time" value={prefs.quiet_hours?.end ?? "07:00"} onChange={(e) => setPrefs((p: any) => ({ ...p, quiet_hours: { ...p.quiet_hours, end: e.target.value } }))} />
            </div>
            <p className="text-xs text-muted-foreground">Non-critical alerts during quiet hours are queued to your digest.</p>
          </div>
          <div className="space-y-2">
            <Label>Digest mode</Label>
            <div className="grid grid-cols-4 gap-2">
              {(["instant", "hourly", "daily", "weekly"] as const).map((m) => (
                <Button key={m} type="button" size="sm" variant={prefs.digest_mode === m ? "default" : "outline"} onClick={() => setPrefs((p: any) => ({ ...p, digest_mode: m }))} className="capitalize">{m}</Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Instant delivers immediately; others batch alerts.</p>
          </div>
        </CardContent>
      </Card>

      {NOTIFICATION_CATALOG.map((group) => (
        <Card key={group.category}>
          <CardHeader><CardTitle>{group.category}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/40">
                <tr>
                  <th className="text-left p-2">Notification</th>
                  {CHANNELS.map((c) => <th key={c.key} className="p-2 text-center w-16">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {group.types.map((t) => (
                  <tr key={t.key} className="border-t">
                    <td className="p-2">{t.label}</td>
                    {CHANNELS.map((c) => (
                      <td key={c.key} className="p-2 text-center">
                        <Checkbox checked={!!prefs.channels?.[t.key]?.[c.key]} onCheckedChange={(v) => setChan(t.key, c.key, !!v)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} size="lg">Save preferences</Button>
      </div>
    </div>
  );
}