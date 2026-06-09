# Zapier ↔ Arive LOS Integration Plan

Two Zaps. CRM is the system of record for early-funnel data; Arive is the system of record once the loan is in pre-approval/processing.

```text
  CRM (Lead/Deal)                Zapier                   Arive LOS
  ──────────────                 ──────                   ─────────
  [Send to LOS] ─── lead.sent_to_los ──▶ Zap 1 ─▶ Create Loan/Borrower
                                                          │
                                                          │ status / data changes
                                                          ▼
  Update Deal  ◀── arive-webhook ◀── Zap 2 ◀── Arive Trigger
```

---

## Zap 1 — CRM → Arive (Send to LOS)

### CRM side (what we build)
1. **New event:** `lead.sent_to_los` added to `src/lib/integrations/zapier.ts` and to the Settings event picker.
2. **"Send to LOS" button** on the lead record (LeftRail header in `RecordWorkspace`) and on the deal card in `Pipeline.tsx`.
   - Button disabled until the lead has: first name, last name, email, phone, loan purpose, property address, loan amount.
   - On click: confirm dialog → fire `lead.sent_to_los` with the full payload below → mark `leads.sent_to_los_at = now()` so the button flips to "Re-sync to LOS" and shows the timestamp.
   - Borrower consent is captured inside Arive, so no consent gate on our side.
3. **Payload** (single flat JSON, no docs):
   ```json
   {
     "crm_reference_id": "<leads.id>",          // matching key for Zap 2
     "first_name", "last_name", "email", "phone",
     "ssn", "dob",
     "loan_purpose", "loan_amount", "estimated_credit_score",
     "property_address", "property_city", "property_state", "property_zip",
     "property_type", "occupancy", "purchase_price", "down_payment",
     "annual_income", "employment_status",
     "loan_officer_email": "<assigned user email>"
   }
   ```

### Zapier side (you build in Zapier UI)
- **Trigger:** Webhooks by Zapier → Catch Hook (the URL already in Settings).
- **Filter:** Only continue if `event = lead.sent_to_los`.
- **Action:** Arive → *Create Loan* (or *Create Borrower + Create Loan*). Map fields 1:1.
- **(Optional) Action:** Storage by Zapier → store `{crm_reference_id → arive_loan_id}` so Zap 2 can look it up. Easier alternative below: just have Arive pass `crm_reference_id` through.

---

## Zap 2 — Arive → CRM (Status & data sync back)

### Zapier side
- **Trigger:** Arive → *Loan Updated* / *Loan Status Changed* (whichever Arive exposes; per Arive's docs Zapier polls loan updates).
- **Action:** Webhooks by Zapier → **POST** to a new CRM edge function:
  `https://<project>.supabase.co/functions/v1/arive-webhook`
  with header `x-arive-secret: <shared secret>` and body:
  ```json
  {
    "crm_reference_id": "<echoed back from custom field in Arive>",
    "arive_loan_id": "...",
    "loan_status": "pre_approved | in_underwriting | approved | ctc | closed | denied",
    "purchase_price": 0,
    "loan_amount": 0,
    "interest_rate": 0,
    "loan_program": "...",
    "estimated_close_date": "...",
    "du_findings": "approve_eligible | refer | ...",
    "conditions": ["..."]
  }
  ```
  > In Arive, add a custom loan field "CRM Reference Id" and map our `crm_reference_id` into it on Zap 1, then echo it back on Zap 2. This is the matching key.

### CRM side (what we build)
1. **New edge function** `supabase/functions/arive-webhook/index.ts` (public, validates `x-arive-secret`):
   - Look up the lead by `crm_reference_id` (= `leads.id`).
   - Upsert into a new `los_loans` table (loan_status, arive_loan_id, rate, program, close date, DU findings, conditions JSON, raw payload, updated_at).
   - Update the linked `pipeline_opportunities` row: `loan_amount`, `purchase_price`, `interest_rate`, and **advance the deal stage** based on Arive status mapping:
     - `pre_approved` → `application_sent`
     - `in_underwriting` → `underwriting`
     - `approved` → `approved`
     - `ctc` → `clear_to_close`
     - `closed` → `closed`
     - `denied` → `lost`
   - Append a `deal_events` row for the audit trail.
2. **New secret** `ARIVE_WEBHOOK_SECRET` (you generate any random string, paste it into Zapier's header and into Lovable Cloud secrets).
3. **UI:** New "LOS Sync" card on the deal/lead workspace showing last sync time, current Arive status, DU findings, and outstanding conditions pulled from `los_loans`.

---

## Database changes (additive only)
- `leads.sent_to_los_at timestamptz null`
- `pipeline_opportunities.arive_loan_id text null`
- New table `los_loans` (lead_id, deal_id, arive_loan_id unique, loan_status, purchase_price, loan_amount, interest_rate, loan_program, estimated_close_date, du_findings, conditions jsonb, raw jsonb, last_synced_at) — RLS owner-scoped, service_role full access for the edge function.

## Files changed/created
- `src/lib/integrations/zapier.ts` — add `lead.sent_to_los` event type.
- `src/components/settings/ZapierIntegrationSettings.tsx` — add event to checkbox list.
- `src/components/crm/SendToLosButton.tsx` *(new)* — confirm + fire + stamp timestamp.
- `src/components/crm/LeftRail.tsx` and `src/pages/Pipeline.tsx` — mount button.
- `supabase/functions/arive-webhook/index.ts` *(new)* — inbound handler, no JWT, validates shared secret.
- Migration: columns + `los_loans` table + grants/RLS.
- New `LosSyncCard` on the record workspace.

## What you'll do in Zapier after I build this
1. Zap 1: paste the existing webhook URL as trigger, add filter `event = lead.sent_to_los`, add Arive *Create Loan*, map fields, **add custom field "CRM Reference Id" in Arive and map our `crm_reference_id` into it**.
2. Zap 2: Arive *Loan Updated* trigger → Webhooks POST to the new `arive-webhook` URL I'll give you, with the `x-arive-secret` header.
3. Test by clicking **Send to LOS** on a test lead, then changing its status in Arive and watching the deal advance in the CRM.

Approve and I'll build it.
