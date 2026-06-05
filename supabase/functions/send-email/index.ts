import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trigger-source",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function renderMerge(s: string, vars: Record<string, string>) {
  return (s || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => vars[k] ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any;
  try { body = await req.json(); } catch { 
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { to, subject: subjectIn, html: htmlIn, text: textIn, template_alias, vars = {}, lead_id, opportunity_id } = body || {};

  if (!to || typeof to !== "string") {
    return new Response(JSON.stringify({ error: "Missing 'to'" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Resolve template
  let subject = subjectIn || "";
  let html = htmlIn || "";
  let text = textIn || "";
  let template_id: string | null = null;

  if (template_alias) {
    const { data: tpl } = await supabase
      .from("email_templates")
      .select("id, subject, html_content, text_content")
      .eq("alias", template_alias)
      .maybeSingle();
    if (!tpl) {
      return new Response(JSON.stringify({ error: `Template '${template_alias}' not found` }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    template_id = tpl.id;
    subject = renderMerge(tpl.subject, vars);
    html = renderMerge(tpl.html_content, vars);
    text = renderMerge(tpl.text_content, vars);
  } else {
    subject = renderMerge(subject, vars);
    html = renderMerge(html, vars);
    text = renderMerge(text, vars);
  }

  // Load active provider
  const { data: provider, error: provErr } = await supabase
    .from("email_providers")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (provErr || !provider) {
    await supabase.from("email_logs").insert({
      recipient_email: to, subject, template_id, template_alias: template_alias ?? null,
      lead_id: lead_id ?? null, opportunity_id: opportunity_id ?? null,
      status: "failed", error_message: "No active email provider configured",
    });
    return new Response(JSON.stringify({ error: "No active email provider configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const transporter = nodemailer.createTransport({
    host: provider.host,
    port: provider.port,
    secure: provider.port === 465,
    auth: { user: provider.username, pass: provider.password },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${provider.from_name}" <${provider.from_email}>`,
      to,
      subject,
      html: html || undefined,
      text: text || (html ? html.replace(/<[^>]+>/g, "") : undefined),
    });
    await supabase.from("email_logs").insert({
      recipient_email: to, subject, template_id, template_alias: template_alias ?? null,
      lead_id: lead_id ?? null, opportunity_id: opportunity_id ?? null,
      status: "sent", provider_message_id: info.messageId,
    });
    return new Response(JSON.stringify({ ok: true, message_id: info.messageId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    await supabase.from("email_logs").insert({
      recipient_email: to, subject, template_id, template_alias: template_alias ?? null,
      lead_id: lead_id ?? null, opportunity_id: opportunity_id ?? null,
      status: "failed", error_message: msg,
    });
    return new Response(JSON.stringify({ error: "Send failed", detail: msg }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});