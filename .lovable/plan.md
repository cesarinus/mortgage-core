# AI Assistant for CRM + Borrower Portal

A grounded, ChatGPT-style assistant available inside the CRM RecordWorkspace/Leads pages and inside the Borrower Portal. Each environment gets its own scoped context, suggested prompts, and safety rules. Powered by Lovable AI Gateway via a new edge function `chat-completion`, with threads persisted in Supabase.

## 1. Database (new migration)

New tables (both extension-only, no changes to existing tables):

- `chat_threads`
  - `user_id uuid` (auth.users) — owner (staff or portal user)
  - `scope text` — `'crm'` or `'portal'`
  - `record_kind text` — `'lead' | 'contact' | 'deal' | 'portal'` (nullable for general)
  - `record_id uuid` (nullable)
  - `title text`
  - `created_at`, `updated_at`
- `chat_messages`
  - `thread_id uuid` → chat_threads
  - `role text` — `'user' | 'assistant' | 'system'`
  - `content text`
  - `created_at`

RLS:
- CRM threads: visible to owner (`auth.uid() = user_id`) AND admin (`is_admin()`).
- Portal threads: visible only to the portal user that owns them (`auth.uid() = user_id`).
- Messages inherit thread access via `EXISTS (SELECT 1 FROM chat_threads ...)`.

GRANTs to `authenticated` and `service_role` on both tables.

## 2. Edge Function: `supabase/functions/chat-completion/index.ts`

- `verify_jwt = true` (added to config.toml) — must know who's calling.
- Inputs: `{ threadId, scope: 'crm'|'portal', recordKind?, recordId?, message }`.
- Steps:
  1. Authenticate user via JWT; create user-scoped supabase client + service client.
  2. Load thread (verify ownership) or create new.
  3. **Context loader** (server-side, RLS-respecting):
     - CRM scope + lead/contact: fetch lead, mortgage_profile, lead_sentiment, last 20 crm_activities, lead_events, deals, lead_contacts, companies, tasks, doc checklist via existing tables.
     - Portal scope: resolve current portal_user → deal → fetch deal, scenarios, documents, portal_messages, tasks. Strip internal-only fields (lead_score, sentiment internals, assigned_to, etc).
  4. Build system prompt with scope-specific rules ("Ground in supplied JSON only. Say so if data is missing. Never invent fields.").
  5. Save user message → call Lovable AI Gateway `google/gemini-3-flash-preview` with `streamText` → return `toUIMessageStreamResponse`.
  6. `onFinish`: persist assistant message.

Lovable AI Gateway used (no extra secrets required — `LOVABLE_API_KEY` exists).

## 3. Frontend

Note: project is **classic Vite/React Router**, not TanStack Start (despite request wording). Follow classic-ai-chat patterns.

**Shared components** (`src/components/chat/`):
- `AssistantPanel.tsx` — collapsible right-side panel on desktop (resizable via existing `Resizable` primitives), bottom `Sheet` on mobile. Uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport` pointed at `${VITE_SUPABASE_URL}/functions/v1/chat-completion` with bearer auth.
- `AssistantLauncher.tsx` — floating button (bottom-right) to toggle panel.
- `ThreadList.tsx` — list/create/delete threads scoped to current record/portal.
- `MessageList.tsx` — renders `message.parts` with `react-markdown` + `remark-gfm` (tables, code blocks). Typewriter feel comes naturally from streaming.
- `SuggestedPrompts.tsx` — scope-specific starter chips.
- `useAssistantContext.ts` — hook that builds the small context payload (record id/kind/scope) to send with each message.

**Install** AI Elements primitives: `conversation`, `message`, `prompt-input`, `shimmer` via `bunx ai-elements@latest add ...`. Render assistant messages with no background, user messages with `primary`/`primary-foreground` per chat-ui-composition.

**CRM integration:**
- Mount `<AssistantLauncher scope="crm" recordKind={kind} recordId={id} />` inside `RecordWorkspace.tsx` (top-level wrapper, doesn't disturb existing 12-col grid).
- Also add to `Leads.tsx` page (scope=crm, no record).

**Portal integration:**
- Mount `<AssistantLauncher scope="portal" />` inside `PortalLayout.tsx` so it appears across all portal pages.

**Streaming**: AI SDK `useChat` handles streaming naturally.

**History**: thread state lives in DB + locally cached so chat survives navigation within session (React Query keyed by threadId).

## 4. Role-based enable/disable

- New profile field already exists for roles via `user_roles` (admin/loan_officer/processor). Add a per-user `assistant_enabled` flag in `profiles` (default true). For portal users, default true.
- Settings UI: small toggle in `SettingsPage.tsx` ("Enable AI Assistant"). When false, `AssistantLauncher` returns null.
- Admin can override per-user via existing admin UI (out of scope for this PR — toggle is self-serve).

## 5. Safety / non-breaking

- No edits to `handleStatusChange`, action modals, queries, or existing tables.
- Assistant **read-only in v1** — "perform actions" like add note/create task are deferred (mention in chat: "I can suggest it, but please use the Add Note button"). This avoids destabilizing existing handlers. Future iteration can add tool-calling.
- Portal context loader strips internal CRM fields (whitelist approach).

## Technical details

- Files added:
  - `supabase/migrations/<ts>_chat_assistant.sql`
  - `supabase/functions/chat-completion/index.ts`
  - `supabase/functions/_shared/ai-gateway.ts` (if not present)
  - `src/components/chat/AssistantPanel.tsx`
  - `src/components/chat/AssistantLauncher.tsx`
  - `src/components/chat/ThreadList.tsx`
  - `src/components/chat/MessageList.tsx`
  - `src/components/chat/SuggestedPrompts.tsx`
  - `src/hooks/useAssistant.ts`
- Files modified:
  - `supabase/config.toml` → add `[functions.chat-completion]` block
  - `src/pages/crm/RecordWorkspace.tsx` → mount launcher
  - `src/pages/Leads.tsx` → mount launcher
  - `src/components/portal/PortalLayout.tsx` → mount launcher
  - `src/pages/SettingsPage.tsx` → enable/disable toggle
  - `package.json` → add `ai`, `@ai-sdk/react`, `@ai-sdk/openai-compatible`, `react-markdown`, `remark-gfm`
- Model: `google/gemini-3-flash-preview` (default).
- No new secrets needed.

## Out of scope (v1)

- Assistant-initiated mutations (status change, send email). Suggestion-only.
- Cross-thread search.
- File uploads inside chat.
