import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  deals: any[];
}

export function MessagesTab({ deals }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dealId, setDealId] = useState<string | undefined>(deals[0]?.id);
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dealId && deals[0]?.id) setDealId(deals[0].id);
  }, [deals, dealId]);

  useEffect(() => {
    if (!dealId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("portal_messages")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at");
      if (active) setMessages(data ?? []);
    })();
    const channel = supabase
      .channel(`crm-msgs-${dealId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "portal_messages", filter: `deal_id=eq.${dealId}` },
        (payload) => setMessages((m) => [...m, payload.new]),
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [dealId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const dealLabel = useMemo(() => {
    return (d: any) => {
      const parts = [d.loan_type, d.property_address].filter(Boolean);
      return parts.length ? parts.join(" · ") : `Deal ${String(d.id).slice(0, 8)}`;
    };
  }, []);

  const send = async () => {
    if (!dealId || !user || !body.trim()) return;
    setSending(true);
    const { error } = await supabase.from("portal_messages").insert({
      deal_id: dealId,
      sender_user_id: user.id,
      sender_role: "officer",
      body: body.trim(),
    });
    setSending(false);
    if (error) {
      toast({ title: "Send failed", description: error.message, variant: "destructive" });
      return;
    }
    setBody("");
  };

  if (deals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          No deals linked yet. Messaging is available once a deal exists for this record.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)] gap-3">
      {deals.length > 1 && (
        <Select value={dealId} onValueChange={setDealId}>
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue placeholder="Select a deal" />
          </SelectTrigger>
          <SelectContent>
            {deals.map((d) => (
              <SelectItem key={d.id} value={d.id}>{dealLabel(d)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">
                No messages yet. Start the conversation with the borrower.
              </p>
            )}
            {messages.map((m) => {
              const mine = m.sender_user_id === user?.id;
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                      mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm",
                    )}
                  >
                    {m.body}
                    <div className={cn("text-[10px] mt-1 opacity-70", mine ? "text-right" : "")}>
                      {m.sender_role === "borrower" ? "Borrower · " : "You · "}
                      {new Date(m.created_at).toLocaleString()}
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
              placeholder="Type a message to the borrower…"
              className="min-h-[44px] max-h-32 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button onClick={send} disabled={sending || !body.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}