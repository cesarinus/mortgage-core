import { corsHeaders } from "@supabase/supabase-js/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { commentary } = await req.json();
    if (!commentary || typeof commentary !== "string" || commentary.length > 5000) {
      return new Response(JSON.stringify({ error: "Invalid commentary" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a mortgage market analyst. Extract market signals from MBS commentary.
Return ONLY valid JSON with these exact fields:
- rateDirection: "up" | "down" | "flat"
- mbsDirection: "increased" | "decreased" | "unchanged"  
- trendIndicator: "positive" | "negative" | "minimal"

No other text, just the JSON object.`,
          },
          { role: "user", content: commentary },
        ],
        temperature: 0.1,
      }),
    });

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content ?? "{}";
    
    // Extract JSON from potential markdown code blocks
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? "{}");

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to parse commentary" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
