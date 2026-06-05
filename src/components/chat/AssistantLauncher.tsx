import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AssistantPanel, type AssistantScope, type AssistantRecordKind } from "./AssistantPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  scope: AssistantScope;
  recordKind?: AssistantRecordKind;
  recordId?: string | null;
  starterPrompts?: string[];
}

export function AssistantLauncher(props: Props) {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("assistant_enabled")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && (data as any).assistant_enabled === false) setEnabled(false);
      });
  }, [user?.id]);

  if (!user || !enabled) return null;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 z-30 h-12 w-12 rounded-full shadow-lg"
        title="AI Assistant"
      >
        <Sparkles className="h-5 w-5" />
      </Button>
      <AssistantPanel {...props} open={open} onClose={() => setOpen(false)} />
    </>
  );
}