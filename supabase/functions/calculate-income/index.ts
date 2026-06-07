import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
  if (authErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const leadId = typeof body?.lead_id === "string" ? body.lead_id : null;
  if (!leadId) return json({ error: "lead_id required" }, 400);

  // Read received income conditions for this lead (RLS scopes to caller).
  const { data: conditions, error: cErr } = await supabase
    .from("loan_conditions")
    .select("id,condition_type,title,status,received_at,document_name,document_url,category")
    .eq("lead_id", leadId)
    .eq("category", "income")
    .eq("status", "received");
  if (cErr) return json({ error: cErr.message }, 400);

  const { data: calc, error: kErr } = await supabase
    .from("borrower_income_calculations")
    .select("*")
    .eq("lead_id", leadId)
    .order("calculation_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (kErr) return json({ error: kErr.message }, 400);

  // Path A: no auto-mutation. Path B (OCR) will inject computed values here later
  // by writing to borrower_income_calculations with source='ocr'.
  return json({
    calculation: calc ?? null,
    income_conditions: conditions ?? [],
  });
});