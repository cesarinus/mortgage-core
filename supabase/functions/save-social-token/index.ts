import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Not signed in" }, 401);
    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (!isAdmin) return json({ error: "Only admins can manage social tokens" }, 403);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const action = body?.action === "status" ? "status" : "save";

    if (action === "status") {
      const { data } = await admin.from("social_credentials").select("token_last4, account_name, updated_at").eq("provider", "meta").maybeSingle();
      return json({ meta: data || null });
    }

    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (token.length < 20 || token.length > 2000 || /\s/.test(token)) return json({ error: "That doesn't look like a valid access token" }, 400);

    const r = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${encodeURIComponent(token)}`);
    const me = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: `Meta rejected the token: ${me?.error?.message || r.status}` }, 400);

    const { error } = await admin.from("social_credentials").upsert({
      provider: "meta", access_token: token, token_last4: token.slice(-4),
      account_name: me?.name || null, updated_by: u.user.id, updated_at: new Date().toISOString(),
    });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, account_name: me?.name || null, token_last4: token.slice(-4) });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
