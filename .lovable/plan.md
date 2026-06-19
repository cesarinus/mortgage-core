
## Root cause (confirmed)

The five "missing required" errors are **not data problems** — the values are in the database. They're caused by three structural defects in the LOS mapping/validation layer:

### 1. Duplicate / typo'd mapping rows

In `los_field_mappings` (integration `arive`, active) two pairs collide on the same external field and a third is a typo:

```text
loan_purpose        → loanPurpose      (required) ✓ data lives on leads.loan_purpose
transaction_type    → loanPurpose      (required) ✗ no such CRM column — always missing

loan_officer_name   → assigneeEmail    (required) ✗ name, not email
loan_officer_email  → assigneeEmail    (required) ✗ no such column on leads

lien_positon        → lienPosition     (not required, typo)
lien_position       → lienPosition     (required) ✗ no such column on leads
```

Because each row is processed independently, the second row overwrites the first in `resolved`, and any row whose `crm_field` doesn't exist on the lead object reports "missing required".

### 2. Validator only inspects the flat `leads` row

`validateAgainstMappings` does `lead[m.crm_field]`. The tester loads `supabase.from("leads").select("*")` with no joins, so fields that live elsewhere are invisible:

| External field        | Actually lives on                                      |
| --------------------- | ------------------------------------------------------ |
| `borrower_occupancy`  | `mortgage_profiles.occupancy_type` (lead → mp)         |
| `assigneeEmail`       | `profiles.email` via `leads.assigned_to`               |
| `lienPosition`        | `loan_scenarios.lien_position` (constant "First Lien") |
| `loanPurpose`         | `leads.loan_purpose` (works) — but duplicate row breaks it |

### 3. No canonical "lead context" for outbound mappers

Snapshot, Zapier, and Arive each re-derive these joins (or don't). There's no single resolver, so each integration drifts.

---

## Plan

```text
Phase A — Mapping table cleanup (data only, no schema change)
Phase B — Canonical Lead Context resolver (one source of truth)
Phase C — Validator + Tester use the resolver
Phase D — Enum translation table
Phase E — Pre-flight + Send-to-LOS use the same resolver
Phase F — Backfill / repair report
```

### Phase A — Clean up `los_field_mappings`

One UPDATE/DELETE migration to fix the duplicates and typo. Final required rows for the four problem fields:

```text
occupancy_type      → borrower_occupancy   required  string  (resolved via context)
loan_officer_email  → assigneeEmail        required  email   (resolved via context)
lien_position       → lienPosition         required  string  (resolved via context, default "First Lien")
loan_purpose        → loanPurpose          required  string

Delete: transaction_type→loanPurpose, loan_officer_name→assigneeEmail, lien_positon→lienPosition
```

### Phase B — `buildLeadContext(leadId)` (`src/lib/los/leadContext.ts`)

One function returning a flat dictionary keyed by **canonical CRM field names**. It joins:

- `leads`            (base)
- `mortgage_profiles` by `lead_id` → `occupancy_type`, `property_type` fallback
- `loan_scenarios`   latest by `lead_id` → `lien_position`, `loan_program`, `purchase_price`
- `profiles`         by `leads.assigned_to` → `loan_officer_name`, `loan_officer_email`
- `people`           by `leads.person_id`   → name/email/phone fallback

Defaults applied here (e.g. `lien_position ?? "First Lien"`), so downstream mappers stay dumb.

Canonical field list documented inline:

```text
first_name, last_name, email, phone,
property_address, property_city, property_state, property_zip,
property_type, property_value, loan_amount, loan_purpose,
occupancy_type, lien_position, loan_program,
loan_officer_id, loan_officer_name, loan_officer_email,
person_id, assigned_to
```

### Phase C — Validator + Tester

- `LosPayloadTester.tsx`: replace the bare `lead` with `await buildLeadContext(leadId)` before calling `buildLosPayload` / `computeReadiness`.
- `SendToLosButton.tsx` + `AriveExportCard.tsx`: same swap (one helper call).
- `validate.ts` unchanged — it already works once the input is correct.

### Phase D — Enum translation (`src/lib/los/enums.ts`)

Centralised maps applied inside `buildLeadContext` *before* validation:

```text
occupancy_type:
  "Primary Residence" → "PRIMARY"
  "Second Home"       → "SECONDARY"
  "Investment"        → "INVESTMENT"
loan_purpose:
  "Purchase"   → "Purchase"
  "Refinance"  → "Refinance"
  "Cash-Out"   → "Refinance"
lien_position:
  "First Lien" → "FirstLien"
```

(Exact LOS vocab pulled from Arive's existing `ariveFieldMap.ts` where defined; otherwise left pass-through with a TODO.)

### Phase E — Pre-flight gate

`SendToLosButton` already calls `validateAriveLead`. Switch it to the mapping-driven validator on the resolved context, so the dialog blocks send when any canonical field is missing and shows the human label, not the LOS field name.

### Phase F — Backfill report (read-only)

A `scripts/audit-los-readiness.ts` SQL view (or one-off psql query) that lists every lead with `assigned_to IS NULL`, `mortgage_profiles` missing, or `loan_scenarios` missing — so we can see how much real data is incomplete vs. resolver-fixable. **No silent UPDATEs**; the report is the deliverable.

---

## Technical notes

- No schema migrations except the mapping-row cleanup in Phase A.
- `mortgage_profiles.occupancy_type` already exists and is written by `leadIntake.ts:319`.
- `loan_scenarios.lien_position` already defaults to "First Lien" in `autoScenarios.ts`.
- `profiles.email` is populated by `handle_new_user()`.
- All resolver joins are by indexed FKs; performance is fine for the tester (single lead).

---

## Out of scope (explicitly)

- Renaming columns or moving data between tables.
- New UI for the intake form.
- Touching the portal, snapshot, or timeline subsystems.
- Phase 2D (Lead Wizard) — still deferred per earlier guardrail.

## Deliverables

1. Migration: clean `los_field_mappings`.
2. New: `src/lib/los/leadContext.ts`, `src/lib/los/enums.ts`.
3. Edits: `LosPayloadTester.tsx`, `SendToLosButton.tsx`, `AriveExportCard.tsx`.
4. New: `scripts/audit-los-readiness.sql` (read-only).

After this, selecting any lead in the tester that has an assigned LO + a mortgage profile will pass validation without per-field patching, and the same resolver is reused by every outbound integration.
