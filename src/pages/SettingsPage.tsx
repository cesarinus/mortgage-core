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

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
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
    </div>
  );
}
