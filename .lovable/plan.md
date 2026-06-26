# Self-Employed Income Analysis Engine — Phased Plan

The attached **All-In-One Worksheet (Tax Year 2025)** has 7 tabs — SAM (444 rows), Summary, Liquidity (223 rows), Comparative (494 rows), P&L (383 rows), Help, Support — with hundreds of formulas, lookups (`LKP_MILEAGE`, etc.), and cross-sheet references. Replicating it faithfully is a large build that must be done in phases with QA after each, not a single shot. Mock data and simplified formulas are explicitly out of scope per your brief.

This plan splits the work into 6 phases. **Each phase ends at a working checkpoint** you can review before the next begins.

---

## Phase 0 — Worksheet Spec Extraction (no app code yet)

Deliverable: a machine-readable "calculation spec" derived directly from the workbook, committed to the repo and used as the single source of truth by every later phase.

- Walk every tab; export per-row: section, line number, IRS reference label, input vs computed, exact Excel formula, sign convention, add-back/deduct flag.
- Extract named ranges and lookup tables (`LKP_MILEAGE` 2023/2024/2025 rates, etc.).
- Produce: `docs/income-analysis/worksheet-spec.json` + a human-readable `worksheet-spec.md` mapping every Mortgage-Core field to its source cell.
- No formulas re-typed by hand — generated from the file so they match exactly.

## Phase 1 — Data Model & Migrations

Tables (all `public`, RLS + GRANTs, audit columns):
- `income_analysis_cases` (per opportunity, status, tax years analyzed)
- `income_analysis_businesses` (name, EIN, entity_type, ownership_pct, months_in_service, start_date)
- `income_analysis_tax_years` (case, business, year)
- `income_analysis_documents` (link to `crm_attachments`, detected form type, tax year)
- `income_analysis_extractions` (raw IRS line values keyed by `form_code` + `line_code` — preserves recalculation)
- `income_analysis_calculations` (computed per worksheet section, with input snapshot + formula version)
- `income_analysis_summaries` (per-borrower qualifying income roll-up)
- `income_analysis_audit_log`
- Add `income_type` enum + `income_sources jsonb` array on `leads` / borrower record (multiple sources allowed).

## Phase 2 — Calculation Engine (TypeScript, pure functions)

- `src/lib/income-analysis/engine/` — one module per template: `scheduleC`, `scheduleE`, `scheduleF`, `partnership1065`, `sCorp1120S`, `corp1120`, `interestDividends`, `capitalGains`.
- Each module loads its formula set from the Phase 0 spec, takes an `extractions` object, returns a `calculation` object identical to the worksheet subtotals.
- Mileage depreciation, non-recurring deductions, depletion/depreciation add-backs, meals exclusion, business-use-of-home, amortization, ownership %, months-in-service proration — all replicated literally.
- Liquidity engine: current ratio, quick ratio, working capital, rating.
- Comparative engine: YoY trend per metric with green/yellow/red thresholds taken from the workbook.
- Vitest suite: feed sample IRS values, assert each subtotal matches the workbook to the cent (golden-file tests generated from the workbook itself).

## Phase 3 — Document Extraction (AI)

- Edge function `extract-tax-document` (mirrors existing `extract-income-document` pattern, uses Lovable AI Gateway + Gemini vision).
- Classifies: 1040, Sch C/E/F, K-1 (1065/1120-S), 1065, 1120, 1120-S, W-2, P&L, Balance Sheet.
- Returns structured `extractions` keyed by form_code + line_code so engine can consume directly.
- Confidence + "needs review" flag; underwriter can correct values in UI; corrections feed `income_analysis_extractions`.

## Phase 4 — Loan-Officer Workspace UI

New section in OpportunityWorkspace → **Financial Analysis**, tabs:
1. Income Analyzer (per business, editable worksheet matching the workbook layout)
2. Tax Returns (uploaded docs + detected form + extracted values)
3. Business Analysis (per-entity drill-down)
4. Comparative Analysis (Y1 vs Y2, colored trends)
5. Liquidity Analysis
6. Cash Flow Summary
7. Underwriter Notes (auto-generated narrative, editable)

All numbers always trace back to a stored extraction and a versioned formula.

## Phase 5 — Borrower Portal Upload Flow

- Portal page: upload Tax Returns / W-2s / K-1s / P&L / Balance Sheet (categorized).
- Status panel only: Documents Received → Tax Forms Identified → Income Analysis Generated → Awaiting Loan Officer Review.
- No worksheet visibility to borrower.

## Phase 6 — Underwriter Narrative + Export

- Templated narrative generator (deterministic, not LLM) producing the example-style summary, editable in UI.
- PDF export of full analysis matching workbook layout for the loan file.

---

## Technical notes

- Engine is **data-driven from the workbook spec**, not hand-coded formulas — guarantees parity and lets you drop in a new tax year by re-running the extractor.
- All extracted IRS values stored raw + immutable; calculations are derived and versioned (formula_version column) so reruns are reproducible.
- No changes to existing Opportunity model; this is a new related domain.
- Estimated size: ~12–18 new files for engine, 8 new tables, 2 edge functions, ~10 UI components. Phases 0–2 are the heaviest; Phase 3+ reuse existing patterns.

## Confirmation needed before Phase 0

1. OK to proceed phase-by-phase with a review checkpoint after each? (vs. one mega-PR)
2. Confirm tax years in scope: **2024 + 2025** (matches the workbook's two-year columns)?
3. For W-2-only borrowers, should this engine just record `income_type='w2'` and defer to the existing income calculator, or also produce a summary line here?
