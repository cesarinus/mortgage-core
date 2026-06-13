# Sprint 2 — Workflow & Notifications

Builds on Sprint 1's Settings Control Center. Delivered in 4 phases. Each ends with a working UI persisted to the database.

## Phase 1 — Lead Sources

Extend the existing `lead_sources` table (currently only `id, name, created_at`) and replace the placeholder route.

### Schema (additive)
```sql
alter table lead_sources add column
  description text, color text, icon text,
  default_lead_score int default 0,
  is_active bool default true, is_archived bool default false,
  sort int default 0, owner_id uuid references auth.users,
  created_by uuid, updated_at timestamptz default now();

create table lead_source_rules (
  id uuid pk, source_id uuid fk, name text,
  conditions jsonb,                -- optional extra match criteria
  actions jsonb,                   -- {assign_to, set_score, create_task, ...}
  is_active bool, sort int, timestamps
);

create table lead_source_analytics_daily (
  source_id uuid, day date,
  leads int, applications int, funded int,
  revenue_cents bigint, conversion_pct numeric,
  primary key (source_id, day)
);
```
All with `GRANT` + RLS (admin write, authenticated read).

### UI — `src/pages/settings/LeadSourcesManager.tsx`
- DataTable of sources with drag-and-drop reorder (`@dnd-kit/sortable`, already installed).
- Create/Edit drawer: name, description, color swatch, icon picker (lucide), default score slider, owner select, active toggle.
- Row actions: Edit, Archive, Restore, Delete.
- Seed defaults on first load if table is empty: Realtor, Past Client, Referral, Google Ads, Facebook, Instagram, Organic Search, Open House, Walk-In, Website Form, AI Assistant, Digital Twin, VAPI Voice Agent, Zapier Import, ARIVE Import.

### Rules sub-tab
Visual builder per source: list of rules with action chips (Assign LO, Set Score, Create Task, Add Tag). Applied by `applyLeadSourceRules(lead)` helper called from lead-intake paths (`submit-lead` edge function + manual create in `Leads.tsx`).

### Analytics sub-tab
Cards: Best Converting / Highest Revenue / Fastest Closing / Most Active.
Table: Source | Leads | Apps | Funded | Conv % | Revenue.
Computed in a Postgres view over `leads` + `pipeline_opportunities`; persisted snapshots written nightly into `lead_source_analytics_daily` by a cron (`pg_cron` + `pg_net` to a new `compute-source-analytics` edge function).

### Field integration
The existing CRM Field Builder "Lead Source" field now sources options live from `lead_sources` (active, non-archived) via a new `option_source: "lead_sources"` mode in `crm_fields`.

---

## Phase 2 — Pipeline Stages

Today stages are hardcoded in `src/lib/crm/stages.ts`. Replace with a DB-driven registry while preserving the existing enum for back-compat.

### Schema
```sql
create table pipeline_stages (
  id uuid pk, key text unique,           -- maps to legacy enum value
  name text, description text,
  color text, icon text,
  probability_pct int, expected_days int,
  is_active bool, is_archived bool,
  sort int, is_terminal bool default false,
  arive_stage_id text,                   -- future LOS mapping
  timestamps
);

create table pipeline_stage_requirements (
  id uuid pk, stage_id uuid fk,
  field_id uuid fk crm_fields,            -- required field to exit stage
  required bool default true
);

create table pipeline_stage_rules (
  id uuid pk, stage_id uuid fk,
  trigger text,                           -- on_enter | on_exit
  actions jsonb,                          -- {create_task, notify, send_email, update_los}
  is_active bool, sort int
);

create table pipeline_stage_analytics_daily (
  stage_id uuid, day date,
  avg_time_hours numeric, conversion_pct numeric,
  drop_off_pct numeric, funded int, revenue_cents bigint,
  primary key (stage_id, day)
);
```

Seed defaults: Lead, Pre-Qualification, Pre-Approval, Application, Processing, Underwriting, Conditional Approval, Clear To Close, Funding, Closed, Lost.

### UI — `src/pages/settings/PipelineStagesManager.tsx`
- DnD list with grip handles (reuse Sprint 1 pattern).
- Per-stage editor: name, description, color, icon, probability %, expected duration (days), active toggle, terminal toggle.
- "Required fields" panel: multi-select from `crm_fields` for the active module.
- Automation panel: rule cards with action picker (Create Task, Notify role, Send Email template, Update LOS).

### Engine
- `src/lib/pipeline/stageEngine.ts`: `canExitStage(deal)` → checks `pipeline_stage_requirements` against current values; returns `{ ok, missing[] }`. Wire into `Pipeline.tsx` stage-change handler and `RecordWorkspace` save path. Block move + show a toast listing missing fields.
- `runStageAutomations(deal, from, to)` → executes `on_exit` for `from` and `on_enter` for `to`. Implemented in a new `pipeline-stage-automations` edge function called from the same client transition.
- Existing `STAGE_LABELS` / `STAGE_BADGE` maps in `src/lib/crm/stages.ts` switch to a React Query-cached fetch from `pipeline_stages`, with hardcoded values as fallback so nothing breaks during migration.

---

## Phase 3 — Notification Center

Replace `Notifications` placeholder (`SOON` chip) with a real page.

### Schema
```sql
create table notification_preferences (
  id uuid pk, user_id uuid fk auth.users unique,
  channels jsonb,         -- { new_lead: { in_app, email, sms, push }, ... }
  quiet_hours jsonb,      -- { start: "22:00", end: "07:00", tz }
  digest_mode text,       -- instant | hourly | daily | weekly
  timestamps
);

create table notification_templates (
  id uuid pk, key text unique, channel text,
  subject text, body text, variables jsonb, timestamps
);

create table notification_events (
  id uuid pk, user_id uuid, type text, channel text,
  payload jsonb, status text,          -- queued|sent|opened|clicked|dismissed|failed
  sent_at timestamptz, opened_at timestamptz,
  clicked_at timestamptz, created_at timestamptz default now()
);

create table notification_digests (
  id uuid pk, user_id uuid, mode text,
  window_start timestamptz, window_end timestamptz,
  items jsonb, sent_at timestamptz
);
```

### UI — `src/pages/settings/NotificationCenter.tsx`
Tabbed page:
1. **CRM** — New Lead, Lead Assigned, Task Assigned, Document Uploaded, Stage Change, Loan Funded, Application Submitted.
2. **Email** — master toggle, Daily Digest, Weekly Summary, Funding Alerts, Lead Alerts.
3. **SMS** (Twilio) — master toggle, High Priority, Missed Follow-Ups, Urgent Tasks. Show "Connect Twilio" CTA if connector missing.
4. **AI** — Opportunities, Refi, Missing Docs, High Risk, Rate Drop, Bottlenecks.
5. **System** — Supabase / ARIVE / Zapier / Twilio / API failures.

Each row = matrix of channel checkboxes (In-App | Email | SMS | Push | None). Quiet hours picker + digest mode selector at top.

### Delivery
- `notify(userId, type, payload)` helper in `src/lib/notifications/dispatch.ts` reads prefs, expands template, writes `notification_events`, calls send-email / Twilio / push as configured. In quiet hours, downgrade non-critical to digest queue.
- Hourly/daily/weekly digests assembled by a `process-notification-digests` edge function on `pg_cron`.
- In-app: realtime subscription to `notification_events` (already enabled on this project).

---

## Phase 4 — Analytics & Audit Wiring

- `compute-source-analytics` and `compute-pipeline-analytics` edge functions, scheduled nightly via `pg_cron` + `pg_net`. Both upsert into the `_daily` tables added above.
- Read views: `lead_source_performance_view`, `pipeline_stage_performance_view` for the UI cards.
- Notification analytics: `notification_events` aggregated by type/channel in a small admin panel under Notifications.
- **Audit logging** — extend Sprint 1's `logAudit()` to fire from every save path in this sprint: source CRUD, source rules, stage CRUD/reorder, stage requirements, stage rules, notification prefs. Entity types: `lead_source`, `lead_source_rule`, `pipeline_stage`, `pipeline_stage_rule`, `pipeline_stage_requirement`, `notification_preference`.

---

## Out of scope
- Real Push notifications (Web Push) — UI toggle wired but channel returns "queued" until a provider is connected.
- ARIVE write-through for stage mapping (column captured only).
- Migrating historical `leads.status` enum values to new stages — handled in a follow-up after the team confirms terminology.

## Technical notes
- All DB changes additive; existing `leads.status` enum + `source_id` FK remain authoritative.
- New tables: admin write via `is_admin()`, authenticated read where safe; `notification_*` scoped to `user_id = auth.uid()`.
- Every public table created with `GRANT` block per repo rule.
- No edits to `client.ts` or `types.ts`.

## Delivery order
1. Migration: all new tables + columns + RLS/grants + seeds.
2. Phase 1 — Lead Sources manager + field integration + analytics view.
3. Phase 2 — Pipeline Stages manager + engine + automations.
4. Phase 3 — Notification Center page + dispatch helper.
5. Phase 4 — Cron analytics + audit wiring.
