import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export function SocialAccountSettings() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["social-account-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("social_account_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<any>({});
  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { id, created_at, updated_at, ...patch } = form;
      const { error } = await supabase.from("social_account_settings").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-account-settings"] });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  if (!data) return <Card><CardContent className="py-8 text-center text-muted-foreground">Loading…</CardContent></Card>;

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex gap-3 py-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-medium">API tokens are stored as project secrets</p>
            <p className="text-muted-foreground">
              Add a Meta Page access token as <code>META_PAGE_ACCESS_TOKEN</code> or <code>META_ACCESS_TOKEN</code>, plus
              <code>META_PAGE_ID</code> and <code>IG_BUSINESS_ACCOUNT_ID</code>. The Meta token must use current Page and Instagram
              publishing permissions, not deprecated <code>publish_actions</code>. LinkedIn requires the LinkedIn connector or
              <code>LINKEDIN_ACCESS_TOKEN</code>, plus <code>LINKEDIN_ORG_URN</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account & Brand</CardTitle>
          <CardDescription>Used by the AI generator and public references</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Business Name</Label><Input value={form.business_name || ""} onChange={(e) => set("business_name", e.target.value)} /></div>
            <div className="space-y-2"><Label>Website URL</Label><Input value={form.website_url || ""} onChange={(e) => set("website_url", e.target.value)} /></div>
            <div className="space-y-2"><Label>Contact Phone</Label><Input value={form.contact_phone || ""} onChange={(e) => set("contact_phone", e.target.value)} /></div>
            <div className="space-y-2"><Label>Contact Email</Label><Input value={form.contact_email || ""} onChange={(e) => set("contact_email", e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Brand Voice</Label><Textarea rows={3} value={form.brand_voice || ""} onChange={(e) => set("brand_voice", e.target.value)} /></div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2"><Label>Facebook Page ID</Label><Input value={form.facebook_page_id || ""} onChange={(e) => set("facebook_page_id", e.target.value)} placeholder="e.g. 123456789" /></div>
            <div className="space-y-2"><Label>Instagram Business ID</Label><Input value={form.instagram_business_id || ""} onChange={(e) => set("instagram_business_id", e.target.value)} placeholder="e.g. 17841…" /></div>
            <div className="space-y-2"><Label>LinkedIn Org URN</Label><Input value={form.linkedin_org_urn || ""} onChange={(e) => set("linkedin_org_urn", e.target.value)} placeholder="urn:li:organization:…" /></div>
          </div>
          <div className="space-y-2"><Label>Default Image URL (fallback)</Label><Input value={form.default_image_url || ""} onChange={(e) => set("default_image_url", e.target.value)} placeholder="https://…" /></div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}