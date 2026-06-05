import { Outlet, NavLink, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePortalBinding } from "@/hooks/usePortalBinding";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, FileText, Calculator, MessageSquare, LogOut, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import MfaGate from "@/components/auth/MfaGate";
import { AssistantLauncher } from "@/components/chat/AssistantLauncher";

const nav = [
  { to: "/portal", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/portal/documents", label: "Documents", icon: FileText },
  { to: "/portal/scenarios", label: "Loan Options", icon: Calculator },
  { to: "/portal/messages", label: "Messages", icon: MessageSquare },
];

export default function PortalLayout() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { binding, loading: bindLoading } = usePortalBinding();
  const navigate = useNavigate();

  if (authLoading || (user && bindLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Skeleton className="h-32 w-72" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/portal/login" replace />;
  }

  // Enforce MFA before showing any portal content (including the "no binding" screen).
  return (
    <MfaGate signOutRedirect="/portal/login">
      <PortalLayoutInner />
    </MfaGate>
  );
}

function PortalLayoutInner() {
  const { signOut } = useAuth();
  const { binding } = usePortalBinding();
  const navigate = useNavigate();

  if (!binding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md text-center space-y-4">
          <Building2 className="h-10 w-10 text-primary mx-auto" />
          <h1 className="text-xl font-semibold">No active loan portal</h1>
          <p className="text-sm text-muted-foreground">
            Your account isn't linked to a loan yet. Please use the invite link your loan
            officer sent you, or contact them to request one.
          </p>
          <Button variant="outline" onClick={async () => { await signOut(); navigate("/portal/login"); }}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Building2 className="h-5 w-5 text-primary" />
            NexGen Capital · Portal
          </div>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/portal/login"); }}>
            <LogOut className="mr-1.5 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>
      <div className="max-w-6xl mx-auto w-full px-4 py-6 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
        <nav className="md:sticky md:top-20 self-start flex md:flex-col gap-1 overflow-x-auto">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap",
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <main className="min-w-0"><Outlet /></main>
      </div>
      <AssistantLauncher scope="portal" recordKind="portal" />
    </div>
  );
}