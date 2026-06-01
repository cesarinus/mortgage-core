// Borrower-facing: after the borrower signs in (or signs up), they hit this
// function with the invite token. We validate the token, then create the
// portal_users binding and mark the invite consumed. Requires the caller to be
// authenticated so we know which auth.users id to bind.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Sign in first" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: ANON },
    });
    if (!userResp.ok) return new Response(JSON.stringify({ error: "Sign in first" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const user = await userResp.json();

    const { token } = await req.json().catch(() => ({}));
    if (!token || typeof token !== "string" || token.length < 32) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token_hash = await sha256(token);

    const inviteResp = await fetch(
      `${SUPABASE_URL}/rest/v1/portal_invites?token_hash=eq.${token_hash}&select=*`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const invites = await inviteResp.json();
    const invite = Array.isArray(invites) ? invites[0] : null;
    if (!invite) {
      return new Response(JSON.stringify({ error: "Invite not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (invite.accepted_at) {
      return new Response(JSON.stringify({ error: "Invite already used" }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Invite expired" }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Upsert portal_users binding (user can only ever bind to one deal at a time;
    // re-running on a different invite will overwrite — that's a feature for
    // borrowers refinancing or having multiple deals later).
    const upsert = await fetch(`${SUPABASE_URL}/rest/v1/portal_users`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        user_id: user.id,
        deal_id: invite.deal_id,
        lead_id: invite.lead_id,
        contact_id: invite.contact_id,
        invite_id: invite.id,
      }),
    });
    if (!upsert.ok) {
      const err = await upsert.text();
      return new Response(JSON.stringify({ error: "Could not bind portal user", detail: err }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await fetch(`${SUPABASE_URL}/rest/v1/portal_invites?id=eq.${invite.id}`, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accepted_at: new Date().toISOString(), accepted_by: user.id }),
    });

    return new Response(JSON.stringify({ success: true, deal_id: invite.deal_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("portal-invite-accept error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});