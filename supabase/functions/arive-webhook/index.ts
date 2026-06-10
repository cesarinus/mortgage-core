import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-arive-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STAGE_MAP: Record<string, string> = {
  pre_approved: "application_sent",
  preapproved: "application_sent",
  application_sent: "application_sent",
  in_underwriting: "underwriting",
  underwriting: "underwriting",
  approved: "approved",
  ctc: "clear_to_close",
  clear_to_close: "clear_to_close",
  cleared_to_close: "clear_to_close",
  closed: "closed",
  funded: "closed",
  denied: "lost",
  declined: "lost",
  withdrawn: "lost",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = Deno.env.get("ARIVE_WEBHOOK_SECRET");
    const incoming = req.headers.get("x-arive-secret");
    if (!secret || incoming !== secret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      crm_reference_id,
      arive_loan_id,
      loan_status,
      purchase_price,
      loan_amount,
      interest_rate,
      loan_program,
      estimated_close_date,
      du_findings,
      conditions,
      property_address,
    } = body ?? {};

    if (!crm_reference_id) {
      return new Response(JSON.stringify({ error: "crm_reference_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Lookup lead
    const { data: lead, error: leadErr } = await supabase
      .from("leads").select("id").eq("id", crm_reference_id).maybeSingle();
    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found", crm_reference_id }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find primary opportunity
    let { data: opp } = await supabase
      .from("pipeline_opportunities")
      .select("id, stage, property_address")
      .eq("lead_id", lead.id)
      .maybeSingle();

    // Auto-create the pipeline opportunity on first Arive callback.
    // Conversion to Deal/Opportunity happens here (not on Qualified in the CRM),
    // and property_address is sourced from Arive.
    if (!opp) {
      const initialStage = (loan_status ? STAGE_MAP[String(loan_status).toLowerCase()] : null) || "application_sent";
      const { data: linked } = await supabase
        .from("lead_contacts")
        .select("contact_id, is_primary")
        .eq("lead_id", lead.id);
      const primary = (linked ?? []).find((c: any) => c.is_primary)?.contact_id
        ?? (linked ?? [])[0]?.contact_id
        ?? null;
      const { data: created, error: createErr } = await supabase
        .from("pipeline_opportunities")
        .insert({
          lead_id: lead.id,
          stage: initialStage,
          loan_amount: loan_amount ?? null,
          property_address: property_address ?? null,
          primary_contact_id: primary,
          arive_loan_id: arive_loan_id ?? null,
        })
        .select("id, stage, property_address")
        .single();
      if (createErr) {
        console.error("[arive-webhook] failed to create opportunity", createErr);
      } else {
        opp = created as any;
        await supabase.from("deal_events").insert({
          deal_id: created!.id,
          event_type: "stage_transition",
          from_status: null,
          to_status: initialStage,
          actor_id: null,
        });
        // Move the lead out of the active Leads list now that it's a Deal.
        await supabase.from("leads").update({ status: "unqualified" as any }).eq("id", lead.id);
        await supabase.from("lead_events").insert({
          lead_id: lead.id,
          event_type: "moved_to_pipeline",
          points: 0,
          metadata: { opportunity_id: created!.id, stage: initialStage, source: "arive-webhook" } as any,
        });
      }
    }

    // Upsert los_loans
    const losRow: Record<string, unknown> = {
      lead_id: lead.id,
      deal_id: opp?.id ?? null,
      arive_loan_id: arive_loan_id ?? null,
      loan_status: loan_status ?? null,
      purchase_price: purchase_price ?? null,
      loan_amount: loan_amount ?? null,
      interest_rate: interest_rate ?? null,
      loan_program: loan_program ?? null,
      estimated_close_date: estimated_close_date ?? null,
      du_findings: du_findings ?? null,
      conditions: conditions ?? null,
      raw: body,
      last_synced_at: new Date().toISOString(),
    };

    if (arive_loan_id) {
      await supabase.from("los_loans").upsert(losRow, { onConflict: "arive_loan_id" });
    } else {
      // No external id — insert a row anyway, scoped by lead
      const { data: existing } = await supabase
        .from("los_loans").select("id").eq("lead_id", lead.id).maybeSingle();
      if (existing) {
        await supabase.from("los_loans").update(losRow).eq("id", existing.id);
      } else {
        await supabase.from("los_loans").insert(losRow);
      }
    }

    // Update opportunity fields + stage
    if (opp) {
      const oppUpdate: Record<string, unknown> = {};
      if (loan_amount != null) oppUpdate.loan_amount = loan_amount;
      if (arive_loan_id) oppUpdate.arive_loan_id = arive_loan_id;
      if (property_address && !(opp as any).property_address) oppUpdate.property_address = property_address;

      const newStage = loan_status ? STAGE_MAP[String(loan_status).toLowerCase()] : undefined;
      if (newStage && newStage !== opp.stage) {
        oppUpdate.stage = newStage;
        // audit
        await supabase.from("deal_events").insert({
          deal_id: opp.id,
          event_type: "stage_transition",
          from_status: opp.stage,
          to_status: newStage,
          actor_id: null,
        });
      }

      if (Object.keys(oppUpdate).length > 0) {
        await supabase.from("pipeline_opportunities").update(oppUpdate).eq("id", opp.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, lead_id: lead.id, deal_id: opp?.id ?? null }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[arive-webhook]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});