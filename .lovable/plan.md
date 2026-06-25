# Opportunity Data Recovery, Edit, and Safe Delete

A multi-phase remediation. Audit-first, then schema additions, then UI. No destructive changes to the Opportunity model — only additive fields (`status`, `deleted_at`, `deleted_by`) and recovery RPCs.

## Phase 1 — Data Audit (read-only)

Run SQL audits against `pipeline_opportunities`, `opportunity_context_view`, `leads`, `people`, `contacts`, `lead_contacts`, legacy `deals_legacy` + `deal_to_opportunity`. Output written to `/mnt/documents/mortgage-core/opps-recovery/`:

1. `01_field_coverage.md` — per-opportunity report: missing name, missing borrower, missing loan_amount, missing property, with source-data availability flags (migration vs UI vs source-empty).
2. `02_classification.md` — every opportunity labeled **Valid / Incomplete / Orphan / Migration Artifact** with counts.
3. `03_binding_diagnostics.md` — diff between what `pipeline_opportunities` row contains, what `opportunity_context_view` returns, and what the table currently renders. Pinpoints which "Untitled" rows are data-empty vs binding-broken.

## Phase 2 — Schema: Soft Delete + Provenance

Single additive migration:

- `pipeline_opportunities.status` (text, default `'active'`, check in `'active'|'archived'`)
- `pipeline_opportunities.deleted_at` (timestamptz, null)
- `pipeline_opportunities.deleted_by` (uuid, null)
- `pipeline_opportunities.archived_reason` (text, null)
- Partial index on `status = 'active'` for table queries.
- RPC `opportunity_dependency_counts(_opp_id uuid)` returning `{tasks, notes, activities, documents, conditions, los_records, timeline_events, custom_fields}`.
- RPC `archive_opportunity(_opp_id uuid, _reason text)` — sets status/deleted_at/deleted_by, writes `opportunity_events` + `timeline_events`.
- RPC `restore_opportunity(_opp_id uuid)` — reverses archive.
- RPC `hard_delete_opportunity(_opp_id uuid)` — refuses if dependency counts > 0; otherwise deletes and logs.
- RPC `repair_opportunity_data()` — backfills `name`, links missing borrower from lead/people, copies `loan_amount` from `mortgage_snapshots` / `loan_scenarios` when null and confidence is high; returns a JSON repair report.

All RPCs `security definer`, `set search_path = public`, gated on `has_role(auth.uid(),'admin'|'loan_officer')`.

## Phase 3 — Table Binding Fix

`src/pages/Pipeline.tsx`:

- Filter rows to `status = 'active'` by default; add an "Archived" toggle.
- Name resolution hierarchy already added (Lead → Primary contact). Extend to also fall back to Property Address, then a final neutral `"—"` (never "Untitled").
- Primary Contact column: resolve from `borrower_contact_id → contacts`, then `lead_contacts`, then lead; render `—` if none.
- Loan Amount: read from `pipeline_opportunities.loan_amount`, fall back to `opportunity_context_view.loan_amount`, format via `formatCurrency`.
- Property: always render `opportunity_context_view.property_address`.

## Phase 4 — Edit Opportunity (slide-over)

New `src/components/crm/OpportunityEditSheet.tsx`:

- shadcn `Sheet` slide-over.
- Fields: name, stage (select from `pipeline_stages`), borrower (people picker), loan amount, loan type, property address, title company, lender, close date, assigned user, custom fields region (existing `crm_field_values` editor).
- Update via `pipeline_opportunities` update; writes `opportunity_events` (`edited`).

## Phase 5 — Safe Delete Flow

New `src/components/crm/OpportunityDeleteDialog.tsx`:

- On open: call `opportunity_dependency_counts`.
- If all zero → "Safe to delete" with confirm → `hard_delete_opportunity`.
- If any > 0 → show dependency summary and offer **Archive Instead** → `archive_opportunity` with optional reason.
- Toast feedback, refetch table.

## Phase 6 — RecordActionMenu Standardization

Extend `RecordActionMenu`:

- Add `archive` and `delete` action keys.
- New `onEdit`, `onArchive`, `onDelete` handlers wired in `Pipeline.tsx` and `OpportunityWorkspace.tsx`.
- Final opportunity menu: Open Workspace, Edit, Copy Email, Copy Phone, Copy Address, Create Task, Add Note, View Timeline, Archive, Delete.

## Phase 7 — Recovery Report

After `repair_opportunity_data()` runs, write `/mnt/documents/mortgage-core/opps-recovery/04_repair_report.md` summarizing fields recovered, rows touched, rows still incomplete.

## Out of Scope

- Lifecycle engine, integrity scans, RLS model changes beyond what's required for new RPCs.
- Cascading destructive deletes — explicitly forbidden.
- Touching `auth`, `storage`, `realtime`.

## Technical Notes

- Files touched: `src/pages/Pipeline.tsx`, `src/pages/crm/OpportunityWorkspace.tsx`, `src/components/crm/RecordActionMenu.tsx`, new `OpportunityEditSheet.tsx`, new `OpportunityDeleteDialog.tsx`, new SQL migration.
- Reuses: `dropdown-menu`, `sheet`, `alert-dialog`, `useToast`, existing people/contact pickers, `formatCurrency`.
- Validation per phase: `tsgo`, Playwright spot-check on `/pipeline` and `/opportunities/:id`, manual audit-report review before any data mutation runs.

Approve to proceed. I'll execute Phase 1 (audit only, no mutations) first and return the reports before touching schema.
