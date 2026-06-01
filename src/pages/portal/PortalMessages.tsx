import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePortalBinding } from "@/hooks/usePortalBinding";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PortalMessages() {
  const { user } = useAuth();
  const { binding } = usePortalBinding();
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!binding) return;
    let active = true;
    (async () => {
      const { data } = await supabase.from("portal_messages")
        .select("*").eq("deal_id", binding.deal_id).order("created_at");
      if (active) setMessages(data ?? []);
    })();
    const channel = supabase
      .channel(`portal-msgs-${binding.deal_id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "portal_messages", filter: `deal_id=eq.${binding.deal_id}` },
        (payload) => setMessages((m) => [...m, payload.new]))
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [binding]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (!binding || !user || !body.trim()) return;
    setSending(true);
    const { error } = await supabase.from("portal_messages").insert({
      deal_id: binding.deal_id,
      sender_user_id: user.id,
      sender_role: "borrower",
      body: body.trim(),
    });
    setSending(false);
    if (error) {
      toast({ title: "Send failed", description: error.message, variant: "destructive" });
      return;
    }
    setBody("");
  };

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-9rem)]">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground text-sm">Direct line to your loan officer.</p>
      </div>
      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">No messages yet. Say hi 👋</p>
            )}
            {messages.map((m) => {
              const mine = m.sender_user_id === user?.id;
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                    mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
                  )}>
                    {m.body}
                    <div className={cn("text-[10px] mt-1 opacity-70", mine ? "text-right" : "")}>
                      {m.sender_role === "officer" ? "Loan officer · " : ""}{new Date(m.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t p-3 flex gap-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type a message…"
              className="min-h-[44px] max-h-32 resize-none"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <Button onClick={send} disabled={sending || !body.trim()}><Send className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}