// Public edge function: fetches Google Business reviews via Places API
// with in-memory caching (1 hour TTL). No auth required.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface GoogleReview {
  author_name: string;
  author_url?: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

interface CachedPayload {
  fetched_at: number;
  place_name?: string;
  rating?: number;
  user_ratings_total?: number;
  url?: string;
  reviews: GoogleReview[];
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let cache: CachedPayload | null = null;

// Hardcoded: NexGen Capital Google Business CID resolved from
// https://g.page/r/CfDh9HCvSE-WEBM (CID: 10831174408437465840)
// Place IDs are typically resolved via Find Place; we attempt that on first run.
const SHARE_CID = "CfDh9HCvSE-WEBM";
const BUSINESS_QUERY = "NexGen Capital Fort Myers";

async function resolvePlaceId(apiKey: string): Promise<string | null> {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/findplacefromtext/json",
  );
  url.searchParams.set("input", BUSINESS_QUERY);
  url.searchParams.set("inputtype", "textquery");
  url.searchParams.set("fields", "place_id,name");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok || data.status !== "OK") {
    console.error("findplacefromtext failed", data);
    return null;
  }
  return data.candidates?.[0]?.place_id ?? null;
}

async function fetchReviews(
  apiKey: string,
  placeId: string,
): Promise<CachedPayload> {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json",
  );
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "name,rating,user_ratings_total,url,reviews",
  );
  url.searchParams.set("reviews_sort", "newest");
  url.searchParams.set("reviews_no_translations", "true");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok || data.status !== "OK") {
    throw new Error(
      `Place Details failed: ${data.status} ${data.error_message ?? ""}`,
    );
  }

  const result = data.result ?? {};
  return {
    fetched_at: Date.now(),
    place_name: result.name,
    rating: result.rating,
    user_ratings_total: result.user_ratings_total,
    url: result.url,
    reviews: (result.reviews ?? []) as GoogleReview[],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "GOOGLE_PLACES_API_KEY is not configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const url = new URL(req.url);
    const force = url.searchParams.get("refresh") === "1";

    if (!force && cache && Date.now() - cache.fetched_at < CACHE_TTL_MS) {
      return new Response(
        JSON.stringify({ ...cache, cached: true }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600",
          },
        },
      );
    }

    // Allow override via env (preferred once user provides Place ID).
    let placeId = Deno.env.get("GOOGLE_PLACE_ID") ?? null;
    if (!placeId) {
      placeId = await resolvePlaceId(apiKey);
    }
    if (!placeId) {
      return new Response(
        JSON.stringify({
          error: "Unable to resolve Place ID",
          hint: `Add GOOGLE_PLACE_ID secret manually. Share link CID: ${SHARE_CID}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const payload = await fetchReviews(apiKey, placeId);
    cache = payload;

    return new Response(JSON.stringify({ ...payload, cached: false }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("google-reviews error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});