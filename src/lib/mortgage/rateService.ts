import { supabase } from "@/integrations/supabase/client";

export interface MarketRate {
  adjusted_rate: number;
  rate_30yr: number;
  source: string;
  fetched_at: string;
  is_manual_override: boolean;
}

const FALLBACK_ADJUSTED = 6.875;
const FALLBACK_BASE = 6.75;
let cache: { at: number; value: MarketRate } | null = null;
const TTL = 5 * 60 * 1000;

export async function getCurrentRateMeta(force = false): Promise<MarketRate> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.value;
  const { data } = await supabase
    .from("mortgage_market_rates" as any)
    .select("adjusted_rate, rate_30yr, source, fetched_at, is_manual_override")
    .eq("active", true)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const value: MarketRate = data
    ? {
        adjusted_rate: Number((data as any).adjusted_rate) || FALLBACK_ADJUSTED,
        rate_30yr: Number((data as any).rate_30yr) || FALLBACK_BASE,
        source: (data as any).source ?? "fallback",
        fetched_at: (data as any).fetched_at ?? new Date().toISOString(),
        is_manual_override: !!(data as any).is_manual_override,
      }
    : {
        adjusted_rate: FALLBACK_ADJUSTED,
        rate_30yr: FALLBACK_BASE,
        source: "fallback",
        fetched_at: new Date().toISOString(),
        is_manual_override: false,
      };
  cache = { at: Date.now(), value };
  return value;
}

export async function getCurrentMortgageRate(): Promise<number> {
  const meta = await getCurrentRateMeta();
  return meta.adjusted_rate;
}

export function clearMortgageRateCache() {
  cache = null;
}