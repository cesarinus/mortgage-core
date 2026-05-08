import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const POST_TYPE_PROMPTS: Record<string, string> = {
  featured_business:
    "Spotlight a Southwest Florida real estate or home-buying tip from NexGen Capital. Friendly, trust-building, end with a CTA to book a call.",
  local_tips:
    "Share a practical mortgage / home-buying tip relevant to Naples, Fort Myers, Cape Coral, or Bonita Springs buyers.",
  events_promotions:
    "Highlight a current loan program (FHA, VA, Conventional, DSCR, USDA, Construction, Refi). Include a soft CTA.",
  ai_tools:
    "Write a short market / rate update for SWFL homebuyers. Educational, no specific rate quotes.",
  success_stories:
    "Write a brief, anonymized client win story (e.g., first-time buyer closing in 21 days). Warm and human.",
  community_highlight:
    "Celebrate something local in Southwest Florida (a neighborhood, an event, a small business). Tie it loosely back to home ownership.",
  summary_reminder:
    "Weekly recap or gentle reminder to schedule a free mortgage consultation.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { post_type, platform = "all", scheduled_date, scheduled_time, custom_prompt } = body;

    if (!post_type || !scheduled_date) {
      return new Response(
        JSON.stringify({ error: "post_type and scheduled_date are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { data: settings } = await supabase
      .from("social_account_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    const brand = settings?.brand_voice ||
      "professional, warm, expert mortgage lender voice";
    const website = settings?.website_url || "https://ngcapital.net";
    const promptBase = POST_TYPE_PROMPTS[post_type] || "Write a social media post for a SWFL mortgage lender.";

    const sysPrompt =
      `You are a social media copywriter for NexGen Capital, a Southwest Florida mortgage lender (NMLS 1766649). ` +
      `Voice: ${brand}. Always include 3-6 relevant hashtags (mix local SWFL + mortgage). ` +
      `Return STRICT JSON: {"post_text": string, "hashtags": string[], "image_placeholder": string, "cta_link": string}. ` +
      `image_placeholder is a short visual description for an image (under 120 chars). ` +
      `cta_link defaults to "${website}/book" if not specified. Keep post_text under 280 chars for cross-platform safety.`;

    const userPrompt = custom_prompt || promptBase;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      throw new Error(`AI gateway error ${aiResp.status}: ${txt}`);
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { post_text: content, hashtags: [], image_placeholder: "", cta_link: `${website}/book` };
    }

    const insertData = {
      post_type,
      platform,
      post_text: parsed.post_text || "",
      hashtags: parsed.hashtags || [],
      image_placeholder: parsed.image_placeholder || null,
      cta_link: parsed.cta_link || `${website}/book`,
      scheduled_date,
      scheduled_time: scheduled_time || "10:00:00",
      status: "draft",
      created_by: userData.user.id,
    };

    const { data: post, error: insertError } = await supabase
      .from("social_media_posts")
      .insert(insertData)
      .select()
      .single();

    if (insertError) throw insertError;

    // Fire-and-forget image generation so the post appears with a visual automatically.
    const imagePrompt = parsed.image_placeholder || parsed.post_text || "";
    if (imagePrompt) {
      const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-social-image`;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      // Don't await — keep the response fast; image will populate via update.
      fetch(fnUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: imagePrompt, postId: post.id }),
      }).catch((e) => console.error("auto image gen failed:", e));
    }

    return new Response(JSON.stringify({ success: true, post }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-social-content error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});