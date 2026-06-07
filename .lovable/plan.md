# Loan Conditions & Income Calculation Module

Additive build on top of the migration you provided. Before I implement, a few things in your SQL need adjustment — flagged below — otherwise the tables will be unreachable from the app.

## 1. Migration corrections (must run before UI work)

Your SQL creates the tables but omits required Lovable Cloud setup. I'll run a follow-up migration that:

- Adds `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` and `GRANT ALL ... TO service_role` on both new tables (PostgREST returns permission errors without this).
- Enables RLS and adds policies mirroring the existing `leads` ownership model: `is_admin()` full access; owners (via `user_owns_lead(lead_id)`) can read/insert/update/delete their own rows. Borrowers reading via portal: `is_portal_user_for_deal()` for read.
- Adds the `ocr_log jsonb` column on `borrower_income_calculations` (referenced in section E of your prompt but missing from the CREATE TABLE).
- Adds `updated_at` trigger using existing `public.update_updated_at_column()`.
- Keeps the seed `INSERT ... WHERE false` statements as-is (they are no-ops by design — the real seeding happens in the trigger).
- The trigger function gets `SECURITY DEFINER` + `SET search_path = public` to match project conventions.

I will NOT touch your existing trigger logic or column names — purely additive.

## 2. UI placement

The "Pipeline detail page" in this codebase is `src/pages/crm/RecordWorkspace.tsx` (route `/crm/leads/:id`, also reached from the Pipeline). It already has tabs: Catch-up, Activities, Scenarios, Messages, Tasks, Documents, Emails, Relationships.

- New **Conditions** tab inserted between Tasks and Documents (closest to "between Financials and Documents" — there is no standalone Financials tab; financials live inside the left rail / scenarios area).
- New **Income** card added to the left rail (`LeftRail.tsx`) under existing financial summary.

## 3. New files

```text
src/components/crm/tabs/ConditionsTab.tsx        # grouped checklist UI
src/components/crm/conditions/ConditionRow.tsx   # row + status dropdown
src/components/crm/conditions/MarkReceivedDrawer.tsx  # received_at, via, notes, upload
src/components/crm/IncomeCard.tsx                # left-rail income editor
src/lib/crm/conditions.ts                        # queries + mutations
src/lib/crm/income.ts                            # upsert + calc helper
supabase/functions/calculate-income/index.ts     # edge function
```

Portal: add `src/pages/portal/PortalIncome.tsx` + route in portal layout, reusing `IncomeCard` in editable mode with a one-time borrower_type prompt.

## 4. Conditions tab behavior

- Loads `loan_conditions` for current `lead_id`, grouped by `category` (Income, Asset, ID, Liability, Other).
- Each row: title, required badge, status dropdown (`pending` | `received` | `waived`), "Mark complete" button.
- Mark complete → `MarkReceivedDrawer` (shadcn Sheet): received_at (default today), received_via select, notes textarea, optional file upload to existing `crm-documents` bucket at path `conditions/{lead_id}/{condition_id}/{filename}`.
- Save writes `status='received'`, `received_at`, `received_via`, `document_url`, `document_name`, `source='manual'`.
- If saved row's `category='income'`, invoke edge function `calculate-income` with `{ lead_id }`, show sonner loading→success toast, refetch Income card.

## 5. Income card behavior

- Fields: `borrower_type` select, numeric inputs for base_income, overtime, bonus, commission, self_employment_income, other_income.
- On blur: monthly = sum, annual = monthly * 12 (displayed read-only).
- Save button upserts `borrower_income_calculations` keyed by `lead_id` (latest snapshot; we insert a new row per save so history is preserved — query uses `order by calculation_date desc limit 1`).
- Shows `source` badge (manual / auto) and breakdown list.

## 6. Edge function `calculate-income`

- POST `{ lead_id }`, validates with zod, uses inline `corsHeaders`, validates JWT in code.
- Reads `loan_conditions` where `lead_id=$1 AND category='income' AND status='received'`.
- Reads latest `borrower_income_calculations` for the lead.
- Returns `{ calculation, income_conditions }`. No mutation yet — Path A is manual entry; this endpoint exists so Path B (OCR) can later overwrite via the same surface.

## 7. Path B reservation

- All client writes go through `src/lib/crm/income.ts` which calls the edge function for reads. The UI never reads `borrower_income_calculations` directly (except as a fallback hydrate). This lets us later add OCR processing inside the edge function without touching components.
- `ocr_log`, `ocr_status`, `source`, `ocr_raw` columns left untouched; no UI surfaces them.

## 8. Style

- shadcn/ui components (Sheet, Select, Input, Badge, Button, Card).
- Reuses existing tokens (warm orange accent, dark mode) — no new colors.
- Status strings lowercase throughout.
- No changes to existing tabs, deals, leads schema, or RLS.

## Open question

Your migration uses `pipeline_opportunities` for the FK and trigger, which matches `src/pages/Pipeline.tsx`. Confirm this is the table you want — there is also a separate `deals` table in the schema. I'll proceed with `pipeline_opportunities` as written.
