import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
  if (claimsErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: isAdmin } = await userClient.rpc("has_role", { _role: "admin" });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const body = await req.json().catch(() => ({}));
  const { id, name = "Titan", host, port = 587, username, password, from_email, from_name = "NGCapital Mortgage", is_active = true } = body || {};
  if (!host || !username || !from_email) {
    return new Response(JSON.stringify({ error: "host, username, from_email required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (is_active) {
    await admin.from("email_providers").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
  }

  let result;
  if (id) {
    const patch: any = { name, host, port, username, from_email, from_name, is_active };
    if (password) patch.password = password;
    result = await admin.from("email_providers").update(patch).eq("id", id).select().maybeSingle();
  } else {
    if (!password) {
      return new Response(JSON.stringify({ error: "password required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    result = await admin.from("email_providers").insert({ name, host, port, username, password, from_email, from_name, is_active }).select().maybeSingle();
  }

  if (result.error) {
    return new Response(JSON.stringify({ error: result.error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ ok: true, id: result.data?.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});