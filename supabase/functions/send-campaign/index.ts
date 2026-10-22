import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const STAFF = ["admin", "loan_officer", "processor", "assistant"];
const UUID = /^[0-9a-f-]{36}$/i;
const merge = (s: string, v: Record<string, string>) =>
  (s || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => v[k] ?? "");

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const FN_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-campaign`;

async function buildRecipients(campaignId: string, role: string) {
  const { data: roles } = await supabase.from("person_roles").select("person_id").eq("role_type", role);
  const ids = [...new Set((roles ?? []).map((r: any) => r.person_id))];
  if (!ids.length) return 0;
  const people: any[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await supabase.from("people").select("id, email, first_name").in("id", ids.slice(i, i + 200));
    people.push(...(data ?? []));
  }
  const { data: unsubs } = await supabase.from("email_unsubscribes").select("email");
  const blocked = new Set((unsubs ?? []).map((u: any) => u.email));
  const seen = new Set<string>();
  const rows = people
    .filter((p) => p.email)
    .map((p) => ({ ...p, email: String(p.email).trim().toLowerCase() }))
    .filter((p) => !blocked.has(p.email) && !seen.has(p.email) && seen.add(p.email))
    .map((p) => ({ campaign_id: campaignId, person_id: p.id, email: p.email, first_name: p.first_name }));
  if (rows.length) await supabase.from("email_campaign_recipients").upsert(rows, { onConflict: "campaign_id,email", ignoreDuplicates: true });
  return rows.length;
}

async function sendCampaign(id: string) {
  const { data: c } = await supabase.from("email_campaigns").select("*").eq("id", id).maybeSingle();
  if (!c) throw new Error("Campaign not found");
  if (c.status === "sending" || c.status === "sent") throw new Error(`Campaign already ${c.status}`);
  const { data: tpl } = await supabase.from("email_templates").select("*").eq("id", c.template_id).maybeSingle();
  if (!tpl) throw new Error("Campaign has no template");
  const { data: provider } = await supabase.from("email_providers").select("*").eq("is_active", true)
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!provider) throw new Error("No active email provider configured");

  await supabase.from("email_campaigns").update({ status: "sending", started_at: new Date().toISOString() }).eq("id", id);
  await buildRecipients(id, c.audience_role);

  const { data: unsubs } = await supabase.from("email_unsubscribes").select("email");
  const blocked = new Set((unsubs ?? []).map((u: any) => u.email));
  const { data: recips } = await supabase.from("email_campaign_recipients").select("*").eq("campaign_id", id).eq("status", "pending");

  const transporter = nodemailer.createTransport({
    host: provider.host, port: provider.port, secure: provider.port === 465,
    auth: { user: provider.username, pass: provider.password },
  });

  let sent = 0, failed = 0;
  for (const r of recips ?? []) {
    if (blocked.has(r.email)) {
      await supabase.from("email_campaign_recipients").update({ status: "skipped", error_message: "Unsubscribed" }).eq("id", r.id);
      continue;
    }
    const vars = { first_name: r.first_name || "there", email: r.email };
    const unsub = `${FN_URL}?unsubscribe=${r.id}`;
    const subject = merge(c.subject || tpl.subject, vars);
    const html = merge(tpl.html_content, vars) +
      `<p style="font-size:12px;color:#888;margin-top:24px">Don't want these emails? <a href="${unsub}">Unsubscribe</a></p>`;
    try {
      const info = await transporter.sendMail({
        from: `"${provider.from_name}" <${provider.from_email}>`, to: r.email, subject, html,
        text: html.replace(/<[^>]+>/g, ""),
        headers: { "List-Unsubscribe": `<${unsub}>` },
      });
      await supabase.from("email_campaign_recipients").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", r.id);
      await supabase.from("email_logs").insert({
        recipient_email: r.email, subject, template_id: tpl.id, template_alias: tpl.alias,
        status: "sent", provider_message_id: info.messageId, metadata: { campaign_id: id },
      });
      sent++;
    } catch (e: any) {
      await supabase.from("email_campaign_recipients").update({ status: "failed", error_message: e?.message ?? String(e) }).eq("id", r.id);
      failed++;
    }
  }
  const { count: total } = await supabase.from("email_campaign_recipients").select("id", { count: "exact", head: true }).eq("campaign_id", id);
  const { count: sentAll } = await supabase.from("email_campaign_recipients").select("id", { count: "exact", head: true }).eq("campaign_id", id).eq("status", "sent");
  const { count: failAll } = await supabase.from("email_campaign_recipients").select("id", { count: "exact", head: true }).eq("campaign_id", id).eq("status", "failed");
  await supabase.from("email_campaigns").update({
    status: "sent", completed_at: new Date().toISOString(),
    total_recipients: total ?? 0, sent_count: sentAll ?? 0, failed_count: failAll ?? 0,
  }).eq("id", id);
  return { sent, failed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);

  // Public unsubscribe link
  const unsubId = url.searchParams.get("unsubscribe");
  if (req.method === "GET" && unsubId) {
    if (!UUID.test(unsubId)) return new Response("Invalid link", { status: 400 });
    const { data: r } = await supabase.from("email_campaign_recipients").select("email, campaign_id").eq("id", unsubId).maybeSingle();
    if (r) await supabase.from("email_unsubscribes").upsert({ email: r.email, campaign_id: r.campaign_id });
    return new Response(
      `<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>You've been unsubscribed</h2><p>You will no longer receive marketing emails from NG Capital.</p></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  let body: any = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  // Scheduler: send campaigns whose time has come
  if (body.action === "run_due") {
    const { data: due } = await supabase.from("email_campaigns").select("id")
      .eq("status", "scheduled").lte("scheduled_at", new Date().toISOString());
    const out = [];
    for (const d of due ?? []) {
      try { out.push({ id: d.id, ...(await sendCampaign(d.id)) }); }
      catch (e: any) { out.push({ id: d.id, error: e.message }); }
    }
    return json({ ok: true, processed: out });
  }

  // Staff-only actions
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const { data: u } = await supabase.auth.getUser(token);
  if (!u?.user) return json({ error: "Unauthorized" }, 401);
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
  if (!(roles ?? []).some((r: any) => STAFF.includes(r.role))) return json({ error: "Forbidden" }, 403);

  const id = String(body.campaign_id ?? "");
  if (!UUID.test(id)) return json({ error: "campaign_id required" }, 400);

  try {
    if (body.action === "preview_audience") {
      const { data: c } = await supabase.from("email_campaigns").select("audience_role").eq("id", id).maybeSingle();
      if (!c) return json({ error: "Campaign not found" }, 404);
      const n = await buildRecipients(id, c.audience_role);
      await supabase.from("email_campaigns").update({ total_recipients: n }).eq("id", id);
      return json({ ok: true, recipients: n });
    }
    if (body.action === "send_test") {
      const to = String(body.to ?? "");
      if (!/^\S+@\S+\.\S+$/.test(to)) return json({ error: "Valid test email required" }, 400);
      const { data: c } = await supabase.from("email_campaigns").select("*").eq("id", id).maybeSingle();
      const { data: tpl } = await supabase.from("email_templates").select("*").eq("id", c?.template_id).maybeSingle();
      const { data: p } = await supabase.from("email_providers").select("*").eq("is_active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (!c || !tpl || !p) return json({ error: "Campaign, template, or email provider missing" }, 400);
      const t = nodemailer.createTransport({ host: p.host, port: p.port, secure: p.port === 465, auth: { user: p.username, pass: p.password } });
      const vars = { first_name: "Test", email: to };
      await t.sendMail({ from: `"${p.from_name}" <${p.from_email}>`, to, subject: "[TEST] " + merge(c.subject || tpl.subject, vars), html: merge(tpl.html_content, vars) });
      return json({ ok: true });
    }
    // default: send now
    return json({ ok: true, ...(await sendCampaign(id)) });
  } catch (e: any) {
    await supabase.from("email_campaigns").update({ status: "failed" }).eq("id", id).eq("status", "sending");
    return json({ error: e.message }, 400);
  }
});
