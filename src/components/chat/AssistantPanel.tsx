import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Sparkles, Send, Plus, MessageSquare, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AiFeedback } from "@/components/crm/AiFeedback";

export type AssistantScope = "crm" | "portal";
export type AssistantRecordKind = "lead" | "contact" | "deal" | "portal" | null;

interface Props {
  open: boolean;
  onClose: () => void;
  scope: AssistantScope;
  recordKind?: AssistantRecordKind;
  recordId?: string | null;
  starterPrompts?: string[];
}

interface ThreadRow {
  id: string;
  title: string;
  updated_at: string;
}

const CRM_STARTERS = [
  "Summarize this lead",
  "What documents are missing for this stage?",
  "Draft a follow-up email",
  "Show me the last 5 activities",
  "What's the best next action?",
];
const PORTAL_STARTERS = [
  "Where is my loan at?",
  "What documents do I still need?",
  "How do I upload my pay stubs?",
  "When is my estimated closing date?",
];

export function AssistantPanel({ open, onClose, scope, recordKind = null, recordId = null, starterPrompts }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Load threads for this scope/record
  const loadThreads = async () => {
    if (!user) return;
    let q = supabase
      .from("chat_threads")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .eq("scope", scope)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (recordKind) q = q.eq("record_kind", recordKind);
    if (recordId) q = q.eq("record_id", recordId);
    const { data } = await q;
    setThreads((data ?? []) as ThreadRow[]);
  };

  useEffect(() => {
    if (open) loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id, scope, recordKind, recordId]);

  // When selecting a thread, load its messages from DB
  useEffect(() => {
    if (!threadId) {
      setInitialMessages([]);
      return;
    }
    supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const msgs: UIMessage[] = (data ?? [])
          .filter((m: any) => m.role === "user" || m.role === "assistant")
          .map((m: any) => ({
            id: m.id,
            role: m.role,
            parts: [{ type: "text", text: m.content ?? "" }],
          })) as UIMessage[];
        setInitialMessages(msgs);
      });
  }, [threadId]);

  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-completion`,
      fetch: async (url, init) => {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const baseBody = init?.body ? JSON.parse(init.body as string) : {};
        const body = JSON.stringify({
          ...baseBody,
          threadId,
          scope,
          recordKind,
          recordId,
        });
        return fetch(url, {
          ...init,
          body,
          headers: {
            ...(init?.headers || {}),
            "Content-Type": "application/json",
            Authorization: `Bearer ${token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        });
      },
    });
  }, [threadId, scope, recordKind, recordId]);

  const chatKey = threadId ?? "new";
  const { messages, sendMessage, status, setMessages } = useChat({
    id: chatKey,
    messages: initialMessages,
    transport,
    onError: (err) => toast({ title: "Assistant error", description: err.message, variant: "destructive" }),
    onFinish: () => {
      // Refresh threads (new thread may have been created server-side)
      loadThreads();
    },
  });

  useEffect(() => {
    setMessages(initialMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatKey]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const [input, setInput] = useState("");
  const isLoading = status === "submitted" || status === "streaming";

  const handleSend = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || isLoading) return;
    setInput("");
    await sendMessage({ text: value });
    // If this was a new thread, look up the freshly-created one shortly after
    if (!threadId) {
      setTimeout(async () => {
        await loadThreads();
      }, 800);
    }
  };

  const newThread = () => {
    setThreadId(null);
    setInitialMessages([]);
    setMessages([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const deleteThread = async (id: string) => {
    await supabase.from("chat_threads").delete().eq("id", id);
    if (threadId === id) newThread();
    loadThreads();
  };

  const starters = starterPrompts ?? (scope === "portal" ? PORTAL_STARTERS : CRM_STARTERS);

  const Content = (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">
            {scope === "portal" ? "Loan Assistant" : "CRM Assistant"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={newThread} title="New conversation">
            <Plus className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {threads.length > 0 && (
        <div className="border-b px-3 py-2">
          <ScrollArea className="max-h-28">
            <div className="flex flex-col gap-0.5">
              {threads.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-md px-2 py-1 text-xs cursor-pointer hover:bg-muted",
                    threadId === t.id && "bg-muted",
                  )}
                  onClick={() => setThreadId(t.id)}
                >
                  <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{t.title}</span>
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteThread(t.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {scope === "portal"
                ? "Ask me about your loan status, documents, or next steps."
                : "Ask me about this record. I'm grounded in your CRM data."}
            </p>
            <div className="flex flex-col gap-1.5">
              {starters.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left text-xs px-3 py-2 rounded-md border bg-card hover:bg-muted transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => {
          const text = m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("");
          if (m.role === "user") {
            return (
              <div key={m.id} className="flex justify-end">
                <Card className="max-w-[85%] bg-primary text-primary-foreground px-3 py-2 text-sm rounded-2xl rounded-br-sm">
                  {text}
                </Card>
              </div>
            );
          }
          return (
            <div key={m.id} className="text-sm prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-pre:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text || "…"}</ReactMarkdown>
              {text && (
                <div className="not-prose mt-1">
                  <AiFeedback
                    feature="assistant_chat"
                    profile={scope}
                    context={{ thread_id: threadId, message_id: m.id, record_kind: recordKind, record_id: recordId }}
                    label=""
                  />
                </div>
              )}
            </div>
          );
        })}
        {status === "submitted" && (
          <div className="text-xs text-muted-foreground italic">Thinking…</div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="border-t p-3 flex items-end gap-2"
      >
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={scope === "portal" ? "Ask about your loan…" : "Ask about this record…"}
          disabled={isLoading}
          autoFocus
          rows={1}
          className="min-h-[40px] max-h-40 resize-none"
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="bottom" className="h-[85vh] p-0">
          {Content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className={cn(
        "fixed top-0 right-0 z-40 h-screen w-[400px] border-l shadow-xl transition-transform bg-background",
        open ? "translate-x-0" : "translate-x-full pointer-events-none",
      )}
    >
      {Content}
    </div>
  );
}