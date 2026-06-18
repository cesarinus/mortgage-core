import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") ?? "";

interface AutocompleteSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface AddressDetails {
  placeId: string;
  formatted: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  country: string;
  lat?: number;
  lng?: number;
}

function pickComponent(components: any[], type: string, short = false): string {
  const c = components?.find((c) => Array.isArray(c.types) && c.types.includes(type));
  if (!c) return "";
  return short ? (c.short_name ?? "") : (c.long_name ?? "");
}

async function autocomplete(input: string, sessionToken?: string): Promise<AutocompleteSuggestion[]> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input);
  url.searchParams.set("key", KEY);
  url.searchParams.set("types", "address");
  url.searchParams.set("components", "country:us");
  if (sessionToken) url.searchParams.set("sessiontoken", sessionToken);
  const res = await fetch(url.toString());
  const json = await res.json();
  if (json.status && json.status !== "OK" && json.status !== "ZERO_RESULTS") {
    throw new Error(`Places autocomplete: ${json.status} ${json.error_message ?? ""}`);
  }
  return (json.predictions ?? []).map((p: any) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text ?? p.description,
    secondaryText: p.structured_formatting?.secondary_text ?? "",
  }));
}

async function details(placeId: string, sessionToken?: string): Promise<AddressDetails> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("key", KEY);
  url.searchParams.set("fields", "address_component,formatted_address,geometry/location,place_id");
  if (sessionToken) url.searchParams.set("sessiontoken", sessionToken);
  const res = await fetch(url.toString());
  const json = await res.json();
  if (json.status !== "OK") {
    throw new Error(`Places details: ${json.status} ${json.error_message ?? ""}`);
  }
  const r = json.result;
  const comps = r.address_components ?? [];
  const streetNumber = pickComponent(comps, "street_number");
  const route = pickComponent(comps, "route");
  const street = [streetNumber, route].filter(Boolean).join(" ");
  const city =
    pickComponent(comps, "locality") ||
    pickComponent(comps, "sublocality") ||
    pickComponent(comps, "postal_town") ||
    pickComponent(comps, "administrative_area_level_3");
  const state = pickComponent(comps, "administrative_area_level_1", true);
  const zip = pickComponent(comps, "postal_code");
  const county = pickComponent(comps, "administrative_area_level_2");
  const country = pickComponent(comps, "country", true);
  return {
    placeId: r.place_id,
    formatted: r.formatted_address ?? "",
    street,
    city,
    state,
    zip,
    county,
    country,
    lat: r.geometry?.location?.lat,
    lng: r.geometry?.location?.lng,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!KEY) {
      return new Response(JSON.stringify({ error: "GOOGLE_PLACES_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const sessionToken = typeof body?.sessionToken === "string" ? body.sessionToken : undefined;

    if (action === "autocomplete") {
      const input = String(body?.input ?? "").trim();
      if (input.length < 3) {
        return new Response(JSON.stringify({ suggestions: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const suggestions = await autocomplete(input, sessionToken);
      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "details") {
      const placeId = String(body?.placeId ?? "");
      if (!placeId) {
        return new Response(JSON.stringify({ error: "placeId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await details(placeId, sessionToken);
      return new Response(JSON.stringify({ result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});