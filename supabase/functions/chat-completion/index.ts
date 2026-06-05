// AI assistant edge function: streams responses for CRM and Borrower Portal.
// Loads scoped, grounded context from the DB and forwards to Lovable AI Gateway.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";
import { convertToModelMessages, streamText, type UIMessage } from "npm:ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Scope = "crm" | "portal";
type RecordKind = "lead" | "contact" | "deal" | "portal" | null;

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

    const result = streamText({
      model,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
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
    "Ground every answer strictly in the JSON context below. Never invent fields, contacts, or activity.",
    "If data is missing, say so and suggest the next action (e.g., 'No mortgage_profile on file — open Smart Intake').",
    "You are read-only: suggest actions (add note, create task, send email, update status, upload document) and tell the user which UI button performs them. Do not claim to have executed anything.",
    "Use concise Markdown. Tables for activity timelines and checklists are encouraged.",
    "Context JSON:",
    "```json",
    JSON.stringify(ctx, null, 2),
    "```",
  ].join("\n");
}