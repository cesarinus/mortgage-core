import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function ProfileSection() {
  const { user } = useAuth(); const { toast } = useToast();
  const [firstName, setFirstName] = useState(""); const [lastName, setLastName] = useState("");
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setFirstName(data.first_name ?? ""); setLastName(data.last_name ?? ""); }
    });
  }, [user]);
  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ first_name: firstName, last_name: lastName } as any).eq("id", user.id);
    toast(error ? { title: "Error", description: error.message, variant: "destructive" } : { title: "Profile updated" });
  };
  return (
    <div className="max-w-2xl space-y-4">
      <div><h1 className="text-2xl font-bold tracking-tight">Profile</h1><p className="text-muted-foreground text-sm">Your personal information.</p></div>
      <Card>
        <CardHeader><CardTitle>Personal info</CardTitle><CardDescription>Used across the CRM and outbound emails.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1"><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>First name</Label><Input value={firstName} onChange={e=>setFirstName(e.target.value)} /></div>
            <div className="space-y-1"><Label>Last name</Label><Input value={lastName} onChange={e=>setLastName(e.target.value)} /></div>
          </div>
          <Button onClick={save}>Save changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}