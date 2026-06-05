import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";

export default function EmailProviderSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "Titan",
    host: "smtp.titan.email",
    port: 587,
    username: "CMartinez@NGCapital.net",
    password: "",
    from_email: "CMartinez@NGCapital.net",
    from_name: "NGCapital Mortgage",
    is_active: true,
  });
  const [hasPassword, setHasPassword] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("email_providers")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setId(data.id);
      setForm({
        name: data.name, host: data.host, port: data.port,
        username: data.username, password: "",
        from_email: data.from_email, from_name: data.from_name,
        is_active: data.is_active,
      });
      setHasPassword(!!data.password);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("save-smtp-provider", {
      body: { id, ...form },
    });
    setSaving(false);
    if (error || (data as any)?.error) {
      toast({ title: "Save failed", description: error?.message || (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: "SMTP provider saved" });
      setForm({ ...form, password: "" });
      load();
    }
  };

  const test = async () => {
    setTesting(true);
    const body: any = {};
    if (form.password) {
      Object.assign(body, form);
    }
    const { data, error } = await supabase.functions.invoke("test-smtp", { body });
    setTesting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Test failed", description: error?.message || (data as any)?.detail || (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: "Test email sent", description: `Sent to ${(data as any).recipient}` });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Email (Titan SMTP)</CardTitle>
            <CardDescription>Configure the SMTP server used to send all CRM emails.</CardDescription>
          </div>
          {id && form.is_active && <Badge variant="secondary">Active</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>SMTP host</Label>
                <Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Port</Label>
                <Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 587 })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Username</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>App password {hasPassword && <span className="text-xs text-muted-foreground">(leave blank to keep current)</span>}</Label>
              <Input type="password" value={form.password} placeholder={hasPassword ? "••••••••" : ""} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>From email</Label>
                <Input value={form.from_email} onChange={(e) => setForm({ ...form, from_email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>From name</Label>
                <Input value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
              <Button variant="outline" onClick={test} disabled={testing}>
                {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Test connection
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Test sends a message from this server to your logged-in email. Credentials never leave the server.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}