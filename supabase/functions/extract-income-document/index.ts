import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SUPPORTED_SLUGS = new Set([
  "pay-stubs",
  "w2",
  "1099",
  "tax-returns",
  "business-tax-returns",
]);

const SYSTEM_PROMPT = `You read US mortgage income documents and extract structured numeric data.
You will be given a single document (image or PDF page). First classify it, then extract values.
Return ONLY valid JSON matching the schema below. All amounts in US dollars as numbers (no commas, no $).
Use null when a field is not visible. Do NOT guess.

Schema:
{
  "doc_type": "pay_stub" | "w2" | "form_1099" | "form_1040" | "business_return" | "unknown",
  "confidence": number,                // 0..1 confidence in the classification + extraction
  "tax_year": number | null,
  "period_ending_date": string | null, // YYYY-MM-DD (pay stub period end)
  "employer_or_payer": string | null,
  "pay_stub": {                        // null unless doc_type === "pay_stub"
    "gross_base_ytd": number | null,
    "overtime_ytd": number | null,
    "bonus_ytd": number | null,
    "commission_ytd": number | null,
    "pay_frequency": "weekly" | "biweekly" | "semimonthly" | "monthly" | null
  } | null,
  "w2": {                              // null unless doc_type === "w2"
    "box1_wages": number | null,
    "box5_medicare_wages": number | null
  } | null,
  "form_1099": {                       // null unless doc_type === "form_1099"
    "nonemployee_compensation": number | null,
    "other_income": number | null
  } | null,
  "form_1040": {                       // null unless doc_type === "form_1040"
    "agi": number | null,
    "wages": number | null,
    "schedule_c_net": number | null,
    "schedule_e_net": number | null
  } | null,
  "business_return": {                 // null unless doc_type === "business_return"
    "form": "1120" | "1120S" | "1065" | null,
    "ordinary_business_income": number | null,
    "owner_percent": number | null
  } | null
}`;

function slugToHint(slug: string | null | undefined): string {
  switch (slug) {
    case "pay-stubs": return "pay_stub";
    case "w2": return "w2";
    case "1099": return "form_1099";
    case "tax-returns": return "form_1040";
    case "business-tax-returns": return "business_return";
    default: return "unknown";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
  if (authErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

  if (!LOVABLE_KEY) return json({ error: "Missing LOVABLE_API_KEY" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const attachmentId = typeof body?.attachment_id === "string" ? body.attachment_id : null;
  if (!attachmentId) return json({ error: "attachment_id required" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE);

  // Load attachment (admin client — caller authorization already validated via JWT;
  // we only act on attachments tied to a lead and one of the supported categories)
  const { data: att, error: attErr } = await admin
    .from("crm_attachments")
    .select("id, lead_id, contact_id, deal_id, category_slug, file_path, file_name, mime_type")
    .eq("id", attachmentId)
    .maybeSingle();
  if (attErr || !att) return json({ error: "Attachment not found" }, 404);

  if (!att.category_slug || !SUPPORTED_SLUGS.has(att.category_slug)) {
    return json({ skipped: true, reason: "Unsupported category" });
  }

  // Avoid re-running if already processed
  const { data: existing } = await admin
    .from("income_document_extractions")
    .select("id, status")
    .eq("attachment_id", attachmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing && existing.status !== "failed") {
    return json({ extraction_id: existing.id, status: existing.status, reused: true });
  }

  // Download file
  const { data: file, error: dlErr } = await admin.storage.from("crm-documents").download(att.file_path);
  if (dlErr || !file) {
    const { data: ins } = await admin.from("income_document_extractions").insert({
      attachment_id: attachmentId,
      lead_id: att.lead_id,
      contact_id: att.contact_id,
      deal_id: att.deal_id,
      doc_type: "unknown",
      status: "failed",
      error: `download_failed: ${dlErr?.message ?? "no file"}`,
    }).select("id").single();
    return json({ extraction_id: ins?.id, status: "failed", error: dlErr?.message ?? "download failed" }, 200);
  }

  const buf = new Uint8Array(await file.arrayBuffer());
  // base64 (chunked to avoid stack issues)
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + CHUNK)) as any);
  }
  const base64 = btoa(bin);
  const mime = att.mime_type || file.type || "application/octet-stream";
  const hint = slugToHint(att.category_slug);

  // Call Lovable AI Gateway (Gemini vision) via OpenAI-compatible chat/completions
  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `File name: ${att.file_name}\nCategory hint: ${hint}\nReturn the JSON only.`,
            },
            { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
          ],
        },
      ],
    }),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text().catch(() => "");
    const { data: ins } = await admin.from("income_document_extractions").insert({
      attachment_id: attachmentId,
      lead_id: att.lead_id,
      contact_id: att.contact_id,
      deal_id: att.deal_id,
      doc_type: "unknown",
      status: "failed",
      error: `ai_${aiRes.status}: ${errText.slice(0, 500)}`,
      model: "google/gemini-3-flash-preview",
    }).select("id").single();
    return json({ extraction_id: ins?.id, status: "failed", error: `AI ${aiRes.status}` }, 200);
  }

  const aiJson = await aiRes.json();
  const content = aiJson?.choices?.[0]?.message?.content ?? "";
  let parsed: any = null;
  try { parsed = JSON.parse(content); } catch { parsed = null; }

  if (!parsed) {
    const { data: ins } = await admin.from("income_document_extractions").insert({
      attachment_id: attachmentId,
      lead_id: att.lead_id,
      contact_id: att.contact_id,
      deal_id: att.deal_id,
      doc_type: "unknown",
      status: "failed",
      error: "ai_parse_failed",
      model: "google/gemini-3-flash-preview",
    }).select("id").single();
    return json({ extraction_id: ins?.id, status: "failed", error: "Parse failed" }, 200);
  }

  const docType = ["pay_stub", "w2", "form_1099", "form_1040", "business_return"].includes(parsed?.doc_type)
    ? parsed.doc_type
    : "unknown";

  const { data: ins, error: insErr } = await admin.from("income_document_extractions").insert({
    attachment_id: attachmentId,
    lead_id: att.lead_id,
    contact_id: att.contact_id,
    deal_id: att.deal_id,
    doc_type: docType,
    tax_year: typeof parsed?.tax_year === "number" ? parsed.tax_year : null,
    period_ending_date: typeof parsed?.period_ending_date === "string" ? parsed.period_ending_date : null,
    extracted: parsed,
    confidence: typeof parsed?.confidence === "number" ? parsed.confidence : null,
    status: "pending",
    model: "google/gemini-3-flash-preview",
  }).select("*").single();

  if (insErr) return json({ error: insErr.message }, 400);
  return json({ extraction_id: ins.id, status: "pending", extraction: ins });
});