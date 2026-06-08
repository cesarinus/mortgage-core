## Goal
Fix the Income Analysis card so multi-borrower data (selector, summary table, AI tabs) stays inside the card, and expand the section to fit the page width. Apply the same treatment globally (Deal workspace and Leads detail panel).

## Scope — additive UI only
No backend, no data logic, no schema changes. Reuses existing data (`borrowers`, `allIncome`, `IncomeAiAnalysis`).

## Changes

### 1. `src/components/crm/tabs/CatchUpTab.tsx` (Deal workspace)
Restructure the Income Analysis `<Card>` to follow the approved v2 layout:
- Header: title + description on left, "Borrower Income Classification" button on right, wraps on narrow widths (`flex-wrap`).
- Borrowers row: keep existing chip buttons, no overflow.
- Two-column grid on `lg:` (stacks on mobile):
  - Left: selected-borrower summary panel (Monthly / Annual / Years Avg) in a muted rounded panel.
  - Right: "Borrower Income Summary" table in a bordered rounded panel with Total row.
- AI Analysis section wrapped in a full-width container; pass a new `wide` prop so the inner card uses horizontally-scrollable tabs (`overflow-x-auto`, `whitespace-nowrap`, `flex-none` triggers) instead of the current `TabsList` that overflows.
- Remove the redundant single-borrower summary panel when only the primary exists (already covered by the new left column).
- The outer Card already spans full width of the tab content, so no width hack needed — just ensure inner blocks use `min-w-0` to prevent flex children from forcing overflow.

### 2. `src/components/crm/IncomeAiAnalysis.tsx`
Add optional `wide?: boolean` prop. When true:
- Replace `Tabs/TabsList` with a horizontally scrollable pill bar (`flex overflow-x-auto gap-1 p-1 bg-muted/40 rounded-xl`, each tab `flex-none whitespace-nowrap`).
- Keep all existing data, AiFeedback, highlights, suggestions, risk flags.
- Default behavior unchanged for portal/borrower audience.

### 3. `src/pages/Leads.tsx` (Leads side panel)
Today the Lead Sheet (`SheetContent w-full sm:max-w-md`) shows quick info + tags + timeline but does not include income analysis. Add a new "Income Analysis" section near the bottom (above the Activity Timeline) that mounts the same building blocks used on the Deal page:
- Widen the sheet to `sm:max-w-2xl` so the expanded layout fits.
- Render a compact version of the new layout: borrower chips, summary table, and `<IncomeAiAnalysis leadId={selectedLead.id} wide />`.
- Reuse `fetchDealBorrowers` + `fetchAllLatestIncome` (already used in CatchUpTab) — wrap in a small local effect keyed to `selectedLead?.id`.

### 4. Styling
- All colors via existing tokens (`bg-card`, `bg-muted/40`, `border-border`, `text-[#F97316]` already in code) — no new CSS variables.
- Use `min-w-0` and `overflow-hidden` on flex/grid children that contain horizontal lists to prevent the overflow reported in the screenshot.

## Out of scope
- Income calculation logic, edge functions, borrower resolution.
- Portal income view (already separate, no overflow issue).
- People / Companies pages.

## Files touched
- `src/components/crm/tabs/CatchUpTab.tsx` — restructure Income Analysis card.
- `src/components/crm/IncomeAiAnalysis.tsx` — add `wide` prop with scrollable tabs.
- `src/pages/Leads.tsx` — widen lead sheet + embed Income Analysis block.

## Verification
- Open the deal with 3 borrowers (current route) and confirm no horizontal overflow at 1440 and 1024 widths.
- Open a lead in the Leads page side panel and confirm the same module renders cleanly.
- Confirm primary chip stays orange, co-borrower chips stay neutral, totals row still computes from `allIncome`.
