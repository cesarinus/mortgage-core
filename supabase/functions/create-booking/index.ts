import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

function fmt(date: Date, tz = "America/New_York") {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
    timeZoneName: "short",
  }).format(date);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      throw new Error("Email API keys not configured");
    }

    const body = await req.json();
    const { firstName, lastName, email, phone, loanType, meetingType, notes, startAt } = body ?? {};

    // Validation
    const errors: string[] = [];
    if (!firstName || String(firstName).trim().length < 1) errors.push("First name required");
    if (!lastName || String(lastName).trim().length < 1) errors.push("Last name required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? "").trim())) errors.push("Valid email required");
    if (!phone || String(phone).trim().length < 7) errors.push("Valid phone required");
    if (!startAt || isNaN(new Date(startAt).getTime())) errors.push("Valid start time required");
    if (!["call", "zoom"].includes(meetingType)) errors.push("Meeting type must be call or zoom");
    if (errors.length) {
      return new Response(JSON.stringify({ error: errors.join(", ") }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sanitized = {
      first_name: String(firstName).trim().slice(0, 80),
      last_name: String(lastName).trim().slice(0, 80),
      email: String(email).trim().slice(0, 255).toLowerCase(),
      phone: String(phone).trim().slice(0, 30),
      loan_type: loanType ? String(loanType).trim().slice(0, 60) : null,
      meeting_type: meetingType as "call" | "zoom",
      notes: notes ? String(notes).trim().slice(0, 1000) : null,
    };

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Load settings for slot length + notify email
    const { data: settings } = await supabase
      .from("booking_settings")
      .select("slot_minutes, notify_email, timezone")
      .limit(1)
      .maybeSingle();

    const slotMinutes = settings?.slot_minutes ?? 30;
    const notifyEmail = settings?.notify_email ?? "CMartinez@NGCapital.net";
    const tz = settings?.timezone ?? "America/New_York";

    const start = new Date(startAt);
    const end = new Date(start.getTime() + slotMinutes * 60_000);

    // Re-check availability (race-safe via unique index, but verify first for friendlier error)
    const dateISO = start.toISOString().slice(0, 10);
    const { data: slots } = await supabase.rpc("get_available_slots", { p_date: dateISO });
    const startMs = start.getTime();
    const isAvail = (slots ?? []).some((s: any) => {
      const v = typeof s === "string" ? s : (s.get_available_slots ?? s);
      return new Date(v).getTime() === startMs;
    });
    if (!isAvail) {
      return new Response(JSON.stringify({ error: "That time slot is no longer available. Please choose another." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find or create lead
    const { data: existingLead } = await supabase.from("leads").select("id").eq("email", sanitized.email).maybeSingle();

    let leadId: string | null = existingLead?.id ?? null;

    const { data: bookingSource } = await supabase
      .from("lead_sources")
      .select("id")
      .eq("name", "Booking")
      .maybeSingle();

    if (!leadId) {
      const { data: newLead, error: leadErr } = await supabase
        .from("leads")
        .insert({
          first_name: sanitized.first_name,
          last_name: sanitized.last_name,
          email: sanitized.email,
          phone: sanitized.phone,
          loan_purpose: sanitized.loan_type,
          source: "Booking",
          source_id: bookingSource?.id ?? null,
          intent_tag: "meeting_booked",
          lead_score: 30,
          status: "new_lead",
        })
        .select("id")
        .single();
      if (leadErr) console.error("[create-booking] lead insert error:", leadErr);
      leadId = newLead?.id ?? null;
    }

    // Insert booking
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        lead_id: leadId,
        first_name: sanitized.first_name,
        last_name: sanitized.last_name,
        email: sanitized.email,
        phone: sanitized.phone,
        loan_type: sanitized.loan_type,
        meeting_type: sanitized.meeting_type,
        notes: sanitized.notes,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: "confirmed",
      })
      .select("id")
      .single();

    if (bookingErr) {
      console.error("[create-booking] booking insert error:", bookingErr);
      const msg = bookingErr.message?.includes("bookings_unique_confirmed_start")
        ? "That time slot was just booked. Please pick another."
        : "Could not save booking";
      return new Response(JSON.stringify({ error: msg }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log lead event
    if (leadId) {
      await supabase.from("lead_events").insert({
        lead_id: leadId,
        event_type: "meeting_booked",
        points: 30,
        metadata: { booking_id: booking.id, meeting_type: sanitized.meeting_type },
      });
    }

    const whenLong = fmt(start, tz);
    const meetingLabel = sanitized.meeting_type === "zoom" ? "Zoom Video Call" : "Phone Call";
    const meetingNote =
      sanitized.meeting_type === "zoom"
        ? "We'll email you a Zoom link before the meeting."
        : "We'll call you at the phone number you provided.";

    // Prospect email
    const prospectHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f97316; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Your meeting is confirmed</h1>
        </div>
        <div style="padding: 28px 24px; background: white;">
          <p style="font-size: 16px; color: #334155;">Hi ${sanitized.first_name},</p>
          <p style="color: #334155; line-height: 1.6;">Thanks for scheduling time with NexGen Capital. Here are the details:</p>
          <div style="margin: 20px 0; padding: 18px; background: #fff7ed; border-left: 4px solid #f97316; border-radius: 6px;">
            <p style="margin: 0 0 8px; font-weight: bold; color: #9a3412; font-size: 16px;">${whenLong}</p>
            <p style="margin: 0; color: #57534e;">Meeting type: ${meetingLabel}</p>
          </div>
          <p style="color: #334155; line-height: 1.6;">${meetingNote}</p>
          <p style="color: #334155; line-height: 1.6;">If you need to reschedule or have questions before our meeting, just reply to this email.</p>
          <p style="margin-top: 28px; color: #334155;">Talk soon,<br/><strong>Cesar A Martinez</strong><br/>NexGen Capital</p>
        </div>
        <div style="padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
          NexGen Capital · NMLS #1766649 · Naples, FL
        </div>
      </div>
    `;

    const internalHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f97316;">New booking — ${sanitized.first_name} ${sanitized.last_name}</h2>
        <p style="font-weight: bold; color: #334155; font-size: 16px;">${whenLong}</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 8px 0; font-weight: bold; color: #334155;">Email:</td><td><a href="mailto:${sanitized.email}">${sanitized.email}</a></td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold; color: #334155;">Phone:</td><td><a href="tel:${sanitized.phone}">${sanitized.phone}</a></td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold; color: #334155;">Loan type:</td><td>${sanitized.loan_type ?? "—"}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold; color: #334155;">Meeting type:</td><td>${meetingLabel}</td></tr>
        </table>
        ${sanitized.notes ? `<div style="margin-top: 16px; padding: 14px; background: #f8fafc; border-radius: 6px;"><strong>Notes:</strong><p style="margin: 6px 0 0; white-space: pre-wrap; color: #334155;">${sanitized.notes}</p></div>` : ""}
        <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">Booking ID: ${booking.id}</p>
      </div>
    `;

    // Send both emails (don't fail booking if email fails)
    const sendEmail = async (to: string, subject: string, html: string, replyTo?: string) => {
      try {
        const r = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: "NexGen Capital <onboarding@resend.dev>",
            to: [to],
            subject,
            html,
            ...(replyTo ? { reply_to: replyTo } : {}),
          }),
        });
        if (!r.ok) console.error("[create-booking] email error:", await r.text());
      } catch (e) {
        console.error("[create-booking] email exception:", e);
      }
    };

    await Promise.all([
      sendEmail(sanitized.email, `Your NexGen Capital meeting — ${whenLong}`, prospectHtml),
      sendEmail(
        notifyEmail,
        `New booking — ${sanitized.first_name} ${sanitized.last_name} — ${whenLong}`,
        internalHtml,
        sanitized.email,
      ),
    ]);

    return new Response(JSON.stringify({ success: true, bookingId: booking.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[create-booking] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
