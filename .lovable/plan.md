# Mortgage Core – Phases G → K Execution Plan

This continues the lifecycle consolidation work. Phases A–F shipped: `pipeline_opportunities` is extended, `lifecycle_stages` seeded, `deals` is a compat view over `pipeline_opportunities`, and the self-healing integrity layer (`entity_registry`, `system_integrity_checks`, `entity_health_report`, `run_integrity_scan()` + nightly cron) is live.

Phases G–K finish the canonicalization, build the lifecycle engine, add mortgage-specific integrity, deliver the unified Opportunity workspace, and stand up the AI context layer. Each phase produces audit artifacts in `/mnt/documents/mortgage-core/` and ships its own rollback SQL. Nothing destructive lands until Phase G's deferred cleanup, which stays gated behind two weeks of green integrity scans (carry-over of the Stage G rule).

---

## Phase G — Opportunity Consolidation

**G1. Schema diff report** → `/mnt/documents/mortgage-core/G1_field_map.md`
Column-by-column comparison of `deals_legacy` vs `pipeline_opportunities`. Each row: field name, source table, target column, migration strategy (already-migrated / merge / deprecate / new), risk level. Produced by reading `information_schema.columns` and the Stage C `deal_to_opportunity` map.

**G2. Canonical Opportunity schema (additive migration)**
One migration adding any gaps surfaced by G1 so Opportunity covers Purchase / Refi / HELOC / Cash-out / FHA / VA / Conv / USDA / Non-QM and is future-ready:
- `transaction_type text` (purchase | refinance | cash_out_refi | heloc)
- `loan_program text` (conventional | fha | va | usda | non_qm | jumbo | heloc)
- `occupancy_type text`, `property_type text`, `property_use text`
- `subject_property_value numeric`, `purchase_price numeric`, `down_payment numeric`, `ltv numeric`, `cltv numeric`, `dti numeric`
- `lock_status text`, `lock_expires_at timestamptz`, `rate_locked_at timestamptz`
- `los_loan_number text`, `los_status text`, `los_last_synced_at timestamptz`
- `funded_at timestamptz`, `lost_reason text`, `lost_at timestamptz`
- `health_score int`, `health_calculated_at timestamptz` (populated in Phase I)
All nullable. No drops, no renames.

**G3. Pre-cutover validation** → `/mnt/documents/mortgage-core/G3_validation.md`
- Row counts: `deals_legacy` vs `pipeline_opportunities WHERE source_system='deal_migrated'`
- FK comparison: child counts (`deal_documents`, `deal_stage_history`, `tasks`, `loan_conditions`, `los_sync_queue`) per parent
- Orphan scan via existing `run_integrity_scan()`
- Duplicate scan: `(lead_id, property_address, loan_amount)` within 30d

**G4. Canonicalization step**
- Mark `deals_legacy` triggers read-only (already done in Stage D)
- Add `entity_registry` flag `canonical=true` for `pipeline_opportunities`, `canonical=false` for `deals_legacy`
- Compat view + INSTEAD-OF triggers stay in place
- Deferred drop of `deals` view / `deals_legacy` / `deal_id` child columns / `deal_stage` enum stays gated (Stage G rule from plan).

---

## Phase H — Mortgage Lifecycle Engine

**H1. Canonical lifecycle** — `lifecycle_stages` already seeded in Stage B with the 9 stages. Verify; add any missing rows.

**H2. Stage metadata** — extend `lifecycle_stages` (additive):
- `required_fields jsonb` (array of opportunity column names)
- `required_documents jsonb` (array of `stage_documents.key`)
- `automation_triggers jsonb` (array of event names)
- existing: `color`, `sort`, `is_terminal`, `probability_pct`, `expected_days`, `description`

**H3. Transition rules** — new table `lifecycle_transitions`:
- `from_stage text`, `to_stage text`, `is_allowed boolean`, `requires_override boolean`
- Seed full matrix (forbid `funded→*`, `ctc→application_started`, etc.)
- `lifecycle_override_log` table for admin overrides
- DB function `assert_lifecycle_transition(opp_id, from, to, actor, override_reason)` raising on invalid + writing override log
- Wire into existing `pipeline_opportunities` BEFORE UPDATE trigger

**H4. Lifecycle event bus** — new table `opportunity_events`:
- `event_type text` (`stage.changed`, `created`, `updated`, `document.added`, `condition.added`, `funded`)
- `opportunity_id uuid`, `payload jsonb`, `actor_id`, `created_at`
- AFTER UPDATE/INSERT triggers on `pipeline_opportunities` + child tables emit events
- Existing `pg_net` notify hooks (email triggers) keep working; this is additive

---

## Phase I — Mortgage Integrity Framework

Extends the Phase F integrity layer by inserting new rows into `system_integrity_checks`:

| check_key | severity | probe |
|---|---|---|
| `dup_loan_file_30d` | warning | same `(lead_id, property_address, loan_amount)` within 30d |
| `missing_primary_borrower` | critical | opportunity with no `contact_id` and no `lead.person_id` |
| `missing_property_address` | warning | non-prospect opportunity with NULL `property_address` |
| `stage_out_of_order` | critical | stage in {processing, underwriting, ctc} without prior `application_submitted` event in `deal_stage_history` |
| `los_status_mismatch` | warning | `los_status` ≠ expected map for `lifecycle_stage` |

**I6. Health score** — new function `recalc_opportunity_health(opp_id)` returning 0-100:
- Completeness (borrower, property, loan details): 40 pts
- Document completeness vs `required_documents`: 25 pts
- Open critical integrity issues: −20 pts each
- Stage consistency: 15 pts
- LOS sync freshness: 10 pts
- Wired into nightly scan; writes `pipeline_opportunities.health_score` + `health_calculated_at`

---

## Phase J — Opportunity Workspace

Frontend only. No schema changes.

**J1. Workspace shell** — `src/pages/crm/OpportunityWorkspace.tsx`
Single-page workspace with section tabs: Overview, Borrowers, Property, Loan Details, Tasks, Notes, Activities, Timeline, Documents, Conditions, Loan Scenarios, LOS Status, Custom Fields. Route `/opportunities/:id`. Reuses existing components from `RecordWorkspace.tsx`, `TasksWidget`, deal documents UI.

**J2. Related records panel** — sidebar showing Lead / People / Companies / Referral Partner / Loan Officer / Processor / Realtor / Title / Lender, sourced from `lead_contacts`, `crm_contact_companies`, `pipeline_opportunities.loan_officer_id`.

**J3. Unified timeline** — reads existing `timeline_events` (already aggregating activities/tasks/stage/notes/docs/emails/calls) filtered by `opportunity_id`. Adds LOS update events from new `opportunity_events` table.

**J4. Performance**
- React Query with `staleTime: 30s`
- Section data lazy-loaded per tab
- Timeline paginated (50/page, infinite scroll)
- Index audit: confirm `(opportunity_id, created_at desc)` on hot tables

---

## Phase K — AI Readiness Layer

**K1. `opportunity_context_view`** — Postgres VIEW (or materialized view if perf demands) joining opportunity + borrowers + lead + property + tasks (open) + notes (latest 10) + timeline (latest 25) + documents metadata + conditions + scenarios + los status + custom fields. SECURITY INVOKER + RLS-respecting.

**K2. `opportunity_summary(opp_id)`** — RPC returning JSON: `{ stage, open_tasks, pending_conditions, missing_documents, los_status, recent_activity[], health_score }`. Cheap, single round-trip, AI-shaped.

**K3. AI memory optimization** — `opportunity_context_view` deliberately denormalizes so an assistant fetches one row. Add `GRANT SELECT` to `authenticated`.

**K4. Event stream** — `opportunity_events` (Phase H4) is the canonical event log. Add a Realtime publication so AI agents can subscribe via Supabase Realtime without schema work. Document event shapes in `/mnt/documents/mortgage-core/K4_event_schemas.md`.

---

## Execution order & gates

1. Phase G migrations + report → pause for review
2. Phase H migrations → pause
3. Phase I check seeds + health function → pause
4. Phase J frontend → pause
5. Phase K view + RPC + realtime → pause
6. Stage G cleanup (drop legacy) stays gated until ≥2 weeks of green integrity scans + sign-off.

## Deliverables

Under `/mnt/documents/mortgage-core/`:
- `G1_field_map.md`, `G2_canonical_schema.sql`, `G3_validation.md`, `G4_canonicalization.md`
- `H_lifecycle_engine.md`
- `I_integrity_framework.md`
- `J_workspace_architecture.md`
- `K_ai_context.md`, `K4_event_schemas.md`
- `rollback/` with paired DOWN SQL per migration
- `risk_assessment.md`, `tech_debt_reduction.md`, `performance_impact.md`

## Invariants (unchanged from earlier phases)

- Every migration ships with rollback SQL
- No DROP TABLE / DROP COLUMN / destructive UPDATE
- `deals_legacy` retained through Phase K
- Row-count parity verified after each migration
- Smoke: Dashboard, Pipeline, RecordWorkspace, Tasks load + create after every phase

---

**Approval requested.** Confirm and I will execute G1 → K4 sequentially, pausing for review after each phase. The deferred legacy drop stays gated.
