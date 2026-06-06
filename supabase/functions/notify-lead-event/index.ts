const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-notify-secret",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const NOTIFY_TO = "avantifundings@gmail.com";
const FROM = "NexGen Capital <onboarding@resend.dev>";

const escapeHtml = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const fmtMoney = (n: unknown): string => {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Shared-secret authentication — this function is internal-only.
    const NOTIFY_INGEST_SECRET = Deno.env.get("NOTIFY_INGEST_SECRET");
    if (!NOTIFY_INGEST_SECRET) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const provided =
      req.headers.get("x-notify-secret") ||
      (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (provided !== NOTIFY_INGEST_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      throw new Error("Email credentials are not configured");
    }

    const payload = await req.json();
    const event = String(payload.event || "created");
    const fullName = `${payload.first_name ?? ""} ${payload.last_name ?? ""}`.trim() || "(no name)";
    const email = payload.email || "—";
    const phone = payload.phone || "—";
    const loanPurpose = payload.loan_purpose || "—";
    const propertyValue = payload.property_value;
    const leadScore = payload.lead_score ?? 0;
    const source = payload.source || "—";
    const leadId = payload.lead_id || payload.id || "—";
    const notes = payload.notes || "";

    let subject: string;
    let banner: string;
    let intro: string;

    if (event === "status_change") {
      const oldS = payload.old_status || "—";
      const newS = payload.new_status || "—";
      subject = `[Lead Update] ${fullName} → ${newS}`;
      banner = "Lead Status Changed";
      intro = `<p style="margin:0 0 16px;color:#334155;">A lead has progressed in the pipeline: <strong>${escapeHtml(oldS)}</strong> → <strong style="color:#f97316;">${escapeHtml(newS)}</strong></p>`;
    } else {
      subject = `[New Lead] ${fullName} — ${loanPurpose}`;
      banner = "New Lead Captured";
      intro = `<p style="margin:0 0 16px;color:#334155;">A new lead just came in via <strong>${escapeHtml(source)}</strong>.</p>`;
    }

    const notesBlock = notes
      ? `<div style="margin-top:16px;padding:14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
           <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;">Notes</p>
           <pre style="margin:0;font-family:inherit;font-size:13px;color:#1e293b;white-space:pre-wrap;word-wrap:break-word;">${escapeHtml(notes)}</pre>
         </div>`
      : "";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;background:#ffffff;">
        <div style="border-left:4px solid #f97316;padding-left:14px;margin-bottom:20px;">
          <h2 style="margin:0;color:#0f172a;font-size:20px;">${escapeHtml(banner)}</h2>
        </div>
        ${intro}
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:6px 0;color:#64748b;width:140px;">Name</td><td style="padding:6px 0;color:#0f172a;font-weight:600;">${escapeHtml(fullName)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Email</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#f97316;">${escapeHtml(email)}</a></td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Phone</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(phone)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Loan Purpose</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(loanPurpose)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Property Value</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(fmtMoney(propertyValue))}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Lead Score</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(leadScore)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Source</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(source)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Lead ID</td><td style="padding:6px 0;color:#94a3b8;font-family:monospace;font-size:12px;">${escapeHtml(leadId)}</td></tr>
        </table>
        ${notesBlock}
        <p style="margin:24px 0 0;font-size:11px;color:#94a3b8;">NexGen Capital CRM · Automated notification</p>
      </div>
    `;

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: FROM,
        to: [NOTIFY_TO],
        reply_to: typeof email === "string" && email.includes("@") ? email : undefined,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[NOTIFY-LEAD-EVENT] Resend error:", errText);
      return new Response(JSON.stringify({ error: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    console.log("[NOTIFY-LEAD-EVENT]", event, "sent:", data.id);
    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[NOTIFY-LEAD-EVENT] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});