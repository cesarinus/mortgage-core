export type StageTaskSuggestion = { title: string; priority?: "low" | "medium" | "high" };

/** Suggested next-action tasks by entity stage/status. Used for non-blocking suggestions only. */
export const STAGE_TASK_SUGGESTIONS: Record<string, StageTaskSuggestion[]> = {
  // deal stages
  new_lead: [
    { title: "Send welcome SMS", priority: "high" },
    { title: "Schedule initial consult", priority: "high" },
  ],
  contacted: [
    { title: "Confirm loan goals", priority: "medium" },
    { title: "Run pre-qualification", priority: "high" },
  ],
  application_sent: [
    { title: "Request W-9 and pay stubs", priority: "high" },
    { title: "Order credit report", priority: "high" },
  ],
  underwriting: [
    { title: "Follow up on appraisal", priority: "high" },
    { title: "Send conditions to borrower", priority: "medium" },
  ],
  approved: [
    { title: "Schedule closing", priority: "high" },
    { title: "Send Closing Disclosure", priority: "high" },
  ],
  clear_to_close: [
    { title: "Verify closing funds", priority: "high" },
    { title: "Confirm final walk-through", priority: "medium" },
  ],
  closed: [
    { title: "Send referral request", priority: "medium" },
    { title: "Add to nurture sequence", priority: "low" },
  ],
  lost: [
    { title: "Request exit feedback", priority: "medium" },
    { title: "Archive file", priority: "low" },
  ],
  // lead-only statuses mapped to closest stage
  qualified: [
    { title: "Confirm loan goals", priority: "medium" },
    { title: "Run pre-qualification", priority: "high" },
  ],
  unqualified: [
    { title: "Request exit feedback", priority: "medium" },
    { title: "Archive file", priority: "low" },
  ],
};

export function getStageSuggestions(stage: string | null | undefined): StageTaskSuggestion[] {
  if (!stage) return [];
  return STAGE_TASK_SUGGESTIONS[stage] ?? [];
}