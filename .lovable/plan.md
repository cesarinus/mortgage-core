## Issue

On the Leads page Smart Intake → Financial Snapshot, the **Employment Status** dropdown shows:
- W-2 Employee, 1099 Contractor, Retired, Unemployed

But the CRM Fields → Leads → `employment_type` field (Mortgage Snapshot section) defines:
- Employed, Self Employed, Not Employed, Retired

These need to match.

## Change

In `src/components/crm/SmartLeadForm.tsx` (around line 517):

1. Rename the field label from **"Employment status"** to **"Employment Type"** to match the CRM field label.
2. Replace the hardcoded `<SelectItem>` options with the four values from the CRM field:
   - `employed` → Employed
   - `self_employed` → Self Employed
   - `not_employed` → Not Employed
   - `retired` → Retired
3. Remove the separate **"Self-employed"** toggle row (lines 528–534) and the self-employed checklist conditional (lines 535–545) becomes driven by `data.employment_type === "self_employed"` instead of `data.self_employed`. This keeps the documentation checklist behavior intact without a duplicate boolean.

## Mapping / persistence

In `src/lib/crm/leadIntake.ts`:
- Line 210 currently writes `data.self_employed ? "self_employed" : (data.employment_type || null)`. Simplify to just `data.employment_type || null` since the value already encodes self-employment.
- Line 392 currently blanks out `employment_type` when the value is `"self_employed"`. Remove that special-case so `self_employed` round-trips cleanly.
- Line 393 (`self_employed` form-state derivation) can remain for backwards compatibility with any legacy records that still have `mortgage_profiles.self_employed = true`; when true, initialize `employment_type` to `"self_employed"`.

No DB schema change, no migration. Existing leads with `employment_type = "w2" | "1099" | "unemployed"` will still display (Select will just show empty/blank if value doesn't match an option) — acceptable since the user explicitly asked the dropdown to match the CRM field options.

## Out of scope

- Underlying `mortgage_profiles.employment_type` column accepts any string, so no enum/check-constraint update needed.
- Pipeline / LOS payload mapping is untouched — `employment_type` still flows through `leadIntake`.