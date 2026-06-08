## Goal

Make the **Income Analysis** card span the full page width (edge-to-edge across the workspace), instead of being constrained to the narrow center column. This applies to both the Lead workspace and the Pipeline deal workspace, since they share the same `RecordWorkspace` shell.

## Current layout

`src/pages/crm/RecordWorkspace.tsx` renders a 12-column grid:

```text
[ LeftRail col-3 ][ Main col-6 (tabs incl. CatchUpTab → Income Analysis) ][ RightRail col-3 ]
```

The Income Analysis card lives inside the center `col-span-6` main column, so it appears narrow with empty space on the left/right (visible in the screenshot).

## Proposed change (example before deploying)

Render the Income Analysis card **outside** the 3/6/3 grid as a full-width row, while keeping every other card (Inbound/Outbound, Lead health, Challenges/Positives, Mortgage snapshot) exactly where it is.

Resulting structure on the Catch Up tab:

```text
[ LeftRail col-3 ][ Main col-6: Inbound, Outbound, Health, Challenges, Mortgage snapshot ][ RightRail col-3 ]
[ ────────────── Income Analysis card — full width (col-span-12) ────────────── ]
[ Borrower Income Classification button + Borrowers pills row                    ]
[ Two-column grid: Selected borrower summary | Borrower Income Summary table     ]
[ AI Analysis (wide pill tabs, full width)                                        ]
```

### Technical details

1. **`src/components/crm/tabs/CatchUpTab.tsx`** — split the Income Analysis `<Card>` into its own exported subcomponent `IncomeAnalysisCard` (same content, same data/state). Remove it from the default `CatchUpTab` render. No logic change.
2. **`src/pages/crm/RecordWorkspace.tsx`** — when the active tab is "catch-up" (lead or deal kind), render `<IncomeAnalysisCard>` directly under the `grid grid-cols-12` block as a full-width `col-span-12` row inside the same `max-w-[1600px]` container. Pass the same props (`leadId`, `contactId`, `record`, `mortgage`).
3. No changes to:
   - `IncomeAiAnalysis.tsx` (already supports `wide`)
   - `LeadIncomeSection.tsx` (Leads side sheet)
   - Income calculation logic, edge functions, borrower resolution
   - LeftRail / RightRail
   - Any other tabs

### Out of scope
- Pipeline list page (only the deal/lead **workspace** is affected)
- People/Companies, portal, blog

Shall I implement this?
