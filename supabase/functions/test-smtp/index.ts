import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: claims } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
  if (!claims?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const userEmail = (claims.claims as any).email as string | undefined;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body = await req.json().catch(() => ({}));
  const { host, port = 587, username, password, from_email, from_name = "NGCapital Mortgage", to } = body || {};

  let cfg: any;
  if (host && username && password) {
    cfg = { host, port, username, password, from_email: from_email || username, from_name };
  } else {
    const { data: prov } = await admin.from("email_providers").select("*").eq("is_active", true).maybeSingle();
    if (!prov) {
      return new Response(JSON.stringify({ error: "No provider configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    cfg = prov;
  }

  const recipient = to || userEmail;
  if (!recipient) {
    return new Response(JSON.stringify({ error: "No recipient" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host, port: cfg.port, secure: cfg.port === 465,
    auth: { user: cfg.username, pass: cfg.password },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${cfg.from_name}" <${cfg.from_email}>`,
      to: recipient,
      subject: "NGCapital SMTP test",
      text: "If you can read this, your Titan SMTP connection works correctly.",
      html: "<p>If you can read this, your <strong>Titan SMTP</strong> connection works correctly.</p>",
    });
    return new Response(JSON.stringify({ ok: true, message_id: info.messageId, recipient }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "SMTP test failed", detail: e?.message ?? String(e) }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});