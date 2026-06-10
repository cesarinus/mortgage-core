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

  const { to, subject: subjectIn, html: htmlIn, text: textIn, template_alias, vars = {}, lead_id, opportunity_id, audience } = body || {};

  // Templates that must ONLY ever go to the borrower(s) on the deal.
  // The lead record is the primary borrower; co-borrowers are linked through
  // lead_contacts / contacts.lead_id with a borrower role or contact_type.
  const BORROWER_ONLY_TEMPLATES = new Set([
    "welcome-email",
    "document-reminder",
    "list-of-documents",
  ]);

  const BORROWER_ROLES = new Set(["primary_borrower", "co_borrower", "borrower"]);
  const NON_BORROWER_TYPES = new Set([
    "partner", "realtor", "attorney", "title", "escrow", "insurance",
    "appraiser", "inspector", "lender", "loan_officer", "processor",
    "referral", "vendor", "other",
  ]);

  async function resolveBorrowerEmails(leadIdArg: string): Promise<string[]> {
    const emails = new Set<string>();
    const { data: lead } = await supabase
      .from("leads")
      .select("email, co_borrower_id")
      .eq("id", leadIdArg)
      .maybeSingle();
    if (lead?.email) emails.add(String(lead.email).trim().toLowerCase());

    const contactIds = new Set<string>();
    const { data: links } = await supabase
      .from("lead_contacts")
      .select("contact_id, role, role_on_deal")
      .eq("lead_id", leadIdArg);
    for (const l of links ?? []) {
      const role = String(l.role_on_deal ?? l.role ?? "").toLowerCase();
      if (l.contact_id && (role === "" || BORROWER_ROLES.has(role))) {
        contactIds.add(l.contact_id);
      }
    }
    const { data: direct } = await supabase
      .from("contacts")
      .select("id")
      .eq("lead_id", leadIdArg)
      .eq("contact_type", "borrower");
    for (const c of direct ?? []) if (c.id) contactIds.add(c.id);
    if (lead?.co_borrower_id) contactIds.add(lead.co_borrower_id);

    if (contactIds.size > 0) {
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, email, contact_type")
        .in("id", Array.from(contactIds));
      for (const c of contacts ?? []) {
        const t = String(c.contact_type ?? "").toLowerCase();
        if (t && NON_BORROWER_TYPES.has(t)) continue;
        if (c.email) emails.add(String(c.email).trim().toLowerCase());
      }
    }
    return Array.from(emails).filter(Boolean);
  }

  // Build recipient list
  let recipients: string[] = [];
  const shouldRestrictToBorrowers =
    audience === "borrowers" ||
    (template_alias && BORROWER_ONLY_TEMPLATES.has(String(template_alias)));

  if (shouldRestrictToBorrowers && lead_id) {
    recipients = await resolveBorrowerEmails(String(lead_id));
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "No borrower recipients found for this lead" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } else if (to && typeof to === "string") {
    recipients = [to];
  } else {
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
    await supabase.from("email_logs").insert(recipients.map((r) => ({
      recipient_email: r, subject, template_id, template_alias: template_alias ?? null,
      lead_id: lead_id ?? null, opportunity_id: opportunity_id ?? null,
      status: "failed", error_message: "No active email provider configured",
    })));
    return new Response(JSON.stringify({ error: "No active email provider configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const transporter = nodemailer.createTransport({
    host: provider.host,
    port: provider.port,
    secure: provider.port === 465,
    auth: { user: provider.username, pass: provider.password },
  });

  const results: Array<{ to: string; ok: boolean; message_id?: string; error?: string }> = [];
  for (const rcpt of recipients) {
    try {
      const info = await transporter.sendMail({
        from: `"${provider.from_name}" <${provider.from_email}>`,
        to: rcpt,
        subject,
        html: html || undefined,
        text: text || (html ? html.replace(/<[^>]+>/g, "") : undefined),
      });
      await supabase.from("email_logs").insert({
        recipient_email: rcpt, subject, template_id, template_alias: template_alias ?? null,
        lead_id: lead_id ?? null, opportunity_id: opportunity_id ?? null,
        status: "sent", provider_message_id: info.messageId,
      });
      results.push({ to: rcpt, ok: true, message_id: info.messageId });
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      await supabase.from("email_logs").insert({
        recipient_email: rcpt, subject, template_id, template_alias: template_alias ?? null,
        lead_id: lead_id ?? null, opportunity_id: opportunity_id ?? null,
        status: "failed", error_message: msg,
      });
      results.push({ to: rcpt, ok: false, error: msg });
    }
  }
  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;
  return new Response(
    JSON.stringify({ ok: failed === 0, sent, failed, results }),
    { status: failed === 0 ? 200 : 207, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});