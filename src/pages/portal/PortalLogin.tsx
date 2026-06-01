import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2 } from "lucide-react";

export default function PortalLogin() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/portal";
  const { toast } = useToast();

  useEffect(() => { if (user) navigate(next, { replace: true }); }, [user, next, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}${next}`,
            data: { first_name: firstName, last_name: lastName },
          },
        });
        if (error) throw error;
        toast({ title: "Check your inbox", description: "Confirm your email, then come back to sign in." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast({ title: isSignup ? "Sign up failed" : "Login failed", description: err instanceof Error ? err.message : "Try again", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${next}`,
    });
    if (result.error) {
      toast({ title: "Google sign-in failed", description: result.error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Helmet><title>Borrower Portal · NexGen Capital</title></Helmet>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Building2 className="h-8 w-8 text-primary mx-auto mb-2" />
          <CardTitle>Borrower Portal</CardTitle>
          <CardDescription>{isSignup ? "Create your account to activate your portal." : "Sign in to track your loan."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>
          <div className="relative text-center text-xs text-muted-foreground">
            <span className="bg-card px-2 relative z-10">or with email</span>
            <div className="absolute inset-x-0 top-1/2 h-px bg-border -z-0" />
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignup && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label>First name</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
                <div><Label>Last name</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
              </div>
            )}
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Please wait…" : (isSignup ? "Create account" : "Sign in")}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account?" : "New here?"}{" "}
            <button type="button" className="text-primary hover:underline" onClick={() => setIsSignup((s) => !s)}>
              {isSignup ? "Sign in" : "Create one"}
            </button>
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Have an invite link? <Link className="text-primary hover:underline" to="/portal/accept">Activate it</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}