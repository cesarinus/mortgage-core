import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Gather metrics per variant combo
    const { data: metrics } = await supabase
      .from("blog_variant_metrics")
      .select("cta_position, cta_text, sidebar_module, event_type");

    if (!metrics || metrics.length < 50) {
      return new Response(
        JSON.stringify({
          status: "insufficient_data",
          message: "Need at least 50 events to optimize",
          recommendations: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aggregate by variant combo
    const combos: Record<
      string,
      { impressions: number; clicks: number; conversions: number; cta_position: string; cta_text: string; sidebar_module: string }
    > = {};

    for (const m of metrics) {
      const key = `${m.cta_position}|${m.cta_text}|${m.sidebar_module}`;
      if (!combos[key]) {
        combos[key] = {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          cta_position: m.cta_position,
          cta_text: m.cta_text,
          sidebar_module: m.sidebar_module,
        };
      }
      if (m.event_type === "impression") combos[key].impressions++;
      if (m.event_type === "click") combos[key].clicks++;
      if (m.event_type === "conversion") combos[key].conversions++;
    }

    const results = Object.values(combos).map((c) => ({
      ...c,
      ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
      conversion_rate: c.clicks > 0 ? (c.conversions / c.clicks) * 100 : 0,
    }));

    // Sort by conversion rate, then CTR
    results.sort((a, b) => b.conversion_rate - a.conversion_rate || b.ctr - a.ctr);

    const CTR_THRESHOLD = 2; // 2%
    const recommendations = {
      best_performing: results[0] || null,
      worst_performing: results[results.length - 1] || null,
      deprioritize: results.filter((r) => r.ctr < CTR_THRESHOLD && r.impressions >= 10),
      boost: results.filter((r) => r.conversion_rate > 5),
    };

    return new Response(
      JSON.stringify({ status: "ok", results, recommendations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Optimize variants error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
