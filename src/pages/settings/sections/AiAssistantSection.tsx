import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const AGENTS = [
  ["Lead Qualification Agent", "Auto-scores and routes inbound leads"],
  ["Borrower Follow-Up Agent", "Nudges borrowers awaiting docs"],
  ["Realtor Agent", "Keeps referral partners updated"],
  ["Marketing Agent", "Drafts blogs + social posts"],
  ["Pipeline Agent", "Flags stuck deals and recommends actions"],
  ["Document Review Agent", "Extracts data from uploaded docs"],
];

export default function AiAssistantSection() {
  const { user } = useAuth(); const { toast } = useToast();
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setEnabled((data as any).assistant_enabled ?? true);
    });
  }, [user]);
  const save = async (v: boolean) => {
    setEnabled(v);
    if (!user) return;
    await supabase.from("profiles").update({ assistant_enabled: v } as any).eq("id", user.id);
    toast({ title: v ? "Assistant enabled" : "Assistant disabled" });
  };
  return (
    <div className="max-w-4xl space-y-4">
      <div><h1 className="text-2xl font-bold tracking-tight">AI Control Center</h1><p className="text-muted-foreground text-sm">Manage your AI assistant and agents.</p></div>
      <div className="grid sm:grid-cols-4 gap-3">
        {[["AI Status","Active","emerald"],["Active Agents","6"],["Tasks Today","37"],["Time Saved","4.2h"]].map(([k,v,c]) => (
          <Card key={k}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className={`text-xl font-semibold mt-1 ${c==="emerald"?"text-emerald-500":""}`}>{v}</div>
          </CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Assistant</CardTitle><CardDescription>Floating AI panel inside CRM + portal.</CardDescription></CardHeader>
        <CardContent className="flex items-center justify-between">
          <div><Label>Enable assistant</Label><p className="text-xs text-muted-foreground">Hides the launcher everywhere for your account.</p></div>
          <Switch checked={enabled} onCheckedChange={save} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Agents</CardTitle><CardDescription>Toggle each AI agent independently.</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {AGENTS.map(([name, desc]) => (
            <div key={name} className="flex items-center justify-between border rounded-md p-2.5">
              <div>
                <div className="text-sm font-medium flex items-center gap-2">{name} <Badge variant="secondary" className="text-[10px]">Healthy</Badge></div>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch defaultChecked />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}