import { supabase } from "@/integrations/supabase/client";

export type AskToolCall = { name: string; args?: any; result_summary?: any };

export async function logInteraction(opts: {
  question: string;
  session_id?: string | null;
  tool_calls?: AskToolCall[];
  tool_results_summary?: any;
  latency_ms?: number;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await (supabase as any).from("assistant_interactions").insert({
    user_id: u.user.id,
    session_id: opts.session_id ?? null,
    question: opts.question,
    tool_calls: opts.tool_calls ?? [],
    tool_results_summary: opts.tool_results_summary ?? {},
    latency_ms: opts.latency_ms ?? null,
  });
}

export async function fetchTopToolCalls(userId: string, days = 14) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await (supabase as any)
    .from("assistant_interactions")
    .select("tool_calls")
    .eq("user_id", userId)
    .gte("created_at", since)
    .limit(200);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { tool_calls: any[] }[]) {
    for (const tc of row.tool_calls ?? []) {
      if (tc?.name) counts.set(tc.name, (counts.get(tc.name) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}