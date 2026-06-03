import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail, Phone, CalendarDays, CheckSquare, StickyNote, Paperclip,
  Settings2, ArrowRightCircle, Activity, Gauge, FileText, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

type UnifiedEvent = {
  id: string;
  source: "activity" | "lead_event" | "deal_event" | "attachment" | "sentiment";
  type: string; // normalized: status_change | email | call | meeting | note | task | attachment | system | sentiment
  created_at: string;
  title: string;
  body?: string | null;
  actor?: string | null;
  related?: { kind: "lead" | "contact" | "deal" | "attachment"; id: string; label: string; href?: string } | null;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "status", label: "Status changes" },
  { key: "email", label: "Emails" },
  { key: "document", label: "Documents" },
  { key: "note", label: "Notes" },
];

const ICON: Record<string, any> = {
  note: StickyNote, email: Mail, call: Phone, task: CheckSquare,
  meeting: CalendarDays, attachment: Paperclip, document: Paperclip,
  system: Settings2, status_change: ArrowRightCircle,
  sentiment: Gauge, lead_event: Activity, deal_event: ArrowRightCircle,
};

function matchesFilter(e: UnifiedEvent, key: string) {
  if (key === "all") return true;
  if (key === "status") return e.type === "status_change";
  if (key === "email") return e.type === "email";
  if (key === "document") return e.type === "attachment" || e.type === "document";
  if (key === "note") return e.type === "note";
  return true;
}

export function UnifiedTimelineTab({
  activities = [],
  leadEvents = [],
  dealEvents = [],
  attachments = [],
  sentiment = null,
  deals = [],
  leadId,
  contactId,
}: {
  activities?: any[];
  leadEvents?: any[];
  dealEvents?: any[];
  attachments?: any[];
  sentiment?: any | null;
  deals?: any[];
  leadId?: string;
  contactId?: string;
}) {
  const [filter, setFilter] = useState("all");

  const dealLabelById = useMemo(() => {
    const m = new Map<string, string>();
    (deals ?? []).forEach((d: any) => {
      m.set(d.id, d.loan_type ? `Deal · ${d.loan_type}` : "Deal");
    });
    return m;
  }, [deals]);

  const leadHref = leadId ? `/crm/leads/${leadId}` : undefined;
  const contactHref = contactId ? `/crm/contacts/${contactId}` : undefined;

  const events: UnifiedEvent[] = useMemo(() => {
    const out: UnifiedEvent[] = [];

    (activities ?? []).forEach((a: any) => {
      const t = a.activity_type === "status_change" ? "status_change" : a.activity_type;
      out.push({
        id: `act-${a.id}`,
        source: "activity",
        type: t,
        created_at: a.created_at,
        title: a.title || t,
        body: a.body,
        related: a.lead_id
          ? { kind: "lead", id: a.lead_id, label: "Open lead", href: `/crm/leads/${a.lead_id}` }
          : a.contact_id
          ? { kind: "contact", id: a.contact_id, label: "Open contact", href: `/crm/contacts/${a.contact_id}` }
          : null,
      });
    });

    (leadEvents ?? []).forEach((e: any) => {
      out.push({
        id: `le-${e.id}`,
        source: "lead_event",
        type: "status_change",
        created_at: e.created_at,
        title: `Lead ${e.event_type.replace(/_/g, " ")}`,
        body: e.metadata && Object.keys(e.metadata).length
          ? JSON.stringify(e.metadata)
          : null,
        related: leadHref ? { kind: "lead", id: leadId!, label: "Open lead", href: leadHref } : null,
      });
    });

    (dealEvents ?? []).forEach((e: any) => {
      const dealLabel = dealLabelById.get(e.deal_id) ?? "Deal";
      out.push({
        id: `de-${e.id}`,
        source: "deal_event",
        type: "status_change",
        created_at: e.created_at,
        title: `${dealLabel}: ${e.from_status ?? "?"} → ${e.to_status ?? "?"}`,
        body: null,
        related: { kind: "deal", id: e.deal_id, label: "Open in pipeline", href: `/pipeline` },
      });
    });

    (attachments ?? []).forEach((f: any) => {
      out.push({
        id: `at-${f.id}`,
        source: "attachment",
        type: "attachment",
        created_at: f.created_at,
        title: `Uploaded ${f.file_name}`,
        body: f.category_slug ?? null,
        related: f.lead_id
          ? { kind: "lead", id: f.lead_id, label: "Open lead", href: `/crm/leads/${f.lead_id}` }
          : null,
      });
    });

    if (sentiment?.generated_at) {
      out.push({
        id: `sn-${sentiment.id ?? sentiment.lead_id}`,
        source: "sentiment",
        type: "sentiment",
        created_at: sentiment.generated_at,
        title: `Sentiment refreshed · ${sentiment.temperature ?? "n/a"}`,
        body: sentiment.summary ?? null,
        related: leadHref ? { kind: "lead", id: leadId!, label: "Open lead", href: leadHref } : null,
      });
    }

    return out.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [activities, leadEvents, dealEvents, attachments, sentiment, dealLabelById, leadHref, leadId]);

  const filtered = events.filter((e) => matchesFilter(e, filter));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}>
            {f.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No events to show.</CardContent></Card>
      )}

      <ol className="relative border-l border-border ml-3 space-y-3">
        {filtered.map((e) => {
          const Icon = ICON[e.type] ?? FileText;
          return (
            <li key={e.id} className="ml-6">
              <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background border">
                <Icon className="h-3 w-3" />
              </span>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {e.type.replace(/_/g, " ")}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">{e.source.replace(/_/g, " ")}</Badge>
                        <span className="text-xs text-muted-foreground">{format(new Date(e.created_at), "PPp")}</span>
                      </div>
                      <div className="font-medium text-sm mt-1 truncate">{e.title}</div>
                      {e.body && (
                        <div className="text-sm text-muted-foreground mt-1 line-clamp-3 break-words">{e.body}</div>
                      )}
                    </div>
                    {e.related?.href && (
                      <Button asChild size="sm" variant="ghost" className="shrink-0">
                        <Link to={e.related.href}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          {e.related.label}
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}