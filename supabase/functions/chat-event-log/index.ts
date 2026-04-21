import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_POINTS: Record<string, number> = {
  chat_started: 10,
  message_sent: 2,
  contact_info_captured: 25,
  mortgage_info_collected: 25,
  cta_clicked: 30,
};

const requireAuth = (req: Request): boolean => {
  const expected = Deno.env.get("CHAT_INGEST_SECRET");
  if (!expected) return false;
  return (req.headers.get("authorization") || "") === `Bearer ${expected}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!requireAuth(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const session_id = typeof body.chat_session_id === "string" ? body.chat_session_id.trim().slice(0, 64) : "";
    const event_type = typeof body.event_type === "string" ? body.event_type.trim() : "";
    if (!session_id || !event_type || !(event_type in DEFAULT_POINTS)) {
      return new Response(JSON.stringify({ error: "Invalid session_id or event_type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const points = Number.isFinite(body.score_delta) ? Number(body.score_delta) : DEFAULT_POINTS[event_type];
    const metadata = (body.metadata && typeof body.metadata === "object") ? body.metadata : {};

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: session } = await supabase.from("chat_sessions")
      .select("id, lead_id, total_score").eq("session_id", session_id).maybeSingle();

    if (!session?.lead_id) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_lead_yet" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const minuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { data: dup } = await supabase.from("lead_events")
      .select("id").eq("lead_id", session.lead_id).eq("event_type", event_type)
      .gte("created_at", minuteAgo).limit(1).maybeSingle();

    if (dup) {
      return new Response(JSON.stringify({ event_id: dup.id, lead_id: session.lead_id, points_added: 0, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ev, error } = await supabase.from("lead_events").insert({
      lead_id: session.lead_id, event_type, points, metadata,
    }).select("id").single();
    if (error) {
      console.error("insert event error", error);
      return new Response(JSON.stringify({ error: "Insert failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("chat_sessions")
      .update({ total_score: (session.total_score || 0) + points })
      .eq("id", session.id);

    return new Response(JSON.stringify({
      event_id: ev.id, lead_id: session.lead_id, points_added: points, skipped: false,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("chat-event-log error", err);
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});