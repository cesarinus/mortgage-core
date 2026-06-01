import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: isAdmin }, { data: isOfficer }] = await Promise.all([
      supabase.rpc("has_role", { _role: "admin" }),
      supabase.rpc("has_role", { _role: "loan_officer" }),
    ]);
    if (!isAdmin && !isOfficer) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { topic, category, status: postStatus } = await req.json();
    if (!topic) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a professional real estate, finance, and local business content writer.

Write a high-quality blog article for NexGenSWFL.com.

LOCATION FOCUS: Southwest Florida (Naples, Fort Myers, Cape Coral)

GOAL:
- Educate
- Build trust
- Improve SEO
- Encourage user action

STRUCTURE:
1. Compelling headline (SEO optimized)
2. Engaging introduction (hook the reader)
3. Clearly structured sections with headings (H2/H3)
4. Use short paragraphs (2-4 lines max)
5. Include bullet points where helpful
6. Add real-world examples
7. Include a local angle (SWFL relevance)
8. Add a soft call-to-action at the end

TONE:
- Professional but conversational
- Clear and easy to understand
- Authoritative but not overly technical

INCLUDE:
- Mortgage insights when relevant
- Local business relevance
- Market trends (simplified)
- Actionable advice

OUTPUT FORMAT:
Return a valid JSON object with these exact keys:
{
  "title": "SEO optimized title",
  "meta_title": "Page title under 60 chars",
  "meta_description": "Meta description under 160 chars",
  "excerpt": "2-3 sentence summary",
  "content_html": "Full article as clean HTML using <h2>, <h3>, <p>, <ul>, <li> tags. Include a <div data-module=\\"recommended-businesses\\" data-category=\\"${category || "mortgage"}\\"></div> placeholder after the 2nd section and at the end before the CTA.",
  "tags": ["tag1", "tag2", "tag3"],
  "keywords": ["keyword1", "keyword phrase 2", "keyword3", ...] // 8-15 SEO keywords/keyphrases for internal linking
}

DO NOT include markdown, emojis, or AI disclaimers in the content.`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Write a blog article about: ${topic}` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "create_blog_post",
                description: "Create a structured blog post",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    meta_title: { type: "string" },
                    meta_description: { type: "string" },
                    excerpt: { type: "string" },
                    content_html: { type: "string" },
                    tags: { type: "array", items: { type: "string" } },
                    keywords: { type: "array", items: { type: "string" }, description: "8-15 SEO keywords/keyphrases extracted from the article for internal linking" },
                  },
                  required: [
                    "title",
                    "meta_title",
                    "meta_description",
                    "excerpt",
                    "content_html",
                    "tags",
                    "keywords",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "create_blog_post" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const post = JSON.parse(toolCall.function.arguments);

    // Generate slug
    const slug = post.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 80);

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: inserted, error: insertError } = await adminClient
      .from("blog_posts")
      .insert({
        title: post.title,
        slug,
        content_html: post.content_html,
        excerpt: post.excerpt,
        category: category || "General",
        tags: post.tags || [],
        keywords: post.keywords || [],
        meta_title: post.meta_title,
        meta_description: post.meta_description,
        status: postStatus || "draft",
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ post: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
