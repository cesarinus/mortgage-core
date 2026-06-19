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
  const [targets, setTargets] = useState({ calls_target: 0, applications_target: 0, preapprovals_target: 0, funded_target: 0 });
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setFirstName(data.first_name ?? ""); setLastName(data.last_name ?? ""); }
    });
    (supabase as any).from("user_targets").select("*").eq("user_id", user.id).maybeSingle().then(({ data }: any) => {
      if (data) setTargets({
        calls_target: data.calls_target ?? 0,
        applications_target: data.applications_target ?? 0,
        preapprovals_target: data.preapprovals_target ?? 0,
        funded_target: data.funded_target ?? 0,
      });
    });
  }, [user]);
  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ first_name: firstName, last_name: lastName } as any).eq("id", user.id);
    toast(error ? { title: "Error", description: error.message, variant: "destructive" } : { title: "Profile updated" });
  };
  const saveTargets = async () => {
    if (!user) return;
    const { error } = await (supabase as any).from("user_targets").upsert({ user_id: user.id, ...targets });
    toast(error ? { title: "Error", description: error.message, variant: "destructive" } : { title: "Targets saved" });
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
      <Card>
        <CardHeader><CardTitle>Monthly Scorecard Targets</CardTitle><CardDescription>Drives the Loan Officer Scorecard on the dashboard. Set to 0 to hide a metric's target.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Calls / month</Label><Input type="number" min={0} value={targets.calls_target} onChange={e=>setTargets(t=>({...t, calls_target: Number(e.target.value)||0}))} /></div>
            <div className="space-y-1"><Label>Applications / month</Label><Input type="number" min={0} value={targets.applications_target} onChange={e=>setTargets(t=>({...t, applications_target: Number(e.target.value)||0}))} /></div>
            <div className="space-y-1"><Label>Pre-approvals / month</Label><Input type="number" min={0} value={targets.preapprovals_target} onChange={e=>setTargets(t=>({...t, preapprovals_target: Number(e.target.value)||0}))} /></div>
            <div className="space-y-1"><Label>Loans funded / month</Label><Input type="number" min={0} value={targets.funded_target} onChange={e=>setTargets(t=>({...t, funded_target: Number(e.target.value)||0}))} /></div>
          </div>
          <Button onClick={saveTargets}>Save targets</Button>
        </CardContent>
      </Card>
    </div>
  );
}