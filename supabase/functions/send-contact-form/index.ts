import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.3/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: "All fields are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic validation
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(String(email).trim())) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sanitized = {
      name: String(name).trim().slice(0, 100),
      email: String(email).trim().slice(0, 255),
      subject: String(subject).trim().slice(0, 200),
      message: String(message).trim().slice(0, 2000),
    };

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "NexGen Capital <onboarding@resend.dev>",
        to: ["hello@ngcapital.net"],
        reply_to: sanitized.email,
        subject: `[Contact Form] ${sanitized.subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #f97316; margin-bottom: 20px;">New Contact Form Submission</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; font-weight: bold; color: #334155;">Name:</td><td style="padding: 8px 0;">${sanitized.name}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #334155;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${sanitized.email}">${sanitized.email}</a></td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #334155;">Subject:</td><td style="padding: 8px 0;">${sanitized.subject}</td></tr>
            </table>
            <div style="margin-top: 20px; padding: 16px; background: #f8fafc; border-radius: 8px;">
              <p style="margin: 0; color: #334155; white-space: pre-wrap;">${sanitized.message}</p>
            </div>
            <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">Sent via NexGen Capital contact form</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[CONTACT-FORM] Resend error:", errorText);
      throw new Error(`Failed to send: ${errorText}`);
    }

    const result = await res.json();
    console.log("[CONTACT-FORM] Sent successfully:", result.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[CONTACT-FORM] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
