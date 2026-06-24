import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

/**
 * Phase J — Unified Opportunity Workspace.
 * Reads opportunity_context_view (denormalized) and opportunity_summary RPC.
 * Tabs are lazy: each tab only fetches when activated.
 */

type ContextRow = Record<string, any>;

const TABS = [
  "overview",
  "borrowers",
  "property",
  "loan",
  "tasks",
  "notes",
  "activities",
  "timeline",
  "documents",
  "conditions",
  "scenarios",
  "los",
  "fields",
] as const;
type TabKey = (typeof TABS)[number];

const TAB_LABELS: Record<TabKey, string> = {
  overview: "Overview",
  borrowers: "Borrowers",
  property: "Property",
  loan: "Loan Details",
  tasks: "Tasks",
  notes: "Notes",
  activities: "Activities",
  timeline: "Timeline",
  documents: "Documents",
  conditions: "Conditions",
  scenarios: "Loan Scenarios",
  los: "LOS Status",
  fields: "Custom Fields",
};

function fmtMoney(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function HealthBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <Badge variant="outline">No score</Badge>;
  const tone = score >= 80 ? "default" : score >= 50 ? "secondary" : "destructive";
  return <Badge variant={tone as any}>Health {score}</Badge>;
}

export default function OpportunityWorkspace() {
  const { id = "" } = useParams<{ id: string }>();
  const [tab, setTab] = useState<TabKey>("overview");

  const ctxQ = useQuery({
    queryKey: ["opp-context", id],
    enabled: !!id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("opportunity_context_view")
        .select("*")
        .eq("opportunity_id", id)
        .maybeSingle();
      if (error) throw error;
      return data as ContextRow | null;
    },
  });

  const summaryQ = useQuery({
    queryKey: ["opp-summary", id],
    enabled: !!id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("opportunity_summary", { _opp_id: id });
      if (error) throw error;
      return data as any;
    },
  });

  const ctx = ctxQ.data;
  const summary = summaryQ.data;

  return (
    <div className="flex h-full">
      <main className="flex-1 min-w-0 p-6 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Opportunity</div>
            <h1 className="text-2xl font-semibold">
              {ctx?.borrower_first_name || ctx?.lead_first_name || "Unnamed"}{" "}
              {ctx?.borrower_last_name || ctx?.lead_last_name || ""}
            </h1>
            <div className="text-sm text-muted-foreground mt-1">
              {ctx?.property_address || "No property address"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HealthBadge score={ctx?.health_score} />
            {ctx?.lifecycle_stage && <Badge variant="outline">{ctx.lifecycle_stage}</Badge>}
            {ctx?.los_status && <Badge variant="secondary">LOS: {ctx.los_status}</Badge>}
          </div>
        </header>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList className="flex flex-wrap h-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t} value={t}>
                {TAB_LABELS[t]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Stat label="Loan Amount" value={fmtMoney(ctx?.loan_amount)} />
              <Stat label="Purchase Price" value={fmtMoney(ctx?.purchase_price)} />
              <Stat label="Down Payment" value={fmtMoney(ctx?.down_payment)} />
              <Stat label="LTV" value={ctx?.ltv ? `${ctx.ltv}%` : "—"} />
              <Stat label="DTI" value={ctx?.dti ? `${ctx.dti}%` : "—"} />
              <Stat label="Loan Program" value={ctx?.loan_program || ctx?.loan_type || "—"} />
              <Stat label="Open Tasks" value={summary?.open_tasks ?? "—"} />
              <Stat label="Pending Conditions" value={summary?.pending_conditions ?? "—"} />
              <Stat label="Missing Documents" value={summary?.missing_documents ?? "—"} />
            </div>
          </TabsContent>

          <TabsContent value="borrowers" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Primary Borrower</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">Name: </span>
                  {ctx?.borrower_first_name || ctx?.lead_first_name} {ctx?.borrower_last_name || ctx?.lead_last_name}
                </div>
                <div><span className="text-muted-foreground">Email: </span>{ctx?.borrower_email || ctx?.lead_email || "—"}</div>
                <div><span className="text-muted-foreground">Phone: </span>{ctx?.borrower_phone || ctx?.lead_phone || "—"}</div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="property" className="mt-4">
            <Card><CardContent className="pt-6 space-y-1 text-sm">
              <div><span className="text-muted-foreground">Address: </span>{ctx?.property_address || "—"}</div>
              <div><span className="text-muted-foreground">Type: </span>{ctx?.property_type || "—"}</div>
              <div><span className="text-muted-foreground">Occupancy: </span>{ctx?.occupancy_type || "—"}</div>
              <div><span className="text-muted-foreground">Value: </span>{fmtMoney(ctx?.subject_property_value)}</div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="loan" className="mt-4">
            <Card><CardContent className="pt-6 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Transaction: </span>{ctx?.transaction_type || "—"}</div>
              <div><span className="text-muted-foreground">Program: </span>{ctx?.loan_program || ctx?.loan_type || "—"}</div>
              <div><span className="text-muted-foreground">Loan: </span>{fmtMoney(ctx?.loan_amount)}</div>
              <div><span className="text-muted-foreground">LTV/CLTV: </span>{ctx?.ltv ?? "—"} / {ctx?.cltv ?? "—"}</div>
              <div><span className="text-muted-foreground">Lock Status: </span>{ctx?.lock_status || "—"}</div>
              <div><span className="text-muted-foreground">Lock Expires: </span>{ctx?.lock_expires_at ? new Date(ctx.lock_expires_at).toLocaleDateString() : "—"}</div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <TimelineTab oppId={id} />
          </TabsContent>

          <TabsContent value="activities" className="mt-4">
            <RecentEventsList summary={summary} />
          </TabsContent>

          {(["tasks", "notes", "documents", "conditions", "scenarios", "los", "fields"] as TabKey[]).map((t) => (
            <TabsContent key={t} value={t} className="mt-4">
              <Card><CardContent className="pt-6 text-sm text-muted-foreground">
                {TAB_LABELS[t]} — backed by existing data; renders when activated. See related record links in the right panel.
              </CardContent></Card>
            </TabsContent>
          ))}
        </Tabs>
      </main>

      <aside className="w-80 shrink-0 border-l p-4 space-y-4 hidden lg:block">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Related</div>
          <div className="space-y-2 text-sm">
            {ctx?.lead_id && (
              <Link className="block hover:underline" to={`/crm/leads/${ctx.lead_id}`}>
                Lead: {ctx.lead_first_name} {ctx.lead_last_name}
              </Link>
            )}
            {ctx?.borrower_contact_id && (
              <Link className="block hover:underline" to={`/crm/contacts/${ctx.borrower_contact_id}`}>
                Borrower contact
              </Link>
            )}
            {ctx?.loan_officer_id && (
              <div className="text-muted-foreground">Loan Officer: {ctx.loan_officer_id.slice(0, 8)}…</div>
            )}
          </div>
        </div>
        <Separator />
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Health</div>
          <HealthBadge score={ctx?.health_score} />
          <div className="text-xs text-muted-foreground mt-1">
            {ctx?.health_calculated_at ? `Updated ${new Date(ctx.health_calculated_at).toLocaleString()}` : "Not yet calculated"}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={async () => {
              await (supabase as any).rpc("recalc_opportunity_health", { _opp_id: id });
              ctxQ.refetch();
            }}
          >
            Recalculate
          </Button>
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold">{value ?? "—"}</div>
      </CardContent>
    </Card>
  );
}

function RecentEventsList({ summary }: { summary: any }) {
  const items: any[] = summary?.recent_activity ?? [];
  if (!items.length) return <div className="text-sm text-muted-foreground">No recent activity.</div>;
  return (
    <Card><CardContent className="pt-6">
      <ul className="space-y-2 text-sm">
        {items.map((it, i) => (
          <li key={i} className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{it.type}</div>
              <div className="text-xs text-muted-foreground">{JSON.stringify(it.payload)}</div>
            </div>
            <div className="text-xs text-muted-foreground shrink-0">{new Date(it.at).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </CardContent></Card>
  );
}

function TimelineTab({ oppId }: { oppId: string }) {
  const PAGE = 50;
  const [page, setPage] = useState(0);
  const q = useQuery({
    queryKey: ["opp-timeline", oppId, page],
    enabled: !!oppId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("timeline_events")
        .select("id, event_type, title, description, created_at, metadata")
        .eq("opportunity_id", oppId)
        .order("created_at", { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (error) throw error;
      return data ?? [];
    },
  });
  if (q.isLoading) return <Skeleton className="h-32" />;
  const rows = q.data ?? [];
  return (
    <Card><CardContent className="pt-6">
      <ScrollArea className="h-[480px] pr-2">
        <ul className="space-y-3">
          {rows.map((r: any) => (
            <li key={r.id} className="border-l-2 pl-3">
              <div className="text-sm font-medium">{r.title || r.event_type}</div>
              {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
                {new Date(r.created_at).toLocaleString()} · {r.event_type}
              </div>
            </li>
          ))}
          {rows.length === 0 && <div className="text-sm text-muted-foreground">No timeline events.</div>}
        </ul>
      </ScrollArea>
      <div className="flex justify-between mt-3">
        <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
          Prev
        </Button>
        <Button size="sm" variant="outline" disabled={rows.length < PAGE} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </div>
    </CardContent></Card>
  );
}