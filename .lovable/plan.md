## Goal

Place **Edit Intake** at the **bottom-right of the center column**, **outside the Tabs container**, so it:

- Shows on every tab (Catch-up, Activities, Details, Loan Scenarios, Messages, Tasks, Conditions, Documents, Emails) — not just Catch-up.
- Sits horizontally in line with the **Re-sync to LOS** button in the left column.

```text
LEFT COLUMN              CENTER COLUMN
-----------              -------------
Lead card                [ Tabs bar ]
Status / Actions         [ Active tab content ... ]
Contact / fields         [ (Mortgage snapshot, etc.) ]
                         [ Income Analysis ... ]
[ Re-sync to LOS ]  ───  [               ✨ Edit Intake ]   ← right-aligned, same row
LOS Sync Status
```

## Files to change

1. **`src/components/crm/tabs/CatchUpTab.tsx`** — Revert: remove the `onEditIntake` prop and the inline Edit Intake button I added under the Mortgage snapshot. The tab goes back to its prior shape.

2. **`src/pages/crm/RecordWorkspace.tsx`** — Stop passing `onEditIntake` to `<CatchUpTab>`. Render a single `Edit Intake` button **after** the `<Tabs>` block, at the bottom of the center column, wrapped in `<div class="flex justify-end mt-4">`. Same handler (`setIntakeOpen(true)`), same `Sparkles` icon, `variant="outline"`, `size="sm"`, gated on `kind === "lead"` exactly like before.

## Behavior

- One Edit Intake button per record workspace, always visible at the bottom of the center column regardless of active tab.
- Right-aligned within the center column so it visually lines up with Re-sync to LOS in the left column (both are at the bottom of their respective columns).
- No data/logic changes. Opens the same intake sheet as today.
