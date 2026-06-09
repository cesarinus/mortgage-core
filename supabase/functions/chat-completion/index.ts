// AI assistant edge function: streams responses for CRM and Borrower Portal.
// Loads scoped, grounded context from the DB and forwards to Lovable AI Gateway.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "npm:ai";
import { z } from "npm:zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Scope = "crm" | "portal";
type RecordKind = "lead" | "contact" | "deal" | "portal" | "hub" | null;

interface Body {
  threadId?: string;
  scope: Scope;
  recordKind?: RecordKind;
  recordId?: string | null;
  messages: UIMessage[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "Missing LOVABLE_API_KEY" }, 500);

    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supaUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supaUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const body = (await req.json()) as Body;
    const scope: Scope = body.scope === "portal" ? "portal" : "crm";
    const recordKind: RecordKind = (body.recordKind ?? null) as RecordKind;
    const recordId = body.recordId ?? null;
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (messages.length === 0) return json({ error: "messages required" }, 400);

    // Resolve / create thread
    let threadId = body.threadId ?? null;
    if (threadId) {
      const { data: t } = await admin
        .from("chat_threads")
        .select("id,user_id")
        .eq("id", threadId)
        .maybeSingle();
      if (!t || t.user_id !== userId) return json({ error: "Thread not found" }, 404);
    } else {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const title = extractText(lastUser).slice(0, 60) || "New conversation";
      const { data: t, error } = await admin
        .from("chat_threads")
        .insert({
          user_id: userId,
          scope,
          record_kind: recordKind,
          record_id: recordId,
          title,
        })
        .select("id")
        .single();
      if (error || !t) return json({ error: error?.message ?? "Failed to create thread" }, 500);
      threadId = t.id;
    }

    // Persist the latest user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      await admin.from("chat_messages").insert({
        thread_id: threadId,
        role: "user",
        content: extractText(lastUserMsg),
      });
    }

    // Build context using a user-scoped client so RLS protects data
    const context = await loadContext(userClient, scope, recordKind, recordId);

    const systemPrompt = buildSystemPrompt(scope, context);

    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: {
        "Lovable-API-Key": lovableKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
    });
    const model = gateway("google/gemini-3-flash-preview");

    const tools = scope === "crm" ? buildCrmTools(userClient) : undefined;

    const result = streamText({
      model,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(50),
      onFinish: async ({ text }) => {
        try {
          await admin.from("chat_messages").insert({
            thread_id: threadId,
            role: "assistant",
            content: text,
          });
          await admin
            .from("chat_threads")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", threadId);
        } catch (e) {
          console.error("persist assistant failed", e);
        }
      },
    });

    return result.toUIMessageStreamResponse({
      headers: { ...corsHeaders, "X-Thread-Id": threadId! },
      originalMessages: messages,
    });
  } catch (e) {
    console.error("chat-completion error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractText(msg: UIMessage | undefined): string {
  if (!msg) return "";
  const parts = (msg as any).parts;
  if (Array.isArray(parts)) {
    return parts.filter((p: any) => p?.type === "text").map((p: any) => p.text).join("\n");
  }
  return (msg as any).content ?? "";
}

async function loadContext(
  client: ReturnType<typeof createClient>,
  scope: Scope,
  kind: RecordKind,
  recordId: string | null,
): Promise<Record<string, unknown>> {
  const ctx: Record<string, unknown> = { scope };

  if (scope === "crm" && recordId && (kind === "lead" || kind === "contact")) {
    let leadId: string | null = null;
    if (kind === "lead") {
      leadId = recordId;
      const { data: lead } = await client.from("leads").select("*").eq("id", recordId).maybeSingle();
      ctx.lead = lead;
    } else {
      const { data: contact } = await client.from("contacts").select("*").eq("id", recordId).maybeSingle();
      ctx.contact = contact;
      const { data: lc } = await client
        .from("lead_contacts")
        .select("lead_id")
        .eq("contact_id", recordId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      leadId = (lc as any)?.lead_id ?? null;
      if (leadId) {
        const { data: lead } = await client.from("leads").select("*").eq("id", leadId).maybeSingle();
        ctx.lead = lead;
      }
    }
    if (leadId) {
      const [mp, sent, acts, events, tags, lcs] = await Promise.all([
        client.from("mortgage_profiles").select("*").eq("lead_id", leadId).maybeSingle(),
        client.from("lead_sentiment").select("*").eq("lead_id", leadId).maybeSingle(),
        client.from("crm_activities").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(25),
        client.from("lead_events").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(25),
        client.from("lead_tags").select("*").eq("lead_id", leadId),
        client.from("lead_contacts").select("*, contacts(*)").eq("lead_id", leadId),
      ]);
      ctx.mortgage_profile = mp.data;
      ctx.sentiment = sent.data;
      ctx.activities = acts.data;
      ctx.events = events.data;
      ctx.tags = tags.data;
      ctx.related_contacts = lcs.data;
      const contactIds = (lcs.data ?? []).map((r: any) => r.contact_id).filter(Boolean);
      if (contactIds.length > 0) {
        const { data: deals } = await client.from("deals").select("*").in("contact_id", contactIds);
        ctx.deals = deals;
      }
      const { data: tasks } = await client.from("tasks").select("*").eq("lead_id", leadId).order("due_at", { ascending: true }).limit(25);
      ctx.tasks = tasks;
    }
  } else if (scope === "portal") {
    const { data: portal } = await client
      .from("portal_users")
      .select("*, deal_id")
      .limit(1)
      .maybeSingle();
    const dealId = (portal as any)?.deal_id;
    if (dealId) {
      const [deal, scenarios, docs, msgs, tasks] = await Promise.all([
        client.from("deals").select("id, stage, loan_type, loan_amount, property_address, target_close_date, interest_rate, term_months").eq("id", dealId).maybeSingle(),
        client.from("loan_scenarios").select("id, name, rate, term_months, monthly_payment, created_at").eq("deal_id", dealId).limit(10),
        client.from("documents").select("id, file_name, status, category_slug, created_at").eq("deal_id", dealId).order("created_at", { ascending: false }).limit(50),
        client.from("portal_messages").select("id, body, sender_role, created_at").eq("deal_id", dealId).order("created_at", { ascending: false }).limit(25),
        client.from("tasks").select("id, title, description, status, due_at").eq("deal_id", dealId).order("due_at", { ascending: true }).limit(25),
      ]);
      ctx.deal = deal.data;
      ctx.scenarios = scenarios.data;
      ctx.documents = docs.data;
      ctx.messages = msgs.data;
      ctx.tasks = tasks.data;
    }
  }
  return ctx;
}

function buildSystemPrompt(scope: Scope, ctx: Record<string, unknown>): string {
  if (scope === "portal") {
    return [
      "You are the NexGen Capital Borrower Portal assistant.",
      "Tone: professional, supportive, plain-language mortgage guidance.",
      "Only use the JSON context below. If the answer is not in the data, say you don't know and suggest contacting the loan officer.",
      "Never reveal internal CRM fields, scoring, sentiment, or staff assignments.",
      "You can suggest actions (upload document, message loan officer) but cannot perform them. Tell the user which button to use.",
      "Render answers in concise Markdown. Use tables for document checklists when helpful.",
      "Context JSON:",
      "```json",
      JSON.stringify(ctx, null, 2),
      "```",
    ].join("\n");
  }
  return [
    "You are the NexGen Capital CRM assistant for internal staff (loan officers, processors, admins).",
    "You have read-only tools to query the CRM live. Call them whenever the user asks about leads, deals, tasks, contacts, the pipeline, or what needs attention. NEVER invent records — always call a tool first.",
    "Available tools: query_leads, query_pipeline, query_tasks, query_contacts, query_deals, summarize_record, get_morning_brief.",
    "After calling tools, write a concise Markdown summary of the results. Reference records by name and include short context (status, score, days since contact). Do NOT paste raw JSON.",
    "You CANNOT take any write actions. If asked to send/create/update, explain which UI screen to use and offer to summarize related info instead.",
    "If the JSON context already contains a focused record, prefer answering from it. Otherwise, call tools.",
    "Use concise Markdown. Tables are encouraged for lists.",
    "Context JSON:",
    "```json",
    JSON.stringify(ctx, null, 2),
    "```",
  ].join("\n");
}

// ---- Read-only CRM tools (RLS-scoped via userClient) ----
function buildCrmTools(client: ReturnType<typeof createClient>) {
  return {
    query_leads: tool({
      description:
        "Query leads owned by or assigned to the current user. Filters: needs_attention (stuck or >7d no activity), stuck (is_stuck=true), high_score (>=60), uncontacted (>N days since last_activity_at), by_status.",
      inputSchema: z.object({
        filter: z.enum(["needs_attention", "stuck", "high_score", "uncontacted", "by_status", "all"]).default("all"),
        status: z.string().optional(),
        uncontacted_days: z.number().int().min(1).max(60).default(7),
        limit: z.number().int().min(1).max(50).default(15),
      }),
      execute: async ({ filter, status, uncontacted_days, limit }) => {
        let q = client
          .from("leads")
          .select("id, first_name, last_name, email, status, lead_score, is_stuck, last_activity_at, intent_tag, loan_purpose, created_at")
          .order("lead_score", { ascending: false })
          .limit(limit);
        if (filter === "stuck") q = q.eq("is_stuck", true);
        if (filter === "high_score") q = q.gte("lead_score", 60);
        if (filter === "by_status" && status) q = q.eq("status", status as any);
        if (filter === "uncontacted" || filter === "needs_attention") {
          const cutoff = new Date(Date.now() - uncontacted_days * 86400000).toISOString();
          q = q.or(`last_activity_at.lt.${cutoff},last_activity_at.is.null`);
        }
        if (filter === "needs_attention") q = q.or("is_stuck.eq.true,lead_score.gte.60");
        const { data, error } = await q;
        if (error) return { error: error.message, leads: [] };
        return { count: data?.length ?? 0, leads: data ?? [] };
      },
    }),
    query_pipeline: tool({
      description: "Query pipeline opportunities (active deals). Filter by stage if provided.",
      inputSchema: z.object({
        stage: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async ({ stage, limit }) => {
        let q = client
          .from("pipeline_opportunities")
          .select("id, lead_id, stage, loan_amount, property_address, target_close_date, created_at")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (stage) q = q.eq("stage", stage);
        const { data, error } = await q;
        if (error) return { error: error.message, opportunities: [] };
        return { count: data?.length ?? 0, opportunities: data ?? [] };
      },
    }),
    query_tasks: tool({
      description: "Query CRM tasks. status: open (not done), overdue (open + past due), due_today.",
      inputSchema: z.object({
        status: z.enum(["open", "overdue", "due_today", "all"]).default("open"),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async ({ status, limit }) => {
        let q = client
          .from("crm_tasks")
          .select("id, lead_id, contact_id, title, status, priority, due_at, assignee_id")
          .order("due_at", { ascending: true, nullsFirst: false })
          .limit(limit);
        if (status === "open") q = q.neq("status", "done");
        if (status === "overdue") q = q.neq("status", "done").lt("due_at", new Date().toISOString());
        if (status === "due_today") {
          const start = new Date(); start.setHours(0, 0, 0, 0);
          const end = new Date(); end.setHours(23, 59, 59, 999);
          q = q.neq("status", "done").gte("due_at", start.toISOString()).lte("due_at", end.toISOString());
        }
        const { data, error } = await q;
        if (error) return { error: error.message, tasks: [] };
        return { count: data?.length ?? 0, tasks: data ?? [] };
      },
    }),
    query_contacts: tool({
      description: "Search contacts by name or email.",
      inputSchema: z.object({
        search: z.string().min(1),
        limit: z.number().int().min(1).max(30).default(15),
      }),
      execute: async ({ search, limit }) => {
        const s = `%${search}%`;
        const { data, error } = await client
          .from("contacts")
          .select("id, first_name, last_name, email, contact_type, job_title, temperature, lead_score")
          .or(`first_name.ilike.${s},last_name.ilike.${s},email.ilike.${s}`)
          .limit(limit);
        if (error) return { error: error.message, contacts: [] };
        return { count: data?.length ?? 0, contacts: data ?? [] };
      },
    }),
    query_deals: tool({
      description: "Query deals. Filter by stage if provided.",
      inputSchema: z.object({
        stage: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async ({ stage, limit }) => {
        let q = client
          .from("deals")
          .select("id, contact_id, stage, loan_amount, loan_type, property_address, created_at")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (stage) q = q.eq("stage", stage as any);
        const { data, error } = await q;
        if (error) return { error: error.message, deals: [] };
        return { count: data?.length ?? 0, deals: data ?? [] };
      },
    }),
    summarize_record: tool({
      description: "Pull a focused snapshot for one record. kind=lead|contact|deal.",
      inputSchema: z.object({
        kind: z.enum(["lead", "contact", "deal"]),
        id: z.string().uuid(),
      }),
      execute: async ({ kind, id }) => {
        if (kind === "lead") {
          const [lead, acts, conds, tasks] = await Promise.all([
            client.from("leads").select("*").eq("id", id).maybeSingle(),
            client.from("crm_activities").select("activity_type, title, created_at").eq("lead_id", id).order("created_at", { ascending: false }).limit(10),
            client.from("loan_conditions").select("title, status, category, required").eq("lead_id", id).limit(20),
            client.from("crm_tasks").select("title, status, due_at").eq("lead_id", id).neq("status", "done").limit(10),
          ]);
          return { lead: lead.data, recent_activities: acts.data, conditions: conds.data, open_tasks: tasks.data };
        }
        if (kind === "contact") {
          const { data } = await client.from("contacts").select("*").eq("id", id).maybeSingle();
          return { contact: data };
        }
        const { data } = await client.from("deals").select("*").eq("id", id).maybeSingle();
        return { deal: data };
      },
    }),
    get_morning_brief: tool({
      description: "Composite snapshot: stuck leads, hot leads, tasks due today, recent stage changes. Call this for daily-brief style questions.",
      inputSchema: z.object({}),
      execute: async () => {
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
        const yesterday = new Date(Date.now() - 86400000).toISOString();
        const [stuck, hot, dueToday, recentMoves] = await Promise.all([
          client.from("leads").select("id, first_name, last_name, lead_score, last_activity_at").eq("is_stuck", true).order("lead_score", { ascending: false }).limit(8),
          client.from("leads").select("id, first_name, last_name, lead_score, status").gte("lead_score", 60).order("lead_score", { ascending: false }).limit(8),
          client.from("crm_tasks").select("id, title, due_at, lead_id").neq("status", "done").gte("due_at", todayStart.toISOString()).lte("due_at", todayEnd.toISOString()).limit(10),
          client.from("deal_stage_history").select("deal_id, old_stage, new_stage, created_at").gte("created_at", yesterday).order("created_at", { ascending: false }).limit(10),
        ]);
        return {
          stuck_leads: stuck.data ?? [],
          hot_leads: hot.data ?? [],
          tasks_due_today: dueToday.data ?? [],
          recent_stage_changes: recentMoves.data ?? [],
        };
      },
    }),
  };
}