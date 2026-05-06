import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_REVIEW_LINK =
  "https://www.google.com/search?q=NexGen+Capital+Corp+Naples+FL#lrd=0x0:0x0,3";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function renderMerge(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => vars[k] ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
    if (authErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.claims.sub)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const to = String(body.email || "").trim().slice(0, 255).toLowerCase();
    const firstName = String(body.first_name || "").trim().slice(0, 80) || "there";
    const lastName = String(body.last_name || "").trim().slice(0, 80);
    const reviewLink = String(body.google_review_link || DEFAULT_REVIEW_LINK).slice(0, 500);
    const templateAlias = String(body.template_alias || "google-review-request");
    const leadId = typeof body.lead_id === "string" ? body.lead_id : null;
    const subscriberId = typeof body.subscriber_id === "string" ? body.subscriber_id : null;
    const isTest = Boolean(body.test);

    if (!EMAIL_RE.test(to)) return json({ error: "Valid recipient email required" }, 400);

    const { data: tpl, error: tplErr } = await admin
      .from("email_templates")
      .select("id, subject, html_content, text_content, alias")
      .eq("alias", templateAlias)
      .maybeSingle();
    if (tplErr || !tpl) return json({ error: "Template not found" }, 404);

    const vars = {
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim(),
      google_review_link: reviewLink,
      email: to,
    };
    const subject = renderMerge(tpl.subject || "A quick favor", vars);
    const html = renderMerge(tpl.html_content || "", vars);
    const text = renderMerge(tpl.text_content || "", vars);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) return json({ error: "Email not configured" }, 500);

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "NexGen Capital <onboarding@resend.dev>",
        to: [to],
        subject: isTest ? `[TEST] ${subject}` : subject,
        html,
        text,
      }),
    });

    const respText = await res.text();
    let providerId: string | null = null;
    try { providerId = JSON.parse(respText)?.id ?? null; } catch { /* ignore */ }

    await admin.from("email_logs").insert({
      subscriber_id: subscriberId,
      lead_id: leadId,
      template_id: tpl.id,
      template_alias: tpl.alias,
      recipient_email: to,
      subject,
      status: res.ok ? "sent" : "failed",
      provider_message_id: providerId,
      error_message: res.ok ? null : respText.slice(0, 500),
      metadata: { test: isTest, sent_by: claims.claims.sub },
    });

    if (!res.ok) {
      console.error("[send-review-request] Resend error", respText);
      return json({ error: "Send failed", detail: respText }, 502);
    }

    return json({ success: true, message_id: providerId });
  } catch (e) {
    console.error("[send-review-request]", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});