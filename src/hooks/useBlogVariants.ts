import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId, getScore } from "@/hooks/useBlogTracking";

const VARIANT_KEY = "ng_blog_variant";

export interface BlogVariant {
  id: string | null;
  cta_position: "top" | "middle" | "bottom" | "sticky";
  cta_text: string;
  sidebar_module: "standard" | "testimonial" | "urgency";
}

const CTA_POSITIONS: BlogVariant["cta_position"][] = ["top", "middle", "bottom", "sticky"];
const CTA_TEXTS = ["Get Pre-Qualified", "Check Your Buying Power", "See Your Loan Options"];
const SIDEBAR_MODULES: BlogVariant["sidebar_module"][] = ["standard", "testimonial", "urgency"];

const DEFAULT_VARIANT: BlogVariant = {
  id: null,
  cta_position: "bottom",
  cta_text: "Get Pre-Qualified",
  sidebar_module: "standard",
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getStoredVariant(): BlogVariant | null {
  try {
    const stored = localStorage.getItem(VARIANT_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function storeVariant(v: BlogVariant) {
  try {
    localStorage.setItem(VARIANT_KEY, JSON.stringify(v));
  } catch {}
}

export function useBlogVariants(postId?: string) {
  const [variant, setVariant] = useState<BlogVariant>(() => getStoredVariant() || DEFAULT_VARIANT);
  const impressionSent = useRef(false);

  // Assign or load variant on mount
  useEffect(() => {
    if (!postId) return;

    const stored = getStoredVariant();
    if (stored && stored.id) {
      setVariant(stored);
      return;
    }

    // Generate new random variant
    const newVariant: BlogVariant = {
      id: null,
      cta_position: pickRandom(CTA_POSITIONS),
      cta_text: pickRandom(CTA_TEXTS),
      sidebar_module: pickRandom(SIDEBAR_MODULES),
    };

    // Persist to Supabase
    const sessionId = getSessionId();
    supabase
      .from("blog_variants")
      .upsert(
        {
          session_id: sessionId,
          post_id: postId,
          cta_position: newVariant.cta_position,
          cta_text: newVariant.cta_text,
          sidebar_module: newVariant.sidebar_module,
        },
        { onConflict: "session_id,post_id" }
      )
      .select("id")
      .single()
      .then(({ data }) => {
        if (data) {
          newVariant.id = data.id;
          storeVariant(newVariant);
          setVariant({ ...newVariant });
        }
      });

    storeVariant(newVariant);
    setVariant(newVariant);
  }, [postId]);

  // Dynamic adjustment: if scroll < 40%, move CTA to top
  const adjustForLowScroll = useCallback((scrollPct: number) => {
    if (scrollPct < 40 && variant.cta_position !== "top") {
      const adjusted = { ...variant, cta_position: "top" as const };
      setVariant(adjusted);
      storeVariant(adjusted);
    }
  }, [variant]);

  // Score-based CTA escalation
  const getEffectiveVariant = useCallback((): BlogVariant => {
    const score = getScore();
    if (score > 60) {
      return { ...variant, cta_text: "Talk to an Expert Now" };
    }
    return variant;
  }, [variant]);

  // Track impression
  const trackImpression = useCallback(() => {
    if (!postId || !variant.id || impressionSent.current) return;
    impressionSent.current = true;
    supabase.from("blog_variant_metrics").insert({
      session_id: getSessionId(),
      post_id: postId,
      variant_id: variant.id,
      event_type: "impression",
      cta_position: variant.cta_position,
      cta_text: variant.cta_text,
      sidebar_module: variant.sidebar_module,
    });
  }, [postId, variant]);

  // Track click
  const trackClick = useCallback(() => {
    if (!postId) return;
    supabase.from("blog_variant_metrics").insert({
      session_id: getSessionId(),
      post_id: postId,
      variant_id: variant.id,
      event_type: "click",
      cta_position: variant.cta_position,
      cta_text: variant.cta_text,
      sidebar_module: variant.sidebar_module,
    });
  }, [postId, variant]);

  // Track conversion
  const trackConversion = useCallback(() => {
    if (!postId) return;
    supabase.from("blog_variant_metrics").insert({
      session_id: getSessionId(),
      post_id: postId,
      variant_id: variant.id,
      event_type: "conversion",
      cta_position: variant.cta_position,
      cta_text: variant.cta_text,
      sidebar_module: variant.sidebar_module,
    });
  }, [postId, variant]);

  return {
    variant,
    getEffectiveVariant,
    adjustForLowScroll,
    trackImpression,
    trackClick,
    trackConversion,
  };
}

export { DEFAULT_VARIANT };
