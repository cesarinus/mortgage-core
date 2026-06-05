import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s\-()+ ]{7,20}$/;

const requireAuth = (req: Request): boolean => {
  const expected = Deno.env.get("CHAT_INGEST_SECRET");
  if (!expected) return false;
  const got = req.headers.get("authorization") || "";
  return got === `Bearer ${expected}`;
};

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

const normalizePhone = (p: string | null) => p ? p.replace(/\D/g, "") : null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!requireAuth(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const chat_session_id = sanitizeText(body.chat_session_id, 64);
    const first_name = sanitizeText(body.first_name, 100) || "Chat";
    const last_name  = sanitizeText(body.last_name,  100) || "Lead";

    if (!chat_session_id) {
      return new Response(JSON.stringify({ error: "chat_session_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let email: string | null = null;
    if (body.email) {
      const e = String(body.email).trim().toLowerCase().slice(0, 255);
      if (EMAIL_RE.test(e)) email = e;
    }
    let phone: string | null = null;
    if (body.phone) {
      const p = String(body.phone).trim().slice(0, 20);
      if (PHONE_RE.test(p)) phone = p;
    }

    const incoming = {
      first_name, last_name, email, phone,
      loan_purpose:    sanitizeText(body.loan_purpose),
      property_type:   sanitizeText(body.property_type),
      property_value:  sanitizeNumber(body.property_value),
      credit_range:    sanitizeText(body.credit_range, 50),
      employment_type: sanitizeText(body.employment_type, 50),
      annual_income:   sanitizeNumber(body.annual_income),
      timeline:        sanitizeText(body.timeline, 100),
      intent_tag:      sanitizeText(body.intent_tag, 50),
      notes:           sanitizeText(body.notes, 2000),
      chat_session_id,
    };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: src } = await supabase
      .from("lead_sources").select("id").eq("name", "AI Chat").maybeSingle();

    let existing: any = null;
    {
      const { data } = await supabase.from("leads").select("*")
        .eq("chat_session_id", chat_session_id).maybeSingle();
      existing = data;
    }
    if (!existing && email) {
      const { data } = await supabase.from("leads").select("*")
        .ilike("email", email).maybeSingle();
      existing = data;
    }
    if (!existing && phone) {
      const phoneDigits = normalizePhone(phone);
      const { data } = await supabase.from("leads").select("*").not("phone", "is", null);
      existing = (data || []).find((l: any) => normalizePhone(l.phone) === phoneDigits) || null;
    }

    let lead_id: string;
    let created_or_updated: "created" | "updated";

    if (existing) {
      const update: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(incoming)) {
        if (v == null) continue;
        const cur = existing[k];
        if (cur == null || cur === "") update[k] = v;
      }
      if (Object.keys(update).length) {
        await supabase.from("leads").update(update).eq("id", existing.id);
      }
      lead_id = existing.id;
      created_or_updated = "updated";
    } else {
      const { data: inserted, error: insErr } = await supabase.from("leads").insert({
        ...incoming,
        status: "new_lead",
        source_id: src?.id ?? null,
        lead_score: 0,
      }).select("id").single();
      if (insErr) {
        console.error("insert error", insErr);
        return new Response(JSON.stringify({ error: "Insert failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      lead_id = inserted.id;
      created_or_updated = "created";
    }

    const { data: existingSession } = await supabase.from("chat_sessions")
      .select("id, messages_count").eq("session_id", chat_session_id).maybeSingle();

    if (existingSession) {
      await supabase.from("chat_sessions").update({
        lead_id,
        last_message_at: new Date().toISOString(),
        messages_count: (existingSession.messages_count || 0) + 1,
      }).eq("id", existingSession.id);
    } else {
      await supabase.from("chat_sessions").insert({
        session_id: chat_session_id,
        lead_id,
        messages_count: 1,
      });
    }

    return new Response(JSON.stringify({
      lead_id, created_or_updated, session_id: chat_session_id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("chat-lead-upsert error", err);
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});