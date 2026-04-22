import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { from, to } = await req.json();
    if (!from || !to) {
      return new Response(JSON.stringify({ error: "from and to required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromDate = new Date(from + "T00:00:00Z");
    const toDate = new Date(to + "T00:00:00Z");
    const dayMs = 86_400_000;
    const span = Math.round((toDate.getTime() - fromDate.getTime()) / dayMs);
    if (isNaN(span) || span < 0 || span > 60) {
      return new Response(JSON.stringify({ error: "Range must be 0-60 days" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const days: Record<string, string[]> = {};
    for (let i = 0; i <= span; i++) {
      const d = new Date(fromDate.getTime() + i * dayMs);
      const iso = d.toISOString().slice(0, 10);
      const { data, error } = await supabase.rpc("get_available_slots", { p_date: iso });
      if (error) {
        console.error("[get-booking-availability] RPC error:", error);
        days[iso] = [];
        continue;
      }
      days[iso] = (data ?? []).map((row: any) => (typeof row === "string" ? row : row.get_available_slots ?? row));
    }

    return new Response(JSON.stringify({ days }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[get-booking-availability] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});