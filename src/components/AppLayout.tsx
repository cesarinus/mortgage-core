import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, CheckSquare, Plus, Search, Sparkles } from "lucide-react";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";

export default function AppLayout() {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [taskOpen, setTaskOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        navigate("/ask");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric",
  });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center gap-2 md:gap-3 border-b border-border/60 bg-card/70 px-2 md:px-4 backdrop-blur-xl">
            <SidebarTrigger className="text-muted-foreground" />

            <div className="relative hidden flex-1 max-w-xl md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search borrowers, loans, contacts..."
                className="h-9 rounded-full border-border/60 bg-background/60 pl-9 text-sm focus-visible:ring-primary/30"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 select-none items-center gap-1 rounded border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground lg:inline-flex">
                ⌘K
              </kbd>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground lg:block">
                {dateLabel}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex rounded-full"
                title="Tasks"
                onClick={() => navigate("/tasks")}
              >
                <CheckSquare className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="relative rounded-full" title="Notifications">
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="hidden gap-1.5 rounded-full md:inline-flex"
                onClick={() => setTaskOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Task
              </Button>
              <Button
                size="sm"
                className="gap-1.5 rounded-full bg-gradient-to-r from-primary to-orange-dark text-primary-foreground shadow-orange hover:opacity-95 px-2.5 sm:px-3"
                onClick={() => navigate("/ask")}
              >
                <Sparkles className="h-3.5 w-3.5" /> <span className="hidden sm:inline">AI Assistant</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
      <TaskDrawer open={taskOpen} onOpenChange={setTaskOpen} />
    </SidebarProvider>
  );
}
