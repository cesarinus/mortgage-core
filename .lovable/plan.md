
## Goal

Give users a one-click way to move a lead into the Pipeline directly from the Lead Workspace (the page opened from /crm/leads/:id), using the `property_address` already captured in the Smart Intake form. This is a temporary UI-side bridge until the Zapier CRM field mapping is completed — no existing functionality changes.

## Problem

- The Smart Intake form on the Lead Workspace already stores `property_address` on `leads`.
- Today, "Move to Pipeline" only exists on the **Leads list** (`src/pages/Leads.tsx` → `handleConvertToPipeline`).
- From inside a lead's workspace, the user has no way to promote the lead to a `pipeline_opportunities` row — they must go back to the list.
- The Zapier field-mapping route the user tried is not yet functional.

## Solution (minimal, additive)

Reuse the exact same conversion logic that already works on the Leads list, exposed as a button on the Lead Workspace left rail. No schema changes, no changes to Zapier, no changes to intake save flow.

### Changes

1. **Extract the conversion helper** (new file `src/lib/crm/moveToPipeline.ts`)
   - Move the body of `handleConvertToPipeline` from `src/pages/Leads.tsx` into a reusable function `moveLeadToPipeline(lead, userId)` returning `{ ok, opportunityId?, error? }`.
   - Same validation: requires `property_address` + at least one linked contact + status `qualified`.
   - Same side effects: insert into `pipeline_opportunities`, update lead status to `unqualified`, log `lead_events`, enqueue LOS sync.
   - `src/pages/Leads.tsx` keeps its handler but delegates to the new helper (behavior unchanged).

2. **Add "Move to Pipeline" action on Lead Workspace** (`src/pages/crm/RecordWorkspace.tsx`)
   - Only for `kind === "lead"` and when NOT already coming from pipeline (`!fromPipeline`).
   - Small button rendered in the left aside beneath `AriveExportCard` / `LosSyncCard`, labelled `Move to Pipeline` with the property address shown as helper text (or "Add a property address to enable" if missing).
   - Button disabled when `record.property_address` is empty or status is not `qualified`. Tooltip explains why.
   - Uses `record.property_address` (already populated by Smart Intake) — no extra prompt needed.
   - On success: toast "Moved to Pipeline — Application Sent" and `loadAll()` to refresh; do NOT auto-navigate (user is inside the workspace).

3. **No changes** to: Zapier settings, `leadIntake.ts`, `pipeline_opportunities` schema, RLS, or `handleConvertToPipeline` behavior on the list.

## Guardrails

- Same status precondition (`qualified`) as the existing list flow, so users don't accidentally jump stages.
- Same dedupe rules the workspace already applies to `pipeline_opportunities` (see `RecordWorkspace.tsx` lines ~245–265) will keep the right rail showing only the newly-created opportunity.
- If the lead is already linked to an opportunity for the same address, we short-circuit with a toast ("This lead already has a Pipeline deal for this address") instead of creating a duplicate.

## Files touched

- **New:** `src/lib/crm/moveToPipeline.ts` (~40 lines, extracted logic).
- **Edit:** `src/pages/Leads.tsx` — replace inline body of `handleConvertToPipeline` with call to helper (no UX change).
- **Edit:** `src/pages/crm/RecordWorkspace.tsx` — add button + handler in the left aside for lead kind.

## Out of scope

- Fixing the Zapier CRM field-mapping UI (tracked separately).
- Any change to how the Smart Intake form saves `property_address`.
- Any change to Pipeline stage rules.
