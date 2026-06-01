const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { to, subject, message, lead_id, pdf_base64, filename } = await req.json();
    if (!to || !pdf_base64) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      throw new Error("Email service not configured");
    }

    const html = `<div style="font-family:Arial,sans-serif;color:#0f1b3d;line-height:1.6">
      <p style="background:#fff7ed;padding:8px 12px;border-radius:6px;color:#9a3412;font-size:12px">
        Sandbox mode — intended recipient: <strong>${to}</strong>
      </p>
      ${(message ?? "").split("\n").map((l: string) => `<p>${l}</p>`).join("")}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="color:#888;font-size:12px">NexGen Capital — Informational only. Not a commitment to lend.</p>
    </div>`;

    const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "NexGen Capital <onboarding@resend.dev>",
        to: [to],
        bcc: ["avantifundings@gmail.com"],
        reply_to: "avantifundings@gmail.com",
        subject: subject ?? "Loan Scenario Comparison",
        html,
        attachments: [{ filename: filename ?? "Loan_Comparison.pdf", content: pdf_base64 }],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("Resend error", data);
      throw new Error(data?.message ?? "Email send failed");
    }

    // Log activity (best effort) — uses service role
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      if (lead_id) {
        await fetch(`${SUPABASE_URL}/rest/v1/crm_activities`, {
          method: "POST",
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            lead_id,
            activity_type: "email",
            title: subject ?? "Loan Scenario Comparison sent",
            body: `Sent loan comparison PDF to ${to}`,
          }),
        });
      }
    } catch (e) { console.warn("activity log failed", e); }

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-loan-comparison error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});