import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUFFER = 0.125;

async function fetchMnd(): Promise<number | null> {
  try {
    const res = await fetch("https://www.mortgagenewsdaily.com/mortgage-rates", {
      headers: { "User-Agent": "Mozilla/5.0 (NexGenCapitalCRM)" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Try several patterns to find the 30-year fixed rate
    const patterns = [
      /30\s*Yr\.?\s*Fixed[\s\S]{0,200}?(\d+\.\d{2,3})\s*%/i,
      /30-Year\s*Fixed[\s\S]{0,200}?(\d+\.\d{2,3})\s*%/i,
      /"thirtyYearFixed"\s*:\s*"?(\d+\.\d{2,3})"?/i,
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m) {
        const v = parseFloat(m[1]);
        if (v > 2 && v < 15) return v;
      }
    }
  } catch (_) {}
  return null;
}

async function fetchFred(): Promise<number | null> {
  try {
    // Public CSV (no API key needed) for Freddie Mac PMMS via FRED
    const res = await fetch(
      "https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US",
    );
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split("\n");
    for (let i = lines.length - 1; i > 0; i--) {
      const [, val] = lines[i].split(",");
      const v = parseFloat(val);
      if (!isNaN(v) && v > 2 && v < 15) return v;
    }
  } catch (_) {}
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let manualOverride: number | null = null;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (typeof body?.manual_rate === "number") manualOverride = body.manual_rate;
    }
  } catch (_) {}

  let source = "manual";
  let base: number | null = manualOverride;

  if (base == null) {
    base = await fetchMnd();
    if (base != null) source = "mortgagenewsdaily";
  }
  if (base == null) {
    base = await fetchFred();
    if (base != null) source = "fred-pmms";
  }

  if (base == null) {
    return new Response(
      JSON.stringify({ success: false, error: "All rate sources unavailable; previous rate retained." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const adjusted = +(base + BUFFER).toFixed(4);

  // Deactivate previous active rows
  const { error: deactErr } = await supabase
    .from("mortgage_market_rates")
    .update({ active: false })
    .eq("active", true);
  if (deactErr) {
    return new Response(
      JSON.stringify({ success: false, error: deactErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data, error } = await supabase
    .from("mortgage_market_rates")
    .insert({
      source,
      rate_30yr: base,
      adjusted_rate: adjusted,
      is_manual_override: manualOverride != null,
      active: true,
    })
    .select()
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ success: true, rate: data }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});