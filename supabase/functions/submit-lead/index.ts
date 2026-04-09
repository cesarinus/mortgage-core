import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s\-()+ ]{7,20}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const first_name = typeof body.first_name === "string" ? body.first_name.trim().slice(0, 100) : "";
    const last_name = typeof body.last_name === "string" ? body.last_name.trim().slice(0, 100) : "";

    if (!first_name || !last_name) {
      return new Response(JSON.stringify({ error: "First and last name are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let email: string | null = null;
    if (body.email) {
      const e = String(body.email).trim().slice(0, 255);
      if (!EMAIL_RE.test(e)) {
        return new Response(JSON.stringify({ error: "Invalid email address." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      email = e;
    }

    let phone: string | null = null;
    if (body.phone) {
      const p = String(body.phone).trim().slice(0, 20);
      if (!PHONE_RE.test(p)) {
        return new Response(JSON.stringify({ error: "Invalid phone number." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      phone = p;
    }

    const sanitizeText = (v: unknown, maxLen = 255): string | null => {
      if (v == null || v === "") return null;
      return String(v).trim().slice(0, maxLen);
    };

    const sanitizeNumber = (v: unknown, min = 0, max = 100_000_000): number | null => {
      if (v == null || v === "") return null;
      const n = Number(v);
      if (isNaN(n) || n < min || n > max) return null;
      return n;
    };

    const loan_purpose = sanitizeText(body.loan_purpose);
    const property_type = sanitizeText(body.property_type);
    const property_value = sanitizeNumber(body.property_value);
    const credit_range = sanitizeText(body.credit_range, 50);
    const employment_type = sanitizeText(body.employment_type, 50);
    const annual_income = sanitizeNumber(body.annual_income);
    const timeline = sanitizeText(body.timeline, 100);
    const notes = sanitizeText(body.notes, 2000);
    const source = sanitizeText(body.source, 50) || "website";
    const lead_score = sanitizeNumber(body.lead_score, 0, 10000) || 0;
    const blog_session_id = sanitizeText(body.blog_session_id, 64);
    let variant_shown: Record<string, unknown> | null = null;
    if (body.variant_shown && typeof body.variant_shown === "object") {
      variant_shown = {
        cta_position: sanitizeText(body.variant_shown.cta_position, 20),
        cta_text: sanitizeText(body.variant_shown.cta_text, 100),
        sidebar_module: sanitizeText(body.variant_shown.sidebar_module, 50),
      };
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();
    const windowMs = 60_000;
    const maxPerWindow = 5;
    
    if (!globalThis.__rateLimitMap) {
      globalThis.__rateLimitMap = new Map<string, number[]>();
    }
    const hits = globalThis.__rateLimitMap.get(ip) || [];
    const recent = hits.filter((t: number) => now - t < windowMs);
    if (recent.length >= maxPerWindow) {
      return new Response(JSON.stringify({ error: "Too many submissions. Please wait a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    recent.push(now);
    globalThis.__rateLimitMap.set(ip, recent);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: leadData, error } = await supabase.from("leads").insert({
      first_name,
      last_name,
      email,
      phone,
      loan_purpose,
      property_type,
      property_value,
      credit_range,
      employment_type,
      annual_income,
      timeline,
      notes,
      source,
      lead_score,
      variant_shown,
      status: "new",
    }).select("id").single();

    if (error) {
      console.error("DB insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to submit. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Link blog session to lead if session_id provided
    if (blog_session_id && leadData?.id) {
      await supabase
        .from("blog_sessions")
        .update({ lead_id: leadData.id })
        .eq("session_id", blog_session_id);
    }

    if (error) {
      console.error("DB insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to submit. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Invalid request." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
