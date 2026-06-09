# Ask Hub — Agentic CRM Command Center

A Lovable-style home screen for the CRM that replaces the current floating sparkle button. It's a chat-first surface that can query the CRM, summarize records, surface what needs attention, and route you anywhere with one click — all read-only in v1.

## What you'll get

**1. New "Ask" page** (`/crm/ask`)
- Greeting: "What's on your mind, Cesar?" (uses your profile name)
- Centered composer with `+` quick-action menu and send arrow
- Sidebar entry "Ask" with a custom icon + ⌘K / Ctrl-K global shortcut
- Daily morning brief card at the top: stuck leads overnight, conditions expiring today, pipeline movement, tasks due
- 4–6 suggested-prompt chips that rotate based on time of day, your role, and recent CRM events

**2. `+` quick-action menu**
Dashboard · Leads · Pipeline · Contacts · Companies · Tasks · New Lead (opens SmartLeadForm) · Find record (opens RecordLookup)

**3. Read-only agent (v1)**
The chat understands natural-language CRM questions and answers with structured result cards (clickable rows that deep-link into `RecordWorkspace`). Examples it will handle:
- "Show leads that need attention"
- "Which leads have incomplete tasks?"
- "Summarize lead Maria Rodriguez"
- "What's in my pipeline at Underwriting?"
- "Who hasn't been contacted in 7 days?"
- "Top 5 high-score leads this week"

No write actions in v1 — every response is information + links. Write tools (create task, log call, send email) come in a follow-up phase.

**4. Self-evolving foundation**
Every question, tool call, result count, and follow-up click is logged to `assistant_interactions`. This data drives:
- Suggested-prompt ranking (popular + personally useful prompts float up)
- Morning-brief content (only surface items you actually act on)
- Future fine-tuning hints

**5. Replaces the floating sparkle**
`AssistantLauncher` is removed. The hub is the single assistant surface. Existing `AssistantPanel` and `chat-completion` function stay as the backend foundation but are upgraded.

---

## Technical section

**Frontend**
- New route `src/pages/crm/AskHub.tsx` + sidebar item in `AppSidebar.tsx`
- AI Elements: `conversation`, `message`, `prompt-input`, `shimmer`, `tool` (installed via `ai-elements@latest add`)
- Composer uses `PromptInput` + `PromptInputFooter` with a `+` `DropdownMenu` for quick actions
- `useChat` (AI SDK) pointing at `chat-completion` edge function via `DefaultChatTransport`
- Tool results rendered as compact custom cards (LeadResultCard, TaskResultCard, DealResultCard, SummaryCard) — each row links to `/crm/record/:id`
- Remove `AssistantLauncher` mount from `AppLayout` (keep file for now in case of rollback)
- Custom agent logo (generated, not Sparkles) for empty state and avatar

**Backend (edge function upgrade)**
Upgrade `supabase/functions/chat-completion/index.ts` to a tool-calling agent using AI SDK + Lovable AI Gateway (`google/gemini-3-flash-preview`), `stopWhen: stepCountIs(50)`. Read-only tools (all scoped by `auth.uid()` via existing RLS):
- `query_leads({ filter: needs_attention | stuck | high_score | uncontacted_days | status, limit })`
- `query_pipeline({ stage?, owner?, limit })`
- `query_tasks({ status: open|overdue|due_today, assignee_id?, limit })`
- `query_contacts({ search, limit })`
- `query_deals({ stage?, limit })`
- `summarize_record({ kind: lead|deal|contact, id })` — pulls activities, conditions, latest income, sentiment
- `get_morning_brief()` — composite call used by the brief card

System prompt grounds the model in NexGen schema, role context, and "read-only — never claim you took an action."

**New table** (extension-only, additive)
`assistant_interactions`: `id`, `user_id`, `session_id`, `question`, `tool_calls jsonb`, `tool_results_summary jsonb`, `result_clicked_id`, `result_clicked_kind`, `latency_ms`, `created_at`. RLS: user reads/inserts their own rows; admin reads all; service_role full. Standard GRANTs.

**Morning brief**
Computed on-demand inside `get_morning_brief()` (no cron needed v1). Cached in component state for 10 min. Pulls from existing tables: `leads.is_stuck`, `loan_conditions` expiring ≤24h, `crm_tasks` due today, `deal_stage_history` last 24h.

**Suggested prompts**
Static seed list of 12 prompts, ranked client-side by (a) time of day bucket, (b) user's top-3 tool calls from `assistant_interactions` last 14 days, (c) role.

**Files**
- New: `src/pages/crm/AskHub.tsx`, `src/components/crm/ask/QuickActionsMenu.tsx`, `src/components/crm/ask/MorningBrief.tsx`, `src/components/crm/ask/SuggestedPrompts.tsx`, `src/components/crm/ask/results/*` (LeadResultCard, TaskResultCard, DealResultCard, SummaryCard), `src/lib/crm/askTools.ts` (client-side result typing), `src/assets/ask-logo.png` (generated)
- Edit: `supabase/functions/chat-completion/index.ts` (add tools + system prompt), `src/components/AppSidebar.tsx` (add "Ask" item + ⌘K), `src/components/AppLayout.tsx` (remove launcher mount), `src/App.tsx` (add route)
- New migration: `assistant_interactions` table + RLS + GRANTs
- AI Elements install: `bunx ai-elements@latest add conversation message prompt-input shimmer tool`

**Out of scope for v1** (clearly deferred)
- Voice input/output
- Write actions (create task, send email, change stage)
- Cross-user analytics ("what other LOs ask")
- Streaming partial tool results

## Risk / change-control notes

- Additive only — no edits to leads/deals/conditions/tasks schemas
- `chat-completion` function is upgraded in place; old client (`AssistantPanel`) keeps working because tool calls degrade to plain text answers if rendered there
- Sparkle launcher is unmounted, not deleted, so rollback is one line

Approve and I'll build it.