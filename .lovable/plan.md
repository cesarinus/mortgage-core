# ARIVE LOS Export Hardening Plan

## Goal
Every Lead exported from Mortgage Core CRM produces a clean, flat, ARIVE-compatible payload that Zapier accepts and ARIVE turns into a loan — without manual cleanup.

## 1. New backend table — `lead_export_logs`
Migration (extension-only, with GRANTs + RLS):

```
id uuid pk default gen_random_uuid()
lead_id uuid references public.leads(id) on delete cascade
user_id uuid
export_system text          -- 'arive' | 'zapier'
payload jsonb               -- flat payload we sent
response jsonb              -- Zapier/ARIVE response or null (no-cors limits this)
validation_errors jsonb     -- [{field, code, message}]
status text                 -- 'success' | 'failed' | 'invalid'
created_at timestamptz default now()
```

RLS: owners (`assigned_to`/`created_by` via `user_owns_lead`) + admins read; insert by authenticated; service_role full.

## 2. Validation engine — `src/lib/los/ariveValidate.ts`
Pure function `validateAriveLead(lead, mortgageProfile)` returns:

```
{
  ok: boolean,
  score: number (0-100),
  fields: [{ crmField, crmValue, ariveField, status: 'valid'|'missing'|'invalid', message }],
  payload: FlatArivePayload,   // null-safe, ready-to-send
  errors: ValidationIssue[],
}
```

Rules:
- Required: firstName, lastName, email, mobilePhone, loanPurpose, propertyUse, estimatedFICO. `loanAmount`, `purchasePrice`/`estimatedValue` required-if-available.
- `mobilePhone` → 10 digits via `normalizePhone`; invalid otherwise.
- `email` → `normalizeEmail` regex.
- Money fields → `normalizeMoney` → number or null.
- `estimatedFICO` → `normalizeCreditScore` midpoint integer.
- Dates → `toISO8601(value)` helper (full ISO `2026-06-11T...Z`).
- Empty strings collapse to `null`; `undefined` keys dropped before send.

Scoring: 100 − (missing required × 15) − (invalid × 10) − (missing optional × 5), floored at 0.

## 3. Default value mapping
Centralised `ARIVE_DEFAULTS`:

```
homebuyingStage: "Just Started"
leadSource:      "Mortgage Core CRM"
loanStatus:      "Lead"
occupancyType:   "Primary Residence"
```

Applied only when the CRM value is null/empty AND the ARIVE field is required.

## 4. Flat Zapier payload — `buildArivePayload(lead, mp)`
Returns exactly these primitive keys (drops anything `undefined`/`""`):

```
firstName, lastName, email, mobilePhone,
loanPurpose, propertyUse,
purchasePrice, estimatedValue, estimatedFICO, loanAmount,
leadSource, externalCreateDate (ISO 8601)
```

No nested objects, no arrays. Used by `SendToLosButton` instead of today's `rawPayload`.

## 5. UI — Lead workspace additions
File: `src/components/crm/LosSyncCard.tsx` (existing card) gets three new pieces:

**a) Export Readiness chip**
- Big number from `validateAriveLead().score` with progress bar.
- Lists top issues blocking export.

**b) "ARIVE Export Preview" modal** (new `AriveExportPreviewDialog.tsx`)
- Triggered from a "Preview Payload" button next to Send/Re-sync.
- Table: `Field | CRM Value | ARIVE Field | Status` with ✓ / ⚠ / ✕ icons + tooltip messages.
- Footer shows the final flat JSON in a read-only code block.
- "Send to LOS" button inside the modal is disabled until `ok === true`.

**c) Export Debug panel** (collapsible inside `LosSyncCard`)
- Last Attempt timestamp, Status badge.
- Tabs: Payload Sent / Validation Errors / ARIVE Response / Zapier Response.
- Data sourced from latest `lead_export_logs` row for the lead.

## 6. Wire `SendToLosButton`
- Run `validateAriveLead` before firing; block + toast when `!ok`.
- Build payload with `buildArivePayload` (replaces the current ad-hoc `rawPayload`/`normalizeLosPayload` for ARIVE).
- Insert a `lead_export_logs` row (`status: 'success' | 'failed' | 'invalid'`, payload, validation_errors) immediately after `fireZapier`. Keep the existing `los_integration_logs` write inside `fireZapier` untouched.
- Continue to set `leads.sent_to_los_at` only on success.

## 7. Field Mapping Documentation
New settings page `src/pages/settings/AriveExportMappings.tsx` (read-only doc, surfaced from existing Arive section):

| Mortgage Core Field | Zapier Field | ARIVE Field | Type | Required | Validation | Default |

Generated from a single source-of-truth array in `src/lib/los/ariveFieldMap.ts` so the validator, preview modal, and docs page never drift.

## 8. Out of scope
- No changes to `los_field_mappings` / `los_integration_logs` schemas.
- No edge function changes — Zapier remains the transport (no-cors, so `response` column will usually be null; we still capture request status + Zapier history pointer).
- Smart Intake form UI unchanged.

## Technical notes
- New files: `src/lib/los/ariveValidate.ts`, `src/lib/los/ariveFieldMap.ts`, `src/lib/los/buildArivePayload.ts`, `src/components/crm/AriveExportPreviewDialog.tsx`, `src/components/crm/ExportDebugPanel.tsx`, `src/pages/settings/AriveExportMappings.tsx`, one new migration for `lead_export_logs`.
- Edited: `src/components/crm/SendToLosButton.tsx`, `src/components/crm/LosSyncCard.tsx`, settings routing + Arive section nav entry.
- All values pass through existing `src/lib/los/format.ts` helpers; add `toISO8601` there.
