import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_EVENTS: Record<string, number> = {
  page_view: 5,
  scroll_50: 10,
  scroll_90: 20,
  time_on_page: 15,
  cta_click: 30,
  multi_visit: 25,
  exit_intent_triggered: 0,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const session_id = typeof body.session_id === "string" ? body.session_id.trim() : "";
    const event_type = typeof body.event_type === "string" ? body.event_type.trim() : "";
    const post_id = typeof body.post_id === "string" ? body.post_id.trim() : null;

    if (!session_id || session_id.length > 64) {
      return new Response(JSON.stringify({ error: "Invalid session_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!(event_type in VALID_EVENTS)) {
      return new Response(JSON.stringify({ error: "Invalid event_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const points = VALID_EVENTS[event_type];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Insert event
    await supabase.from("blog_events").insert({
      session_id,
      post_id: post_id || null,
      event_type,
      points,
      metadata: body.metadata || {},
    });

    // Upsert session and increment score
    const { data: existing } = await supabase
      .from("blog_sessions")
      .select("id, total_score, posts_viewed")
      .eq("session_id", session_id)
      .maybeSingle();

    if (existing) {
      const newPostsViewed =
        event_type === "page_view" ? existing.posts_viewed + 1 : existing.posts_viewed;
      await supabase
        .from("blog_sessions")
        .update({
          total_score: existing.total_score + points,
          posts_viewed: newPostsViewed,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("blog_sessions").insert({
        session_id,
        total_score: points,
        posts_viewed: event_type === "page_view" ? 1 : 0,
      });
    }

    return new Response(JSON.stringify({ success: true, points }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Track event error:", err);
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
