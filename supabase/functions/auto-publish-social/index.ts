import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Cron-triggered: finds posts where status='scheduled' and scheduled_date+time <= now,
 * then invokes publish-to-social for each. No JWT required (verify_jwt=false).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const nowIso = new Date().toISOString();
    const { data: duePosts, error } = await supabase
      .from("social_media_posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_date", nowIso.slice(0, 10))
      .limit(20);

    if (error) throw error;

    const results: any[] = [];
    for (const post of duePosts || []) {
      const scheduledAt = new Date(`${post.scheduled_date}T${post.scheduled_time || "10:00:00"}-05:00`);
      if (scheduledAt > new Date()) continue;

      const resp = await fetch(`${supabaseUrl}/functions/v1/publish-to-social`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ postId: post.id }),
      });
      const data = await resp.json();
      results.push({ postId: post.id, ...data });
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("auto-publish-social error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});