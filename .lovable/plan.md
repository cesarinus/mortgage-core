## Goal

Move **Edit Intake** from the top-right of the center column to **immediately under the Mortgage snapshot card, right-aligned**, so it sits roughly in line with the **Re-sync to LOS** button in the left column (as shown in the attached screenshot).

## Files touched

1. `src/pages/crm/RecordWorkspace.tsx` — remove the existing top-of-column Edit Intake block (lines ~421–427) and pass an `onEditIntake` handler into `<CatchUpTab>`.
2. `src/components/crm/tabs/CatchUpTab.tsx` — accept optional `onEditIntake?: () => void`. When provided, render a right-aligned outline button `✨ Edit Intake` directly **after** the Mortgage snapshot `</Card>` (after line 208).

## Behavior

- Same handler (`setIntakeOpen(true)`), same icon (`Sparkles`), same `variant="outline"`, `size="sm"`.
- Only renders when `onEditIntake` is provided (i.e., `kind === "lead"`), matching today's gating.
- Lives inside the Catch-up tab, so it appears under the snapshot it edits. On other tabs (Activities, Details, etc.) the button is not shown — consistent with the screenshot you attached.

## Result

```text
LEFT COLUMN         CENTER COLUMN (Catch-up tab)
-----------         ----------------------------
Lead Card           [ Mortgage snapshot card ]
Re-sync to LOS                            [ ✨ Edit Intake ]   ← right-aligned
LOS Sync Status     [ Income Analysis ... ]
```

No functional/data changes. Approve and I'll apply.
