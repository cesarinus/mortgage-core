## Goal
Expand the Income Analysis module to cover the full page width with a single-row, two-column layout:
- Left column: Borrowers chips + selected-borrower summary + multi-borrower summary table.
- Right column: AI Analysis (full height of the row).

Apply this on both the Lead detail page and the Deal workspace, matching style.

## Scope — UI only
No backend, no data logic changes. Reuses `LeadIncomeSection`, `IncomeAiAnalysis`, `CatchUpTab` income card.

## Changes

### 1. `src/pages/Leads.tsx`
- Widen the Lead Sheet from `sm:max-w-2xl` to a near full-page width: `w-full sm:max-w-[95vw] lg:max-w-[1400px]` so the 2-column Income Analysis has room to breathe.
- Keep all other sections (quick info, tags, timeline) stacked above/below; only the Income block becomes wide.

### 2. `src/components/crm/LeadIncomeSection.tsx`
Restructure inner layout:
- Header row unchanged.
- Body becomes a `grid grid-cols-1 lg:grid-cols-2 gap-4` (one row on `lg+`, stacks on mobile/tablet).
- **Left column** (`min-w-0 space-y-4`):
  - Borrowers chip row.
  - Selected-borrower summary panel (Monthly / Annual / Years Avg).
  - Multi-borrower Income Summary table (only when >1 borrower).
- **Right column** (`min-w-0`):
  - `<IncomeAiAnalysis leadId={leadId} wide audience="admin" />` stretched with `h-full` so the AI card fills the row height.
- Add `lg:items-stretch` on the grid and `h-full flex flex-col` on the AI wrapper so the right card matches the left column height.

### 3. `src/components/crm/tabs/CatchUpTab.tsx` (Deal workspace)
Mirror the same 2-column layout in the existing Income Analysis `<Card>`:
- Replace current internal grid with: borrowers chips on top (full width), then `grid grid-cols-1 lg:grid-cols-2 gap-4 lg:items-stretch`.
  - Left column: selected-borrower summary panel + multi-borrower summary table.
  - Right column: AI Analysis (`<IncomeAiAnalysis wide />`) with `h-full`.
- Card already spans full tab width; no wrapper width change needed.
- Keep `min-w-0` on grid children to prevent overflow.

### 4. Styling
- All tokens (`bg-card`, `bg-muted/40`, `border-border`, `text-[#F97316]`).
- `min-w-0` + `overflow-hidden` on flex/grid children with horizontal content.
- AI tabs keep horizontally-scrollable pill bar via existing `wide` prop.

## Out of scope
- Income calculations, edge functions, borrower resolution.
- Portal income view.
- People / Companies pages.

## Files touched
- `src/pages/Leads.tsx` — widen Lead Sheet.
- `src/components/crm/LeadIncomeSection.tsx` — 2-column grid, AI on right.
- `src/components/crm/tabs/CatchUpTab.tsx` — same 2-column layout in Deal card.

## Verification
- Open lead with 3 borrowers: sheet covers most of page, Income shows summary/table left, AI right, no overflow at 1440 and 1920.
- Open deal workspace Catch-Up: Income Analysis card spans tab width, 2 columns, AI right.
- At <`lg` width, columns stack cleanly.
