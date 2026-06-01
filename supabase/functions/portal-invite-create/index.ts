// Loan officer invites a borrower to the portal. Generates a token, stores its
// hash + deal binding in portal_invites, and emails the borrower the accept link.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

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
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Identify caller
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: ANON },
    });
    if (!userResp.ok) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const user = await userResp.json();

    const body = await req.json().catch(() => ({}));
    const { deal_id, email, lead_id, contact_id, app_origin } = body ?? {};
    if (!deal_id || !email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
      return new Response(JSON.stringify({ error: "deal_id and valid email required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify caller owns/admins the deal
    const dealResp = await fetch(`${SUPABASE_URL}/rest/v1/deals?id=eq.${deal_id}&select=id,loan_officer_id,created_by`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const deals = await dealResp.json();
    const deal = Array.isArray(deals) ? deals[0] : null;
    if (!deal) return new Response(JSON.stringify({ error: "Deal not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check admin role
    const roleResp = await fetch(`${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${user.id}&select=role`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const roles = await roleResp.json();
    const isAdmin = Array.isArray(roles) && roles.some((r: any) => r.role === "admin");
    const isOwner = deal.loan_officer_id === user.id || deal.created_by === user.id;
    if (!isAdmin && !isOwner) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = randomToken();
    const token_hash = await sha256(token);

    const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/portal_invites`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        deal_id, lead_id: lead_id ?? null, contact_id: contact_id ?? null,
        email: email.toLowerCase(), token_hash, created_by: user.id,
      }),
    });
    if (!insertResp.ok) {
      const err = await insertResp.text();
      return new Response(JSON.stringify({ error: "Could not create invite", detail: err }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const origin = (typeof app_origin === "string" && app_origin) || req.headers.get("origin") || "https://app.ngcapital.net";
    const acceptUrl = `${origin}/portal/accept?token=${token}`;

    // Send invite email via Resend (sandbox mode: still routed to verified inbox)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (LOVABLE_API_KEY && RESEND_API_KEY) {
      const html = `
        <div style="font-family:Arial,sans-serif;color:#0f1b3d;line-height:1.6">
          <p style="background:#fff7ed;padding:8px 12px;border-radius:6px;color:#9a3412;font-size:12px">
            Sandbox mode — intended recipient: <strong>${email}</strong>
          </p>
          <h2 style="color:#9a3412">You're invited to your NexGen Capital loan portal</h2>
          <p>Your loan officer has set up a secure portal where you can track your loan status, upload documents, review loan options, and message us directly.</p>
          <p><a href="${acceptUrl}" style="background:#ea580c;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">Activate your portal</a></p>
          <p style="color:#666;font-size:12px">Or paste this link in your browser:<br/>${acceptUrl}</p>
          <p style="color:#666;font-size:12px">This link expires in 14 days.</p>
        </div>`;
      await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: "NexGen Capital <onboarding@resend.dev>",
          to: ["avantifundings@gmail.com"],
          reply_to: email,
          subject: `Activate your NexGen Capital portal — for ${email}`,
          html,
        }),
      }).catch((e) => console.warn("invite email failed", e));
    }

    return new Response(JSON.stringify({ success: true, accept_url: acceptUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("portal-invite-create error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});