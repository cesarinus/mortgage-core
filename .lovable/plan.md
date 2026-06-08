## Goal

When a portal user uploads an income document (pay stub, W-2, 1099, personal 1040, or business return 1120-S/1065/etc), the system reads it with Lovable AI (Gemini vision), stages the extracted values as **suggested** inputs on the Income form inside the Lead and Pipeline workspaces, and the LO reviews and approves them. Portal users do **not** see any income calculation until the LO validates.

## Flow

```text
Portal upload (W-2 / 1099 / pay stub / tax return)
        │
        ▼
crm_attachments row created (existing)
        │
        ▼  (auto-trigger from client after successful upload)
Edge function: extract-income-document
  • Signed URL for the file in crm-documents
  • Gemini 3 Flash vision → JSON extraction per doc type
  • Writes row to NEW table: income_document_extractions
        │
        ▼
Lead/Deal workspace → Income Analysis card
  • New "Suggested values" panel above the form fields
  • Per-field "Apply" + bulk "Apply all & save"
  • On Apply → writes to borrower_payment_details, marks extraction "applied"
  • LO clicks Calculate (existing flow) to produce borrower_income_calculations
        │
        ▼
Portal income view
  • Hidden until at least one borrower_income_calculations row exists
    AND LO has flagged it as "shared with borrower" (new column)
```

## Document scope (v1)

| Document | Fields extracted |
|---|---|
| Pay stub | gross base, overtime, bonus, commission, pay-period ending date, pay frequency |
| W-2 | tax year, Box 1 wages, Box 5 medicare wages, employer name |
| 1099 (NEC/MISC) | tax year, nonemployee comp / other income, payer |
| 1040 (personal) | tax year, AGI, wages, Sched C net, Sched E net |
| Business return (1120-S / 1065 / 1120) | tax year, entity type, ordinary business income, owner's % (if visible) |

Other documents (bank statements, ID, etc.) are skipped.

## Technical details

### New table: `income_document_extractions`
- `attachment_id` (FK → crm_attachments)
- `lead_id`, `contact_id`, `deal_id`
- `doc_type` enum: `pay_stub | w2 | form_1099 | form_1040 | business_return | unknown`
- `tax_year` int, `period_ending_date` date
- `extracted` jsonb (raw normalized values)
- `confidence` numeric (0–1, model-reported)
- `status` enum: `pending | applied | dismissed | failed`
- `error` text, `model` text, timestamps
- RLS: LO/admin who owns the lead can read/update; portal user can insert (via edge function only, no direct grant); service_role full access.
- GRANTs: `SELECT, UPDATE` to authenticated; `ALL` to service_role.

### New column on `borrower_income_calculations`
- `shared_with_borrower boolean default false` — gates portal visibility (extension-only, additive).

### New edge function: `extract-income-document`
- `verify_jwt = true` (called from portal session and CRM).
- Input: `{ attachment_id }`.
- Loads attachment row, signed URL from `crm-documents` bucket.
- Sends file to Lovable AI Gateway `google/gemini-3-flash-preview` with a strict JSON schema per doc type (one call; model first classifies, then extracts).
- Inserts `income_document_extractions` row with `status = 'pending'`.
- Returns the extraction. Handles 429/402 by storing `status = 'failed'` + error.

### Auto-trigger on portal upload
- `src/pages/portal/PortalDocuments.tsx`: after `crm_attachments` insert succeeds for categories matching income docs (`paystub`, `w2`, `tax_returns`, etc.), call `supabase.functions.invoke("extract-income-document", { body: { attachment_id } })` fire-and-forget. No UI change for the borrower.
- Also expose a manual "Re-extract" button in the LO's Income card per pending extraction (for retries / files uploaded by LO).

### Income card UI (`src/components/crm/IncomeCard.tsx`)
- Above the form, render a new `SuggestedFromDocuments` panel that lists `pending` extractions for the current `(leadId, contactId)`:
  - Per row: doc type pill, file name, key extracted values, **Apply** + **Dismiss**.
  - Header bulk action: **Apply all suggestions**.
  - Applying merges values into the form state and persists via existing `savePaymentDetails`, then marks the extraction `applied`.
- No changes to the calculator math, `calculate-income` function, or borrower classification logic.

### Portal gating
- `src/pages/portal/PortalIncome.tsx` (and any dashboard income widget) shows the existing income view only when `borrower_income_calculations.shared_with_borrower = true` for the bound deal. Otherwise it shows "Your loan officer is reviewing your documents."
- Add a small "Share with borrower" toggle in the LO's Income card (admin/LO only) that flips this flag on the latest calculation row.

### Out of scope
- OCR for non-income docs (bank statements, ID, etc.).
- Self-employed P&L / balance sheet parsing beyond the totals above.
- Changes to `calculate-income`, classification logic, RightRail/LeftRail, blog, social, or any other module.

## Files touched

- **New** `supabase/functions/extract-income-document/index.ts`
- **New** `src/components/crm/IncomeSuggestions.tsx`
- **New** `src/lib/crm/incomeExtractions.ts` (fetch/apply/dismiss helpers)
- **Edit** `src/components/crm/IncomeCard.tsx` (mount suggestions panel + share toggle)
- **Edit** `src/pages/portal/PortalDocuments.tsx` (fire-and-forget extract on income uploads)
- **Edit** `src/pages/portal/PortalIncome.tsx` (gate on `shared_with_borrower`)
- **Migration** create `income_document_extractions` (+ enums, RLS, grants) and add `shared_with_borrower` to `borrower_income_calculations`.

Shall I implement?