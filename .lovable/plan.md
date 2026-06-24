
# Mortgage Core – Lifecycle Consolidation (Option C, Opportunity-Canonical)

Canonical entity: **Opportunity** (table `pipeline_opportunities`). `deals` becomes a backward-compat view. Zero React page edits on cutover day. Every step is additive and reversible until Phase F.

---

## Stage 0 — Safety & Snapshots (no schema changes)

Produce a single audit bundle under `/mnt/documents/lifecycle-consolidation/`:

- `snapshot_schema.sql` — `pg_dump --schema-only` of `public`.
- `snapshot_deals.csv`, `snapshot_pipeline_opportunities.csv`, `snapshot_deal_documents.csv`, `snapshot_deal_stage_history.csv`, `snapshot_loan_conditions.csv`, `snapshot_crm_field_values.csv` (filtered to lifecycle entities), `snapshot_los_sync_queue.csv`, `snapshot_tasks.csv`.
- `relationship_map.md` — FK graph for the 4 lifecycle entities + children.
- `field_map_deals_to_opportunities.md` — column-by-column mapping table (gaps highlighted).
- `code_dependency_map.md` — every `from("deals")`, `from("pipeline_opportunities")`, `deal_id`, `opportunity_id` reference, with file:line.
- `rollback.sql` — per-migration DOWN scripts saved alongside each UP.

No code or schema mutations in this stage.

---

## Stage A — Extend `pipeline_opportunities` (additive only)

One migration adding the columns needed to absorb `deals`:

- `lead_id uuid` (already present — verify)
- `contact_id uuid REFERENCES contacts(id)` — for legacy deals tied to a contact, not a lead
- `loan_officer_id uuid`
- `created_by uuid`
- `loan_amount numeric`, `loan_type text`, `property_address text`, `interest_rate numeric`, `close_date date`, `notes text`, `name text` — any missing from current schema
- `legacy_deal_id uuid UNIQUE` — provenance pointer for back-mapping
- `source_system text DEFAULT 'opportunity'` (`'opportunity' | 'deal_migrated'`)

No drops. No renames. RLS policies extended only where new columns require it (e.g. allow access via `contact_id` ownership the same way `deals` does today).

---

## Stage B — Canonical Stage Lifecycle

New table `lifecycle_stages` (single source of truth) seeded with:

```
prospect, application_started, application_submitted, processing,
underwriting, conditional_approval, clear_to_close, funded, lost
```

Columns: `key`, `label`, `sort`, `is_terminal`, `color`, `probability_pct`, `expected_days`.

Add `pipeline_opportunities.lifecycle_stage text` (nullable initially). Backfill from existing `stage` via a deterministic mapping function `map_legacy_stage(text) → text`:

| Legacy (deal_stage / pipeline) | Canonical |
|---|---|
| application_sent, application_started | application_submitted |
| underwriting | underwriting |
| approved | conditional_approval |
| clear_to_close | clear_to_close |
| closed, funded | funded |
| lost | lost |
| (lead-only stages) | prospect |

`pipeline_stages` table is kept but marked `legacy = true`; admin UI starts reading `lifecycle_stages`. State machine in `src/lib/crm/stateMachine.ts` gets a new `lifecycle` entity type alongside existing `deal`/`lead`; old types remain functional.

---

## Stage C — Data Migration: deals → pipeline_opportunities

One idempotent migration:

1. For each row in `deals` with no matching `pipeline_opportunities.legacy_deal_id`, insert a new opportunity copying mapped fields and storing `legacy_deal_id = deals.id`, `source_system = 'deal_migrated'`, `lifecycle_stage = map_legacy_stage(deals.stage)`.
2. Build a `deal_to_opportunity` mapping table (`deal_id PK`, `opportunity_id`) for FK rewiring and rollback.
3. Re-point child rows by adding `opportunity_id` to children that today only have `deal_id`: `deal_documents`, `deal_stage_history`, `deal_events`, `tasks` (already has both — backfill where null), `crm_field_values` (remap `record_type='deals'` → `record_type='opportunities'`, `record_id` via the map). All done with `UPDATE … FROM deal_to_opportunity`. Original `deal_id` columns are **kept** for rollback.
4. Verification queries written to `/mnt/documents/lifecycle-consolidation/migration_report.md`: row counts before/after, orphan check, stage distribution, sample diffs.

Zero rows deleted. Fully reversible by truncating rows where `source_system='deal_migrated'` and dropping the mapping table.

---

## Stage D — Compatibility Layer

Replace `deals` **table** with a `deals` **view** in two sub-steps to stay reversible:

D1. Rename `deals` → `deals_legacy` (kept as physical table, read-only triggers added).
D2. Create `CREATE VIEW public.deals AS SELECT … FROM pipeline_opportunities WHERE source_system IN ('deal_migrated','opportunity')` exposing the exact column set the existing app expects (id = `legacy_deal_id` when present, else opportunity id; stage = legacy form via `map_canonical_to_legacy_stage`).
D3. `INSTEAD OF INSERT/UPDATE/DELETE` triggers on the view that write through to `pipeline_opportunities`, so existing code paths (Dashboard, TasksWidget, RecordWorkspace, queries.ts `fetchDeals`, etc.) keep working unmodified.

Smoke-test surface that **must** keep working untouched:
- `src/pages/Dashboard.tsx`, `src/components/dashboard/TasksWidget.tsx`
- `src/pages/Pipeline.tsx`, `src/pages/crm/RecordWorkspace.tsx`
- `src/lib/crm/queries.ts` (`fetchDeals`)
- `src/lib/tasks/api.ts`, `src/components/tasks/*`
- Portal pages, LOS sync (`los_sync_queue`, `loan_conditions`)
- Timeline triggers (`tlg_deal_stage`, `tlg_task_event`, etc.)

---

## Stage E — CRM Fields Cleanup (non-destructive)

- Mark `crm_modules` rows for `applications` and `loans` as `is_active=false` (don't delete).
- Rename `opportunities` module label to "Opportunity" and ensure `entity_table='pipeline_opportunities'`.
- Remap any `crm_field_values.record_type='deals'` rows already covered in Stage C step 3.
- Field history preserved 1:1.

---

## Stage F — Self-Healing Integrity Layer

New tables (all RLS-protected, admin-only read):

- `entity_registry(entity_key, table_name, canonical, parent_entity, is_active)` — seeded with the canonical map.
- `system_integrity_checks(id, check_key, severity, last_run_at, status, summary, details jsonb)`.
- `entity_health_report(id, run_at, entity_key, issue_type, record_id, details jsonb, resolved_at)`.

Edge function `integrity-scan` (cron nightly) runs:
1. **Orphans**: tasks/notes/documents/conditions/los_loans with no resolvable opportunity.
2. **Duplicates**: same `(lead_id, property_address, loan_amount)` within 30 days.
3. **Stage integrity**: detect transitions violating allowlist; flag `funded → *` reversals.
4. **Schema governance**: `crm_modules` rows with no backing table or zero fields; duplicate stage definitions; modules flagged active but `is_active=false` in registry.

Admin UI: new `Settings → System Integrity` page surfacing the report (separate change, not blocking).

---

## Stage G — Final Cutover (deferred, only after ≥2 weeks of green integrity scans)

- Migrate the ~6 known React reads off the `deals` view to `pipeline_opportunities` directly.
- Drop the `deals` view + `deals_legacy` table + `deal_id` columns on children.
- Drop `deal_stage` enum.
- This stage is out of scope for this plan — gated on user approval after stabilization.

---

## Deliverables produced by this plan

1. `migration_report.md` (Stage 0 + Stage C output)
2. SQL migrations: `A_extend_opportunities.sql`, `B_lifecycle_stages.sql`, `C_migrate_deals.sql`, `D_compat_view.sql`, `E_crm_fields_cleanup.sql`, `F_integrity_layer.sql` — each with paired `*_rollback.sql`.
3. Updated `relationship_map.md` (post-migration).
4. Risk assessment + tech-debt reduction summary (1 table eliminated as concept, 4 stage sources → 1, 2 phantom modules deactivated).
5. Edge function `supabase/functions/integrity-scan/index.ts`.

---

## Mandatory invariants (verified at every stage)

- Every migration ships with rollback SQL.
- No `DROP TABLE`, no `DROP COLUMN`, no destructive `UPDATE` without a mapping table in Stages A–F.
- `deals_legacy` retained until Stage G.
- Row-count parity check after Stage C: `count(deals_legacy) == count(pipeline_opportunities WHERE source_system='deal_migrated')`.
- Smoke test: load Dashboard, Pipeline, a RecordWorkspace, and create a Task after each stage.

---

## Approval requested

Confirm to proceed and I will execute **Stage 0 → Stage F** sequentially, pausing after each migration for review. Stage G stays gated.
