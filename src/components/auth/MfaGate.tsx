import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldAlert, LogOut } from "lucide-react";

type Stage = "loading" | "enroll" | "challenge" | "ok";

interface Props {
  children: React.ReactNode;
  /** Where to send the user when they choose to sign out from the gate. */
  signOutRedirect?: string;
}

export default function MfaGate({ children, signOutRedirect = "/auth" }: Props) {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>("loading");

  // Enroll state
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [enrollCode, setEnrollCode] = useState("");

  // Challenge state
  const [challengeFactorId, setChallengeFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [challengeCode, setChallengeCode] = useState("");

  const [busy, setBusy] = useState(false);

  const evaluate = useCallback(async () => {
    setStage("loading");
    const { data: aalData, error: aalErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalErr) {
      toast({ title: "MFA check failed", description: aalErr.message, variant: "destructive" });
      setStage("ok"); // fail open to avoid lockout on transient errors; user still gated by RLS
      return;
    }
    const { currentLevel, nextLevel } = aalData ?? {};

    // Already at AAL2 — good to go.
    if (currentLevel === "aal2") {
      setStage("ok");
      return;
    }

    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const verified = factorsData?.totp?.find((f) => f.status === "verified");

    // User has a verified TOTP factor but isn't at AAL2 yet → challenge.
    if (verified) {
      setChallengeFactorId(verified.id);
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: verified.id });
      if (chErr || !ch) {
        toast({ title: "Could not start MFA challenge", description: chErr?.message, variant: "destructive" });
        return;
      }
      setChallengeId(ch.id);
      setStage("challenge");
      return;
    }

    // No verified factor — force enrollment (mandatory MFA).
    // Clean up any stale unverified factors so enroll() doesn't fail with friendly name conflict.
    const stale = factorsData?.totp?.find((f) => (f.status as string) !== "verified");
    if (stale) {
      await supabase.auth.mfa.unenroll({ factorId: stale.id });
    }
    const { data: en, error: enErr } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (enErr || !en) {
      toast({ title: "Could not start enrollment", description: enErr?.message, variant: "destructive" });
      return;
    }
    setFactorId(en.id);
    setQr(en.totp.qr_code);
    setSecret(en.totp.secret);
    setStage("enroll");
  }, [toast]);

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  const verifyEnrollment = async () => {
    if (!factorId || enrollCode.length < 6) return;
    setBusy(true);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chErr || !ch) {
      setBusy(false);
      toast({ title: "Verification failed", description: chErr?.message, variant: "destructive" });
      return;
    }
    const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: enrollCode.trim() });
    setBusy(false);
    if (vErr) {
      toast({ title: "Invalid code", description: vErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "MFA enabled", description: "Two-factor authentication is now active." });
    setEnrollCode("");
    evaluate();
  };

  const verifyChallenge = async () => {
    if (!challengeFactorId || !challengeId || challengeCode.length < 6) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.verify({
      factorId: challengeFactorId,
      challengeId,
      code: challengeCode.trim(),
    });
    setBusy(false);
    if (error) {
      toast({ title: "Invalid code", description: error.message, variant: "destructive" });
      return;
    }
    setChallengeCode("");
    evaluate();
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.assign(signOutRedirect);
  };

  if (stage === "ok") return <>{children}</>;

  if (stage === "loading") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-muted/30 p-6">
        <Skeleton className="h-48 w-full max-w-md" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {stage === "enroll" ? (
              <><ShieldAlert className="h-5 w-5 text-primary" /> Enable two-factor authentication</>
            ) : (
              <><ShieldCheck className="h-5 w-5 text-primary" /> Two-factor verification</>
            )}
          </CardTitle>
          <CardDescription>
            {stage === "enroll"
              ? "Two-factor authentication is required for this account. Scan the QR code in an authenticator app (Google Authenticator, Authy, 1Password) and enter the 6-digit code to finish setup."
              : "Enter the 6-digit code from your authenticator app to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stage === "enroll" && (
            <>
              {qr && (
                <div className="flex justify-center bg-white p-3 rounded-md border">
                  <img src={qr} alt="MFA QR code" className="h-44 w-44" />
                </div>
              )}
              {secret && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Or enter this key manually</Label>
                  <code className="block text-xs bg-muted p-2 rounded break-all">{secret}</code>
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="enroll-code">6-digit code</Label>
                <Input
                  id="enroll-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={enrollCode}
                  onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                />
              </div>
              <Button onClick={verifyEnrollment} disabled={busy || enrollCode.length < 6} className="w-full">
                Verify and enable
              </Button>
            </>
          )}

          {stage === "challenge" && (
            <>
              <div className="space-y-1">
                <Label htmlFor="challenge-code">Authentication code</Label>
                <Input
                  id="challenge-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  value={challengeCode}
                  onChange={(e) => setChallengeCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  onKeyDown={(e) => { if (e.key === "Enter") verifyChallenge(); }}
                />
              </div>
              <Button onClick={verifyChallenge} disabled={busy || challengeCode.length < 6} className="w-full">
                Verify
              </Button>
            </>
          )}

          <Button variant="ghost" size="sm" className="w-full" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-1.5" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}