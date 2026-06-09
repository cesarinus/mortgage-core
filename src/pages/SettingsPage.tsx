import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import BookingAvailabilitySettings from "@/components/settings/BookingAvailabilitySettings";
import { Switch } from "@/components/ui/switch";
import EmailProviderSettings from "@/components/settings/EmailProviderSettings";
import ZapierIntegrationSettings from "@/components/settings/ZapierIntegrationSettings";
import { Link } from "react-router-dom";
import { Upload, Moon, Sun, Palette, Monitor } from "lucide-react";
import { useTheme, type ThemeName } from "@/lib/theme";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [assistantEnabled, setAssistantEnabled] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
        setAssistantEnabled((data as any).assistant_enabled ?? true);
      }
    });
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName, assistant_enabled: assistantEnabled } as any)
      .eq("id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your profile</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" /> Appearance
          </CardTitle>
          <CardDescription>Switch between themes — saved to your profile and persists across sessions.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            { id: "ng-dark",  label: "NG Dark",     Icon: Moon,    swatch: ["#0F172A", "#111827", "#FF7A00"] },
            { id: "ng-light", label: "NG Light",    Icon: Sun,     swatch: ["#F5F7FA", "#FFFFFF", "#FF7A00"] },
            { id: "original", label: "Original CRM", Icon: Palette, swatch: ["#FAF8F5", "#FFFFFF", "#FF7A00"] },
            { id: "system",   label: "Auto System",  Icon: Monitor, swatch: ["#0F172A", "#FFFFFF", "#FF7A00"] },
          ] as { id: ThemeName; label: string; Icon: any; swatch: string[] }[]).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => { setTheme(opt.id); toast({ title: `Theme: ${opt.label}` }); }}
              className={cn(
                "group flex flex-col gap-2 rounded-xl border bg-card p-3 text-left transition-all hover:border-primary/50 hover:shadow-md",
                theme === opt.id ? "border-primary ring-2 ring-primary/20" : "border-border",
              )}
            >
              <div className="flex items-center justify-between">
                <opt.Icon className="h-4 w-4 text-muted-foreground" />
                {theme === opt.id && <span className="text-[10px] font-semibold uppercase text-primary">Active</span>}
              </div>
              <div className="flex h-10 overflow-hidden rounded-md border border-border/60">
                {opt.swatch.map((c, i) => (
                  <div key={i} className="flex-1" style={{ background: c }} />
                ))}
              </div>
              <p className="text-sm font-medium">{opt.label}</p>
            </button>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>First name</Label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Last name</Label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
          <Button onClick={saveProfile}>Save changes</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>AI Assistant</CardTitle>
          <CardDescription>Show the floating AI assistant inside the CRM and Borrower Portal.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable assistant</Label>
            <p className="text-xs text-muted-foreground">
              When off, the assistant launcher and chat panel are hidden everywhere for your account.
            </p>
          </div>
          <Switch checked={assistantEnabled} onCheckedChange={setAssistantEnabled} />
        </CardContent>
      </Card>
      <BookingAvailabilitySettings />
      <EmailProviderSettings />
      <ZapierIntegrationSettings />
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Data Import</CardTitle>
            <CardDescription>Import People and Companies from Arive LOS exports.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/settings/import-arive">
                <Upload className="h-4 w-4 mr-2" /> Import from Arive
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
