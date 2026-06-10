import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_REVIEW_LINK =
  "https://www.google.com/search?q=NexGen+Capital+Corp+Naples+FL#lrd=0x0:0x0,3";
const SENDER_NAME = "NexGen Capital Corp";
const SENDER_ADDRESS = "Naples, FL · NMLS #2025932";
const UNSUBSCRIBE_MAILTO = "mailto:unsubscribe@ngcapital.net?subject=Unsubscribe";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function renderMerge(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => vars[k] ?? "");
}

function appendComplianceFooter(html: string, text: string, unsubLink: string) {
  const footerHtml =
    `<hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>` +
    `<p style="font-size:12px;color:#6b7280;line-height:1.5">` +
    `${SENDER_NAME} · ${SENDER_ADDRESS}<br/>` +
    `You're receiving this because we recently worked together on your mortgage. ` +
    `<a href="${unsubLink}" style="color:#6b7280;text-decoration:underline">Unsubscribe</a>` +
    `</p>`;
  const footerText =
    `\n\n---\n${SENDER_NAME} · ${SENDER_ADDRESS}\n` +
    `You're receiving this because we recently worked together on your mortgage.\n` +
    `Unsubscribe: ${unsubLink}\n`;
  const safeHtml = html?.includes("unsubscribe") ? html : `${html}${footerHtml}`;
  const safeText = text?.toLowerCase().includes("unsubscribe") ? text : `${text}${footerText}`;
  return { html: safeHtml, text: safeText };
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
    const reviewLink = String(body.google_review_link || DEFAULT_REVIEW_LINK).slice(0, 500);
    const templateAlias = String(body.template_alias || "google-review-request");
    const isTest = Boolean(body.test);
    const opportunityId =
      typeof body.opportunity_id === "string" ? body.opportunity_id : null;
    const dealId = typeof body.deal_id === "string" ? body.deal_id : null;
    let leadId = typeof body.lead_id === "string" ? body.lead_id : null;
    const subscriberId = typeof body.subscriber_id === "string" ? body.subscriber_id : null;

    // --- Resolve recipients ------------------------------------------------
    type R = { email: string; first_name: string; last_name: string; contact_id?: string | null };
    const recipients: R[] = [];

    if (opportunityId) {
      const { data: opp, error: oppErr } = await admin
        .from("pipeline_opportunities")
        .select("id, lead_id, stage")
        .eq("id", opportunityId)
        .maybeSingle();
      if (oppErr || !opp) return json({ error: "Opportunity not found" }, 404);
      if (opp.stage !== "closed" && !isTest) {
        return json({ error: "Only closed opportunities can request reviews" }, 400);
      }
      leadId = opp.lead_id;
    }

    if (leadId) {
      // Borrower (lead) themselves
      const { data: lead } = await admin
        .from("leads")
        .select("first_name, last_name, email")
        .eq("id", leadId)
        .maybeSingle();
      if (lead?.email && EMAIL_RE.test(lead.email)) {
        recipients.push({
          email: lead.email.toLowerCase().trim(),
          first_name: lead.first_name || "there",
          last_name: lead.last_name || "",
          contact_id: null,
        });
      }
      // Linked contacts on this lead
      const { data: lcs } = await admin
        .from("lead_contacts")
        .select("contact_id, contacts:contact_id(first_name,last_name,email)")
        .eq("lead_id", leadId);
      for (const lc of lcs ?? []) {
        const c: any = (lc as any).contacts;
        if (c?.email && EMAIL_RE.test(c.email)) {
          recipients.push({
            email: c.email.toLowerCase().trim(),
            first_name: c.first_name || "there",
            last_name: c.last_name || "",
            contact_id: (lc as any).contact_id ?? null,
          });
        }
      }
    } else if (dealId) {
      const { data: deal } = await admin
        .from("deals")
        .select("id, contact_id, stage, contacts:contact_id(first_name,last_name,email)")
        .eq("id", dealId)
        .maybeSingle();
      if (!deal) return json({ error: "Deal not found" }, 404);
      const c: any = (deal as any).contacts;
      if (c?.email && EMAIL_RE.test(c.email)) {
        recipients.push({
          email: c.email.toLowerCase().trim(),
          first_name: c.first_name || "there",
          last_name: c.last_name || "",
          contact_id: deal.contact_id,
        });
      }
    } else {
      // Single-recipient legacy mode
      const to = String(body.email || "").trim().slice(0, 255).toLowerCase();
      if (!EMAIL_RE.test(to)) return json({ error: "Valid recipient email required" }, 400);
      recipients.push({
        email: to,
        first_name: String(body.first_name || "").trim().slice(0, 80) || "there",
        last_name: String(body.last_name || "").trim().slice(0, 80),
      });
    }

    // De-duplicate by email
    const dedup = new Map<string, R>();
    for (const r of recipients) if (!dedup.has(r.email)) dedup.set(r.email, r);
    if (dedup.size === 0) return json({ error: "No valid recipients found" }, 400);

    // Suppression: skip unsubscribed/bounced subscribers
    const emails = Array.from(dedup.keys());
    const { data: subs } = await admin
      .from("subscribers")
      .select("email,status")
      .in("email", emails);
    const suppressed = new Set(
      (subs ?? []).filter((s: any) => s.status !== "subscribed").map((s: any) => s.email),
    );

    const { data: tpl, error: tplErr } = await admin
      .from("email_templates")
      .select("id, subject, html_content, text_content, alias")
      .eq("alias", templateAlias)
      .maybeSingle();
    if (tplErr || !tpl) return json({ error: "Template not found" }, 404);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) return json({ error: "Email not configured" }, 500);

    const results: Array<{ email: string; status: string; message_id?: string | null; error?: string }> = [];

    for (const r of dedup.values()) {
      if (suppressed.has(r.email)) {
        results.push({ email: r.email, status: "suppressed" });
        await admin.from("email_logs").insert({
          subscriber_id: subscriberId,
          lead_id: leadId,
          template_id: tpl.id,
          template_alias: tpl.alias,
          recipient_email: r.email,
          subject: tpl.subject,
          status: "suppressed",
          metadata: { reason: "unsubscribed_or_bounced", sent_by: claims.claims.sub },
        });
        continue;
      }

      const vars = {
        first_name: r.first_name,
        last_name: r.last_name,
        full_name: `${r.first_name} ${r.last_name}`.trim(),
        google_review_link: reviewLink,
        email: r.email,
        sender_name: SENDER_NAME,
        sender_address: SENDER_ADDRESS,
        unsubscribe_link: UNSUBSCRIBE_MAILTO,
      };
      const subject = renderMerge(tpl.subject || "A quick favor", vars);
      const rawHtml = renderMerge(tpl.html_content || "", vars);
      const rawText = renderMerge(tpl.text_content || "", vars);
      const { html, text } = appendComplianceFooter(rawHtml, rawText, UNSUBSCRIBE_MAILTO);

      const res = await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: "NexGen Capital <onboarding@resend.dev>",
          to: [r.email],
          subject: isTest ? `[TEST] ${subject}` : subject,
          html,
          text,
          headers: {
            "List-Unsubscribe": `<${UNSUBSCRIBE_MAILTO}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
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
        recipient_email: r.email,
        subject,
        status: res.ok ? "sent" : "failed",
        provider_message_id: providerId,
        error_message: res.ok ? null : respText.slice(0, 500),
        metadata: {
          test: isTest,
          sent_by: claims.claims.sub,
          opportunity_id: opportunityId,
          contact_id: r.contact_id ?? null,
        },
      });

      results.push({
        email: r.email,
        status: res.ok ? "sent" : "failed",
        message_id: providerId,
        error: res.ok ? undefined : respText.slice(0, 200),
      });
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const skipped = results.filter((r) => r.status === "suppressed").length;
    return json({ success: failed === 0, sent, failed, suppressed: skipped, results });
  } catch (e) {
    console.error("[send-review-request]", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});