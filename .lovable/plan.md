
# Phase 2 — Borrower-Centric Mortgage OS

Three sequenced sub-phases. Each ships as its own migration + UI batch so we can verify before moving on. Person stays the master record; all new tables join on `person_id` first, with `lead_id` / `opportunity_id` / `application_id` as secondary links.

---

## Phase 2A — Portal Applicant Intelligence

### Backend
- Add a `portal_applicants` view (or extend `portal_users`) that exposes:
  `person_id, lead_id, email, phone, full_name, completion_pct, last_login_at, application_status, loan_purpose, occupancy, loan_amount, property_address, scenario_type, started_at, documents_uploaded, missing_items`.
- New SECURITY DEFINER RPC `search_portal_applicants(_email, _phone, _name)` ranked the same way as `find_person_matches`.
- New SECURITY DEFINER RPC `convert_portal_applicant_to_lead(_portal_user_id)` that:
  1. Resolves or creates a `people` row (reuses `find_person_matches` first — never duplicates).
  2. Reuses an existing lead for that person if one exists; otherwise inserts a new lead linked via `person_id` and `portal_account_id` (new nullable column on `leads`).
  3. Writes a `person_audit_log` entry and a `timeline_events` row (lands in 2B; insert is no-op until table exists).

### Frontend
- Extend `src/lib/people/lookup.ts → searchBorrowers` to call the new portal RPC and return enriched fields on `LookupResult.meta`.
- Enrich `BorrowerLookupDropdown`: portal rows show completion %, last login, loan purpose, property address, and a "Convert to Lead" inline action.
- New `PortalIntelligencePanel` component on the lead detail right rail showing portal status / completion / last login / docs uploaded / missing items / "Open application" link. Only renders when `lead.portal_account_id` is set.

---

## Phase 2B — Unified Timeline (with historical backfill)

### New table
```text
timeline_events
  id              uuid pk
  person_id       uuid  (indexed)
  lead_id         uuid  (indexed, nullable)
  opportunity_id  uuid  (nullable)
  application_id  uuid  (nullable)
  event_type      text  (enum-like, indexed)
  event_source    text  ('crm' | 'portal' | 'system' | 'lead' | 'deal' | 'mortgage')
  title           text
  description     text
  metadata        jsonb
  actor_id        uuid  (nullable)
  created_at      timestamptz
```
Indexes on `(person_id, created_at desc)`, `(lead_id, created_at desc)`, `(event_type)`. RLS: read scoped to records the user can already see (reuse `user_owns_lead`, `is_admin`, `is_portal_user_for_deal`). Insert restricted to `service_role` + SECURITY DEFINER functions.

### Event types (initial set)
`LEAD_CREATED, LEAD_UPDATED, LEAD_STAGE_CHANGED, LEAD_ASSIGNED, DEAL_CREATED, DEAL_STAGE_CHANGED, NOTE_ADDED, TASK_CREATED, TASK_COMPLETED, CALL_LOGGED, MEETING_LOGGED, PORTAL_INVITE_SENT, PORTAL_LOGIN, APPLICATION_STARTED, APPLICATION_SUBMITTED, DOCUMENT_UPLOADED, DUPLICATE_PREVENTED, LEAD_CREATED_FROM_PERSON, PORTAL_APPLICANT_CONVERTED, SNAPSHOT_GENERATED, LOS_EXPORT_GENERATED`.

### Backfill (one-time, in the migration)
Insert from, preserving original `created_at` and actor where available, deduped on `(event_type, lead_id, ref_id)`:
- `crm_activities` → `NOTE_ADDED` / `TASK_*` / `CALL_LOGGED` / `MEETING_LOGGED` based on `activity_type`
- `lead_stage_history` → `LEAD_STAGE_CHANGED`
- `deal_stage_history` → `DEAL_STAGE_CHANGED`
- `crm_notes` → `NOTE_ADDED` (skip if already covered by activity)
- `crm_tasks` → `TASK_CREATED` + `TASK_COMPLETED` when `completed_at` present
- `portal_invites` → `PORTAL_INVITE_SENT`
- `crm_attachments` → `DOCUMENT_UPLOADED`
- `leads` (initial row) → `LEAD_CREATED`

Excluded for v1: email logs, SMS, webhook/automation/debug logs.

### Forward writes (triggers, all SECURITY DEFINER)
- `after insert on crm_activities` → timeline row
- `after insert on lead_stage_history` / `deal_stage_history`
- `after insert on portal_invites`
- `after insert on crm_attachments`
- `after insert on leads` → `LEAD_CREATED`
- Explicit `timeline_log(...)` SQL helper called from `convert_person_to_lead`, the new `convert_portal_applicant_to_lead`, and snapshot generation.

### UI
Refactor `UnifiedTimelineTab` to read primarily from `timeline_events` (single query, paginated). Keep the existing union as a fallback only when the table is empty for a record. New filters map to event_source.

---

## Phase 2C — Mortgage Snapshot Auto-Population

### New table
```text
mortgage_snapshots
  id, person_id (unique), lead_id, opportunity_id, application_id,
  loan_purpose, occupancy, property_type, loan_program, loan_amount,
  property_address, purchase_price, estimated_value,
  down_payment, ltv, dti, income_monthly,
  completion_pct, application_started_at, application_updated_at,
  assigned_lo_id, created_at, updated_at
```
One snapshot per person; upsert by `person_id`.

### Generation
- SECURITY DEFINER function `generate_mortgage_snapshot(_person_id)` that pulls from portal application data, latest `loan_scenarios`, `mortgage_profiles`, and the linked lead, then upserts.
- Triggers on `loan_scenarios`, `mortgage_profiles`, portal application updates, and `convert_portal_applicant_to_lead` call the function and emit a `SNAPSHOT_GENERATED` timeline event.

### UI
- `MortgageSnapshotCard` component shown on Lead Detail, Opportunity Detail, and Application Detail. Read-only summary with "Regenerate" button (calls the RPC).

---

## Sequencing & verification

1. **Ship 2A** → manual check: portal lookup returns enriched cards, "Convert" creates a lead linked by `person_id` + `portal_account_id`, no duplicate person rows.
2. **Ship 2B** → migration runs backfill; spot-check counts vs source tables; confirm timeline UI renders historical events and new actions land in `timeline_events`.
3. **Ship 2C** → trigger by converting a portal applicant; confirm snapshot appears on lead and opportunity, regenerates on scenario change.

Phase 2D (Wizard) is intentionally deferred per current memory.

---

## Technical notes

- All new public tables include the standard 4-step migration (CREATE → GRANT → RLS → POLICY) with `service_role` grants since SECURITY DEFINER functions and triggers write to them.
- New columns: `leads.portal_account_id uuid null`, indexed.
- RPCs: `search_portal_applicants`, `convert_portal_applicant_to_lead`, `generate_mortgage_snapshot`, `timeline_log` (internal).
- No edits to `src/integrations/supabase/client.ts` / `types.ts` / `.env` / `supabase/config.toml`.
- `BorrowerLookupDropdown`, `SmartLeadForm`, and `UnifiedTimelineTab` are the only existing UI surfaces touched in 2A/2B; 2C adds one new card to three detail screens.
