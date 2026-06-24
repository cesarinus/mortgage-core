import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: runId, error: runErr } = await supabase.rpc("run_integrity_scan");
    if (runErr) throw runErr;

    const { data: rows, error: rowsErr } = await supabase
      .from("entity_health_report")
      .select("entity_key, check_key, status, issue_count, details")
      .eq("scan_run_id", runId);
    if (rowsErr) throw rowsErr;

    const summary = (rows ?? []).reduce(
      (acc: Record<string, number>, r: { status: string }) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      },
      { pass: 0, warn: 0, fail: 0, error: 0 },
    );

    return new Response(
      JSON.stringify({ scan_run_id: runId, summary, results: rows ?? [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    console.error("integrity-scan error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});