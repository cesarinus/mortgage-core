import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowUp, RefreshCw, ChevronRight } from "lucide-react";
import askLogo from "@/assets/ask-logo.png";
import { MorningBrief } from "@/components/crm/ask/MorningBrief";
import { SuggestedPrompts } from "@/components/crm/ask/SuggestedPrompts";
import { QuickActionsMenu } from "@/components/crm/ask/QuickActionsMenu";
import { SmartLeadForm } from "@/components/crm/SmartLeadForm";
import { logInteraction, type AskToolCall } from "@/lib/crm/askInteractions";
import { Helmet } from "react-helmet-async";

export default function AskHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [firstName, setFirstName] = useState<string>("there");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const sentAtRef = useRef<number>(0);
  const lastQuestionRef = useRef<string>("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("first_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setFirstName((data as any)?.first_name || (user.email?.split("@")[0] ?? "there")));
  }, [user?.id]);

  const transport = useMemo(() => new DefaultChatTransport({
    api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-completion`,
    fetch: async (url, init) => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const baseBody = init?.body ? JSON.parse(init.body as string) : {};
      return fetch(url, {
        ...init,
        body: JSON.stringify({ ...baseBody, scope: "crm", recordKind: null, recordId: null, threadId: null }),
        headers: {
          ...(init?.headers || {}),
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
    },
  }), []);

  const { messages, sendMessage, status, setMessages } = useChat({
    id: sessionId,
    transport,
    onError: (err) => toast({ title: "Assistant error", description: err.message, variant: "destructive" }),
    onFinish: ({ message }) => {
      // Capture tool calls from assistant parts and log the interaction
      const toolCalls: AskToolCall[] = [];
      const parts: any[] = (message as any).parts ?? [];
      for (const p of parts) {
        if (typeof p?.type === "string" && p.type.startsWith("tool-")) {
          const name = p.type.slice(5);
          toolCalls.push({ name, args: p.input ?? undefined });
        }
      }
      logInteraction({
        question: lastQuestionRef.current,
        session_id: sessionId,
        tool_calls: toolCalls,
        latency_ms: sentAtRef.current ? Date.now() - sentAtRef.current : undefined,
      }).catch(() => {});
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => { inputRef.current?.focus(); }, [messages.length, status]);

  const isLoading = status === "submitted" || status === "streaming";
  const hasConversation = messages.length > 0;

  const handleSend = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || isLoading) return;
    setInput("");
    lastQuestionRef.current = value;
    sentAtRef.current = Date.now();
    await sendMessage({ text: value });
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <>
      <Helmet><title>Ask · Mortgage CRM</title></Helmet>
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col bg-gradient-to-b from-background via-background to-primary/5">
        {/* Header / hero */}
        {!hasConversation && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-3xl mx-auto w-full">
            <img src={askLogo} alt="Ask" width={64} height={64} className="h-16 w-16 mb-6 drop-shadow-md" />
            <h1 className="text-3xl md:text-4xl font-semibold text-center mb-2">
              What's on your mind, <span className="text-primary">{firstName}</span>?
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-8">
              Ask anything about your CRM. I read leads, deals, tasks, and pipeline in real time.
            </p>

            <div className="w-full mb-6">
              <MorningBrief />
            </div>

            <Composer
              input={input} setInput={setInput} onSend={handleSend} isLoading={isLoading}
              onNewLead={() => setNewLeadOpen(true)}
              inputRef={inputRef}
            />

            <div className="mt-6 w-full">
              <SuggestedPrompts onPick={(t) => handleSend(t)} />
            </div>
          </div>
        )}

        {/* Conversation view */}
        {hasConversation && (
          <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <img src={askLogo} alt="" width={28} height={28} className="h-7 w-7" />
                <span className="text-sm font-semibold">Ask</span>
              </div>
              <Button size="sm" variant="ghost" onClick={handleReset}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> New
              </Button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
              {messages.map((m) => (
                <MessageItem key={m.id} message={m} navigate={navigate} sessionId={sessionId} />
              ))}
              {status === "submitted" && (
                <div className="text-xs text-muted-foreground italic">Thinking…</div>
              )}
            </div>

            <div className="mt-4">
              <Composer
                input={input} setInput={setInput} onSend={handleSend} isLoading={isLoading}
                onNewLead={() => setNewLeadOpen(true)}
                inputRef={inputRef}
              />
            </div>
          </div>
        )}
      </div>

      {/* New Lead slide-in */}
      <Sheet open={newLeadOpen} onOpenChange={setNewLeadOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>New lead</SheetTitle></SheetHeader>
          <div className="mt-4">
            <SmartLeadForm onSaved={(id) => { setNewLeadOpen(false); navigate(`/crm/leads/${id}`); }} onCancel={() => setNewLeadOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Composer({
  input, setInput, onSend, isLoading, onNewLead, inputRef,
}: {
  input: string;
  setInput: (s: string) => void;
  onSend: () => void;
  isLoading: boolean;
  onNewLead: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}) {
  return (
    <Card className="w-full p-3 rounded-2xl shadow-sm border-2 focus-within:border-primary/50 transition-colors">
      <Textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder="Ask Ask anything about your CRM…"
        disabled={isLoading}
        rows={1}
        autoFocus
        className="min-h-[44px] max-h-40 resize-none border-0 shadow-none focus-visible:ring-0 px-2 py-2 text-sm"
      />
      <div className="flex items-center justify-between mt-1">
        <QuickActionsMenu onNewLead={onNewLead} />
        <Button
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onSend}
          disabled={isLoading || !input.trim()}
          aria-label="Send"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function MessageItem({ message, navigate, sessionId }: { message: UIMessage; navigate: ReturnType<typeof useNavigate>; sessionId: string }) {
  const parts: any[] = (message as any).parts ?? [];
  const text = parts.filter((p) => p?.type === "text").map((p) => p.text).join("");

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-primary text-primary-foreground px-4 py-2 rounded-2xl rounded-br-sm text-sm">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {parts.map((p, i) => {
        if (p?.type === "text") return null; // rendered below
        if (typeof p?.type === "string" && p.type.startsWith("tool-")) {
          const name = p.type.slice(5);
          return <ToolResultCard key={i} name={name} state={p.state} output={p.output} input={p.input} navigate={navigate} sessionId={sessionId} />;
        }
        return null;
      })}
      {text && (
        <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:mt-3 prose-headings:mb-1">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

function ToolResultCard({
  name, state, output, input, navigate, sessionId,
}: { name: string; state?: string; output?: any; input?: any; navigate: ReturnType<typeof useNavigate>; sessionId: string }) {
  const label = ({
    query_leads: "Leads",
    query_pipeline: "Pipeline",
    query_tasks: "Tasks",
    query_contacts: "Contacts",
    query_deals: "Deals",
    summarize_record: "Record summary",
    get_morning_brief: "Morning brief",
  } as Record<string, string>)[name] ?? name;

  if (state !== "output-available" || !output) {
    return <div className="text-xs text-muted-foreground italic">Looking up {label.toLowerCase()}…</div>;
  }

  const trackClick = (kind: string, id: string) => {
    logInteraction({
      question: "", session_id: sessionId,
      tool_calls: [{ name }],
      tool_results_summary: { clicked: { kind, id } },
    }).catch(() => {});
  };

  const leads: any[] = output.leads ?? [];
  const ops: any[] = output.opportunities ?? [];
  const tasks: any[] = output.tasks ?? [];
  const contacts: any[] = output.contacts ?? [];
  const deals: any[] = output.deals ?? [];

  return (
    <Card className="p-3 border-primary/20 bg-muted/30">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{label}</div>

      {leads.length > 0 && (
        <ul className="divide-y">
          {leads.map((l) => (
            <li key={l.id}>
              <button
                className="w-full text-left py-1.5 flex items-center justify-between hover:bg-muted/50 px-1 rounded"
                onClick={() => { trackClick("lead", l.id); navigate(`/crm/leads/${l.id}`); }}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{l.first_name} {l.last_name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {l.status} {l.lead_score != null && `· score ${l.lead_score}`} {l.is_stuck && "· stuck"}
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {ops.length > 0 && (
        <ul className="divide-y">
          {ops.map((o) => (
            <li key={o.id} className="py-1.5">
              <Link to={`/crm/leads/${o.lead_id}`} onClick={() => trackClick("opportunity", o.id)} className="flex items-center justify-between hover:bg-muted/50 px-1 rounded">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{o.property_address ?? "Opportunity"}</div>
                  <div className="text-xs text-muted-foreground">{o.stage} {o.loan_amount && `· $${Number(o.loan_amount).toLocaleString()}`}</div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {tasks.length > 0 && (
        <ul className="divide-y">
          {tasks.map((t) => (
            <li key={t.id} className="py-1.5 px-1">
              <div className="text-sm font-medium">{t.title}</div>
              <div className="text-xs text-muted-foreground">
                {t.status}{t.due_at && ` · due ${new Date(t.due_at).toLocaleDateString()}`}
                {t.lead_id && (
                  <> · <button onClick={() => { trackClick("lead", t.lead_id); navigate(`/crm/leads/${t.lead_id}`); }} className="text-primary hover:underline">open lead</button></>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {contacts.length > 0 && (
        <ul className="divide-y">
          {contacts.map((c) => (
            <li key={c.id}>
              <button onClick={() => { trackClick("contact", c.id); navigate(`/crm/contacts/${c.id}`); }} className="w-full text-left py-1.5 flex items-center justify-between hover:bg-muted/50 px-1 rounded">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.first_name} {c.last_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.email} {c.job_title && `· ${c.job_title}`}</div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {deals.length > 0 && (
        <ul className="divide-y">
          {deals.map((d) => (
            <li key={d.id} className="py-1.5 px-1">
              <div className="text-sm font-medium">{d.property_address ?? d.loan_type ?? "Deal"}</div>
              <div className="text-xs text-muted-foreground">{d.stage} {d.loan_amount && `· $${Number(d.loan_amount).toLocaleString()}`}</div>
            </li>
          ))}
        </ul>
      )}

      {name === "get_morning_brief" && output && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <BriefStat label="Stuck" value={output.stuck_leads?.length ?? 0} />
          <BriefStat label="Hot" value={output.hot_leads?.length ?? 0} />
          <BriefStat label="Due today" value={output.tasks_due_today?.length ?? 0} />
          <BriefStat label="Moves (24h)" value={output.recent_stage_changes?.length ?? 0} />
        </div>
      )}

      {!leads.length && !ops.length && !tasks.length && !contacts.length && !deals.length && name !== "get_morning_brief" && (
        <div className="text-xs text-muted-foreground">No results.</div>
      )}
    </Card>
  );
}

function BriefStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}