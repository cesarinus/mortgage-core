import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Building2, CheckCircle2 } from "lucide-react";

export default function PortalAccept() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [accepting, setAccepting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // If no token, bounce to login.
    if (!token) navigate("/portal/login", { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    if (loading || !user || !token || accepting || done) return;
    setAccepting(true);
    (async () => {
      const { data, error } = await supabase.functions.invoke("portal-invite-accept", {
        body: { token },
      });
      if (error || (data as any)?.error) {
        toast({
          title: "Could not activate portal",
          description: error?.message || (data as any)?.error || "Invite invalid",
          variant: "destructive",
        });
        setAccepting(false);
        return;
      }
      setDone(true);
      setTimeout(() => navigate("/portal", { replace: true }), 800);
    })();
  }, [user, loading, token, accepting, done, navigate, toast]);

  // Not signed in yet — prompt sign in / sign up. The PortalLogin page
  // handles auth; we send them back here via ?next.
  if (!loading && !user) {
    const next = `/portal/accept?token=${encodeURIComponent(token)}`;
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <Building2 className="h-8 w-8 text-primary mx-auto mb-2" />
            <CardTitle>Activate your portal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Sign in or create an account to link this invite.</p>
            <Button className="w-full" onClick={() => navigate(`/portal/login?next=${encodeURIComponent(next)}`)}>
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          {done
            ? <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
            : <Building2 className="h-8 w-8 text-primary mx-auto" />}
          <CardTitle>{done ? "Portal activated" : "Activating your portal…"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{done ? "Redirecting…" : "Linking your account to your loan."}</p>
        </CardContent>
      </Card>
    </div>
  );
}