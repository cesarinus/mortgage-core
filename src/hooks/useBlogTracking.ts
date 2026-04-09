import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "ng_blog_session_id";
const VISITED_KEY = "ng_blog_visited_posts";
const SCORE_KEY = "ng_blog_score";

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getScore(): number {
  return parseInt(localStorage.getItem(SCORE_KEY) || "0", 10);
}

function addScore(points: number): number {
  const current = getScore() + points;
  localStorage.setItem(SCORE_KEY, String(current));
  return current;
}

function getVisitedPosts(): string[] {
  try {
    return JSON.parse(localStorage.getItem(VISITED_KEY) || "[]");
  } catch {
    return [];
  }
}

function addVisitedPost(postId: string): boolean {
  const visited = getVisitedPosts();
  if (visited.includes(postId)) return false;
  visited.push(postId);
  localStorage.setItem(VISITED_KEY, JSON.stringify(visited));
  return true;
}

async function sendEvent(
  eventType: string,
  postId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.functions.invoke("track-blog-event", {
      body: {
        session_id: getSessionId(),
        event_type: eventType,
        post_id: postId || null,
        metadata: metadata || {},
      },
    });
  } catch {
    // Silent fail
  }
}

interface UseBlogTrackingOptions {
  postId?: string;
  enabled?: boolean;
}

export function useBlogTracking({ postId, enabled = true }: UseBlogTrackingOptions = {}) {
  const firedEvents = useRef(new Set<string>());
  const startTime = useRef(Date.now());
  const scoreRef = useRef(getScore());

  // Page view + multi-visit detection
  useEffect(() => {
    if (!enabled || !postId) return;
    firedEvents.current.clear();
    startTime.current = Date.now();

    const isNewVisit = addVisitedPost(postId);
    sendEvent("page_view", postId);
    scoreRef.current = addScore(5);

    if (isNewVisit) {
      const visited = getVisitedPosts();
      if (visited.length >= 3 && !firedEvents.current.has("multi_visit")) {
        firedEvents.current.add("multi_visit");
        sendEvent("multi_visit", postId, { posts_count: visited.length });
        scoreRef.current = addScore(25);
      }
    }
  }, [postId, enabled]);

  // Scroll depth tracking
  useEffect(() => {
    if (!enabled || !postId) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = (scrollTop / docHeight) * 100;

      if (pct >= 50 && !firedEvents.current.has("scroll_50")) {
        firedEvents.current.add("scroll_50");
        sendEvent("scroll_50", postId);
        scoreRef.current = addScore(10);
      }
      if (pct >= 90 && !firedEvents.current.has("scroll_90")) {
        firedEvents.current.add("scroll_90");
        sendEvent("scroll_90", postId);
        scoreRef.current = addScore(20);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [postId, enabled]);

  // Time on page tracking (2+ minutes)
  useEffect(() => {
    if (!enabled || !postId) return;

    const timer = setTimeout(() => {
      if (!firedEvents.current.has("time_on_page")) {
        firedEvents.current.add("time_on_page");
        sendEvent("time_on_page", postId, { seconds: 120 });
        scoreRef.current = addScore(15);
      }
    }, 120_000);

    return () => clearTimeout(timer);
  }, [postId, enabled]);

  // Exit intent tracking
  useEffect(() => {
    if (!enabled || !postId) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5 && !firedEvents.current.has("exit_intent")) {
        firedEvents.current.add("exit_intent");
        sendEvent("exit_intent_triggered", postId);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [postId, enabled]);

  // CTA click tracker
  const trackCTA = useCallback(
    (ctaName: string) => {
      if (!enabled) return;
      sendEvent("cta_click", postId, { cta: ctaName });
      scoreRef.current = addScore(30);
    },
    [postId, enabled]
  );

  return {
    trackCTA,
    getScore,
    getSessionId,
  };
}

export { getSessionId, getScore };
