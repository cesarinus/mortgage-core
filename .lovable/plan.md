# Opportunity & Lead Workspace UX Cleanup

A multi-issue UX refinement sprint. No changes to lifecycle engine, integrity framework, or Opportunity data model — presentation layer only.

## Phase 1 — Audit (read-only, no code changes)

Produce written reports under `/mnt/documents/mortgage-core/ux-cleanup/`:

1. **`01_duplicate_data_report.md`** — diff fields rendered by `MortgageSnapshotCard`, `ChallengesCard`, `PositiveSignalsCard`, `MortgageMetricsCard`. Identify every overlap (credit, DTI, LTV, loan amount, doc completion, etc.).
2. **`02_opportunity_table_mapping.md`** — list each column in the Opportunities table, its current binding, the canonical source in `pipeline_opportunities` / `opportunity_context_view`, and why it renders blank.
3. **`03_action_menu_audit.md`** — compare row actions on Leads, People, Opportunities, Companies. List missing actions per entity.
4. **`04_workspace_density_review.md`** — map every card in `OpportunityWorkspace` left/center/right regions to the question it answers; flag overlap.
5. **`05_legacy_dependency_report.md`** — grep for `deals_legacy`, `deal_to_opportunity`, legacy adapters in workspace/table code; list remaining reads.
6. **`06_regression_risk.md`** — list components touched, blast radius, and validation steps.

## Phase 2 — Mortgage Snapshot Consolidation

Apply the ownership matrix below; remove duplicate fields from each component. Single source of truth per data element.

- **Mortgage Snapshot (right sidebar):** Credit Score, DTI, LTV, Loan Type, Loan Amount, Property Type, Borrower Count only.
- **Challenges:** risk flags only (High DTI, Low Credit, Missing Docs, Large CTC, Employment Gaps).
- **Positive Signals:** strengths only (Strong Credit, Low DTI, Large Down Payment, Reserves, Stable Employment).
- **Mortgage Metrics:** retire or fold into Snapshot if fully duplicate.

## Phase 3 — Shared `RecordActionMenu`

New `src/components/crm/RecordActionMenu.tsx`:

- Config-driven: takes `entityType`, record object, `availableActions[]`, optional permissions.
- Built-in actions: `open`, `edit`, `copyEmail`, `copyPhone`, `copyAddress`, `createTask`, `addNote`, `sendEmail`, `viewTimeline`, `openWorkspace`.
- Each action is a registered handler keyed by entity type; entity-agnostic UI (dropdown-menu).
- Toast feedback via existing `useToast`.

Wire into:
- Leads table (replace existing inline menu).
- Opportunities table (new — gain parity with Leads).
- People / Companies tables (replace inline menus if present).

## Phase 4 — Opportunity Table Data Fix

For each blank column identified in the audit:
- Repoint query/select to `opportunity_context_view` or correct `pipeline_opportunities` column.
- Add null-safe rendering (`—` fallback).
- Confirm sort + filter still work via existing table component.

## Phase 5 — Workspace Density

Reorganize `OpportunityWorkspace` regions per the ownership matrix:
- **Left:** identity (Borrower, LO, Stage, Status).
- **Center:** work (Tasks, Timeline, Notes, Conditions tabs — current structure mostly fits).
- **Right:** insights (Mortgage Snapshot, Health, AI Insights).
Remove cards that duplicate region intent.

## Phase 6 — Validation

After each phase:
- `tsgo` typecheck (auto).
- Visual spot-check via Playwright on `/opportunities/:id` and `/crm/leads` table.
- Confirm no console errors, no blank cells in tables for seeded records.

## Technical details

- Files likely touched: `src/components/crm/MortgageSnapshotCard.tsx`, `Challenges*`, `PositiveSignals*`, `MortgageMetrics*`, `src/pages/Pipeline.tsx` (Opps table), `src/pages/Leads.tsx`, `src/pages/crm/OpportunityWorkspace.tsx`, new `src/components/crm/RecordActionMenu.tsx`.
- No migrations. No edge function changes. No schema changes.
- Reuse: `dropdown-menu`, `useToast`, existing query helpers in `src/lib/crm/queries.ts`.

## Out of scope

- Lifecycle engine, integrity scans, `opportunity_events` bus.
- Schema or RLS changes.
- Backend logic — presentation only.
