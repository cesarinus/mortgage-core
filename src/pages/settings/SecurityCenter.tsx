import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Shield, Activity, Sparkles, AlertTriangle } from "lucide-react";

export default function SecurityCenter() {
  const [settings, setSettings] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [recs, setRecs] = useState<{ title: string; detail: string }[]>([]);

  async function load() {
    const sb: any = supabase;
    const [s, sess, ev] = await Promise.all([
      sb.from("security_settings").select("*").limit(1).maybeSingle(),
      sb.from("user_sessions").select("*, profiles(email)").order("last_seen_at", { ascending: false }).limit(20),
      sb.from("security_events").select("*").order("created_at", { ascending: false }).limit(30),
    ]);
    setSettings(s.data);
    setSessions(sess.data || []);
    setEvents(ev.data || []);

    const [admins, errLogs] = await Promise.all([
      sb.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin"),
      sb.from("los_integration_logs").select("id", { count: "exact", head: true }).eq("status", "error").gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    ]);
    const r: { title: string; detail: string }[] = [];
    if ((admins.count || 0) > 3) r.push({ title: `${admins.count} users have admin access`, detail: "Review and reduce to least-privilege roles." });
    if ((errLogs.count || 0) > 5) r.push({ title: "ARIVE sync failures increasing", detail: "Review your mappings in the LOS Mapping Center." });
    if (!r.length) r.push({ title: "All clear", detail: "No security recommendations at this time." });
    setRecs(r);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!settings) return;
    const { error } = await (supabase as any).from("security_settings").update({
      password_policy: settings.password_policy,
      session_timeout_minutes: settings.session_timeout_minutes,
      lockout_threshold: settings.lockout_threshold,
      lockout_minutes: settings.lockout_minutes,
      mfa_mode: settings.mfa_mode,
      mfa_default_channel: settings.mfa_default_channel,
    }).eq("id", settings.id);
    if (error) return toast.error(error.message);
    toast.success("Security settings saved");
  }

  if (!settings) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Security Center</h1>
        <p className="text-sm text-muted-foreground">Login security, MFA, sessions, and audit.</p>
      </div>

      <Tabs defaultValue="login">
        <TabsList>
          <TabsTrigger value="login">Login Security</TabsTrigger>
          <TabsTrigger value="mfa">MFA</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="ai">AI Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Login Policy</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground">Password Min Length</label><Input type="number" value={settings.password_policy?.min_length || 10} onChange={e => setSettings({ ...settings, password_policy: { ...settings.password_policy, min_length: +e.target.value } })} className="h-8" /></div>
                <div><label className="text-xs text-muted-foreground">Session Timeout (min)</label><Input type="number" value={settings.session_timeout_minutes} onChange={e => setSettings({ ...settings, session_timeout_minutes: +e.target.value })} className="h-8" /></div>
                <div><label className="text-xs text-muted-foreground">Lockout Threshold</label><Input type="number" value={settings.lockout_threshold} onChange={e => setSettings({ ...settings, lockout_threshold: +e.target.value })} className="h-8" /></div>
                <div><label className="text-xs text-muted-foreground">Lockout Duration (min)</label><Input type="number" value={settings.lockout_minutes} onChange={e => setSettings({ ...settings, lockout_minutes: +e.target.value })} className="h-8" /></div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!settings.password_policy?.require_upper} onCheckedChange={v => setSettings({ ...settings, password_policy: { ...settings.password_policy, require_upper: v } })} />Require uppercase</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!settings.password_policy?.require_number} onCheckedChange={v => setSettings({ ...settings, password_policy: { ...settings.password_policy, require_number: v } })} />Require number</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!settings.password_policy?.require_symbol} onCheckedChange={v => setSettings({ ...settings, password_policy: { ...settings.password_policy, require_symbol: v } })} />Require symbol</label>
              </div>
              <Button onClick={save}>Save</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mfa" className="mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Multi-Factor Authentication</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">MFA Mode</label>
                  <Select value={settings.mfa_mode} onValueChange={v => setSettings({ ...settings, mfa_mode: v })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="optional">Optional</SelectItem>
                      <SelectItem value="required">Required</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Default Channel</label>
                  <Select value={settings.mfa_default_channel} onValueChange={v => setSettings({ ...settings, mfa_default_channel: v })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="totp">Authenticator App</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Default recommendation: <strong>Email MFA</strong>.</div>
              <Button onClick={save}>Save</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" />User Sessions</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>User</TableHead><TableHead>IP</TableHead><TableHead>Device</TableHead><TableHead>Location</TableHead><TableHead>Last Seen</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sessions.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{s.profiles?.email || s.user_id}</TableCell>
                      <TableCell className="text-xs">{s.ip || "—"}</TableCell>
                      <TableCell className="text-xs">{s.device || "—"}</TableCell>
                      <TableCell className="text-xs">{s.location || "—"}</TableCell>
                      <TableCell className="text-xs">{new Date(s.last_seen_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {sessions.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-sm text-muted-foreground">No active sessions tracked.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Audit Trail</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Event</TableHead><TableHead>User</TableHead><TableHead>IP</TableHead></TableRow></TableHeader>
                <TableBody>
                  {events.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">{new Date(e.created_at).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline">{e.event_type}</Badge></TableCell>
                      <TableCell className="text-xs">{e.user_id || "—"}</TableCell>
                      <TableCell className="text-xs">{e.ip || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {events.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-6 text-sm text-muted-foreground">No security events yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />NG Agent OS Recommendations</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {recs.map((r, i) => (
                <div key={i} className="flex items-start gap-3 rounded-md border p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.detail}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}