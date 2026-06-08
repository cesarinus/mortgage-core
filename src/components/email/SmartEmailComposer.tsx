import { useEffect, useMemo, useState } from "react";
import { Mail, Send, Sparkles, Clock } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  recordSend,
  suggestionsFor,
  type ComposerEntry,
} from "@/lib/email/composerMemory";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  to: string;
  recipientName?: string | null;
}

export function SmartEmailComposer({ open, onOpenChange, to, recipientName }: Props) {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sugs, setSugs] = useState<{ recipient: ComposerEntry[]; global: ComposerEntry[] }>(
    { recipient: [], global: [] },
  );

  useEffect(() => {
    if (!open) return;
    setSugs(suggestionsFor(to));
    // Reset only if no in-progress draft
    setSubject((s) => s || "");
    setBody((b) => b || (recipientName ? `Hi ${recipientName.split(" ")[0]},\n\n` : ""));
  }, [open, to, recipientName]);

  const topRecipient = useMemo(() => sugs.recipient.slice(0, 4), [sugs]);
  const topGlobal = useMemo(
    () =>
      sugs.global
        .filter((g) => !sugs.recipient.some((r) => r.subject === g.subject))
        .slice(0, 4),
    [sugs],
  );

  const applyEntry = (e: ComposerEntry) => {
    setSubject(e.subject);
    if (!body.trim() || body.trim() === `Hi ${recipientName?.split(" ")[0] ?? ""},`)
      setBody(e.body);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to) return;
    setLoading(true);
    try {
      const html = body
        .split("\n")
        .map((l) => `<p>${l.replace(/</g, "&lt;").replace(/>/g, "&gt;") || "&nbsp;"}</p>`)
        .join("");
      const { error } = await supabase.functions.invoke("send-email", {
        body: { to, subject, html, text: body },
      });
      if (error) throw error;
      recordSend(to, subject, body);
      toast({ title: "Email sent", description: `Sent to ${to}` });
      setSubject("");
      setBody("");
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Send failed",
        description: err?.message ?? "Check your email provider settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            New Email
          </SheetTitle>
          <SheetDescription>
            To <span className="font-medium text-foreground">{recipientName || to}</span>
            {recipientName && <span className="text-muted-foreground"> · {to}</span>}
          </SheetDescription>
        </SheetHeader>

        {(topRecipient.length > 0 || topGlobal.length > 0) && (
          <div className="mb-4 space-y-3 rounded-md border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Smart suggestions
            </div>
            {topRecipient.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Used with this person
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {topRecipient.map((s, i) => (
                    <Badge
                      key={`r-${i}`}
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80"
                      onClick={() => applyEntry(s)}
                    >
                      {s.subject.slice(0, 38)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {topGlobal.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Your most-used subjects
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {topGlobal.map((s, i) => (
                    <Badge
                      key={`g-${i}`}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => applyEntry(s)}
                    >
                      {s.subject.slice(0, 38)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="se-to">To</Label>
            <Input id="se-to" value={to} readOnly className="bg-muted/50" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="se-subject">Subject</Label>
            <Input
              id="se-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="se-body">Message</Label>
            <Textarea
              id="se-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Write your message…"
              required
            />
          </div>
          <Separator />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !subject.trim() || !body.trim()}>
              {loading ? "Sending…" : (<><Send className="h-4 w-4 mr-2" /> Send</>)}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}