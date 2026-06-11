
# Zapier ↔ Arive LOS — End-to-End Connection Plan

The CRM already has every piece of code needed for a working Zapier bridge. What's missing is the Zapier configuration and a few sanity checks. Nothing in this plan changes app behavior; it's a setup runbook plus two small code/UI polish items at the end.

---

## What already exists (no work needed)

**Outbound (CRM → Arive via Zapier)**
- `src/lib/integrations/zapier.ts` → `fireZapier(event, data)` reads the saved hook, logs to `los_integration_logs`, and POSTs JSON with `mode: "no-cors"`.
- `src/components/settings/ZapierIntegrationSettings.tsx` → UI at **Settings → Zapier** to save the webhook URL, pick events, and send a test ping.
- `src/components/crm/SendToLosButton.tsx` → fires `lead.sent_to_los` with a normalized payload (`normalizeLosPayload`) and stamps `leads.sent_to_los_at`.
- `src/pages/settings/LosPayloadTester.tsx` → pick any lead, preview the exact JSON Zapier will receive, see validation issues, send a test fire.
- `src/pages/settings/AriveFieldMappings.tsx` + `los_field_mappings` table → controls which CRM fields map to which Arive fields.

**Inbound (Arive → CRM via Zapier)**
- Edge function `supabase/functions/arive-webhook/index.ts` already accepts a POST, validates `x-arive-secret`, upserts `los_loans`, creates/updates the `pipeline_opportunity`, writes `deal_events`, and demotes the lead.
- Secret `ARIVE_WEBHOOK_SECRET` is already configured in Lovable Cloud.
- Inbound URL: `https://hyskofjwotohgdtocsie.supabase.co/functions/v1/arive-webhook`

---

## Part A — Outbound Zap: "Send to LOS" → Create loan in Arive

### Step 1. Create the Zap in Zapier
1. Zapier → **Create Zap**.
2. **Trigger app:** *Webhooks by Zapier* → Event: **Catch Hook** → Continue.
3. Zapier shows a **Custom Webhook URL** like `https://hooks.zapier.com/hooks/catch/123456/abcde/`. Copy it.
4. Leave the "child key" field blank. Click **Continue**, then **Test trigger** (it will wait for a sample — we send that in Step 2).

### Step 2. Paste the URL into the CRM and send a sample
1. CRM → **Settings → Zapier**.
2. Paste the URL into **Webhook URL**.
3. Toggle **Enabled** on.
4. Check **Lead sent to LOS** (and any other events you want to forward). For Arive specifically, only `lead.sent_to_los` needs to be checked for this Zap.
5. Click **Save**.
6. Click **Send test payload** — this fires a `test.ping` event so Zapier captures a sample. (Optional: open a real lead and click **Send to LOS** instead, which produces a realistic `lead.sent_to_los` sample.)
7. Back in Zapier → **Test trigger** → confirm a sample appears with fields like `event`, `data.first_name`, `data.email`, `data.loan_amount`, etc.

### Step 3. Add a filter so only LOS events continue
1. In Zapier, add a step → **Filter by Zapier**.
2. Condition: **`event` (Text) Exactly matches `lead.sent_to_los`**.
3. Test the filter — it should pass because the sample event matches.

### Step 4. Connect Arive
Arive has no native Zapier app, so use one of these:

**Option A — Arive Public API (recommended if you have API credentials)**
1. Add a step → **Webhooks by Zapier** → **POST**.
2. **URL:** the Arive loan-create endpoint your Arive admin gives you (typically `https://api.arivesoftware.com/v1/loans` or your tenant-specific URL).
3. **Payload Type:** `json`.
4. **Data:** map every field from the trigger sample to the Arive field name. Use the **CRM → Settings → Arive Field Mappings** page as the canonical list — the `external_field` column is exactly the key Arive expects. Common pairs:
   - `borrower.first_name` ← `data.first_name`
   - `borrower.last_name` ← `data.last_name`
   - `borrower.email` ← `data.email`
   - `borrower.phone` ← `data.phone`
   - `loan.purpose` ← `data.loan_purpose`
   - `loan.amount` ← `data.loan_amount`
   - `property.address_line1` ← `data.property_address_line1`
   - `property.city/state/zip` ← `data.property_city / property_state / property_zip`
   - `external_reference_id` ← `data.crm_reference_id`  ← **critical**, this is the lead UUID that the inbound webhook uses to find the lead back.
5. **Headers:**
   - `Authorization: Bearer <ARIVE_API_TOKEN>`
   - `Content-Type: application/json`
6. **Test action** → Zapier sends the live request to Arive. Open Arive and confirm the loan was created with the CRM reference id stored.

**Option B — Arive email intake (fallback if no API access)**
1. Add a step → **Email by Zapier** → **Send Outbound Email** to your Arive intake address.
2. Body: a structured summary or CSV — Arive will create a task that your team converts. Less automated; only use until API credentials are available.

### Step 5. Publish the Zap
1. Rename the Zap: **"NexGen CRM → Arive: New Loan"**.
2. Toggle **Publish** on.
3. Verify with a real lead: open a lead in the CRM that has all required fields (first/last name, email, phone, loan purpose, loan amount), click **Send to LOS**, then check:
   - Zapier → **Zap History**: run shows success.
   - CRM → **Settings → LOS Integration Logs**: row with `event = lead.sent_to_los`, `status = sent`.
   - Arive: the loan exists with the CRM reference id.

---

## Part B — Inbound Zap: Arive status changes → CRM pipeline updates

### Step 1. Tell Arive where to send updates
You have two ways for Arive to push updates, depending on what Arive supports for your tenant:

**Path 1 — Arive native webhook (preferred, skips Zapier entirely)**
1. Arive admin console → **Settings → Webhooks** (or ask Arive support to enable).
2. Add endpoint: `https://hyskofjwotohgdtocsie.supabase.co/functions/v1/arive-webhook`
3. Add a custom header: **Name** `x-arive-secret`, **Value** = the `ARIVE_WEBHOOK_SECRET` value already stored in Lovable Cloud. (You can rotate this secret later under Backend → Secrets; just update Arive when you do.)
4. Subscribe to events: `loan.status_changed`, `loan.updated`, `loan.closed` (whatever Arive offers).
5. Body should include: `crm_reference_id` (the value Zapier sent in Part A Step 4), `arive_loan_id`, `loan_status`, `loan_amount`, `interest_rate`, `loan_program`, `estimated_close_date`, `du_findings`, `conditions`, `property_address`.

If Arive can do this, you're done with Part B — skip the rest.

**Path 2 — Zapier polling (use only if Arive can't push)**
Continue below.

### Step 2. Create the inbound Zap
1. Zapier → **Create Zap**.
2. **Trigger:** *Webhooks by Zapier* → **Retrieve Poll** (or Arive's app if one is added later).
3. Configure it to poll the Arive loan-list endpoint every 15 minutes for loans updated since the last run. Auth via `Authorization: Bearer <ARIVE_API_TOKEN>` header.
4. **Test trigger** until Zapier returns at least one loan record.

### Step 3. Forward each update to the CRM webhook
1. Add a step → **Webhooks by Zapier** → **POST**.
2. **URL:** `https://hyskofjwotohgdtocsie.supabase.co/functions/v1/arive-webhook`
3. **Payload Type:** `json`
4. **Data:**
   - `crm_reference_id` ← Arive's `external_reference_id`
   - `arive_loan_id` ← Arive `id`
   - `loan_status` ← Arive `status` (one of: `pre_approved`, `application_sent`, `underwriting`, `approved`, `clear_to_close`, `closed`, `denied`, `withdrawn` — the edge function maps these to CRM stages)
   - `loan_amount`, `interest_rate`, `loan_program`, `estimated_close_date`, `purchase_price`, `du_findings`, `conditions`, `property_address` — pass through whatever Arive returns.
5. **Headers:**
   - `x-arive-secret: <value of ARIVE_WEBHOOK_SECRET>`
   - `Content-Type: application/json`
6. **Test action** → expect `200 { ok: true, lead_id, deal_id }`. If you get `401` the secret header is wrong; `404` means `crm_reference_id` doesn't match any lead.

### Step 4. Publish and verify
1. Rename the Zap: **"Arive → NexGen CRM: Status Sync"**.
2. Publish.
3. In Arive, advance a test loan to "Underwriting". Within one polling cycle:
   - CRM → **Pipeline**: the deal moves to *Underwriting*.
   - CRM → record's **Activity** tab: shows a `stage_transition` event.
   - CRM → **Settings → LOS Integration Logs**: inbound row recorded.

---

## Part C — Small code/UI polish (the only file changes in this plan)

These are quality-of-life additions so the setup above is easier to use and harder to break. None are strictly required for Zapier to function, but I recommend them:

1. **`src/components/settings/ZapierIntegrationSettings.tsx`** — add a one-click **Copy inbound URL** button that copies `https://hyskofjwotohgdtocsie.supabase.co/functions/v1/arive-webhook` plus a reminder that the `x-arive-secret` header is required. Today users have to look the URL up manually.
2. **`src/components/settings/ZapierIntegrationSettings.tsx`** — surface the last 5 rows from `los_integration_logs` for the current user directly under the form, so failed fires are visible without navigating to LOS Logs.
3. **`src/components/crm/SendToLosButton.tsx`** — when `missing.length > 0`, deep-link the missing field name to the lead's edit drawer so users can fix and retry without context switching.

### Technical notes
- `fireZapier` uses `mode: "no-cors"` (required by Zapier hooks), so the CRM never sees a 200/4xx response. "Did it work?" must always be confirmed in **Zap History** or **LOS Integration Logs** — surface that explicitly in any new UI copy.
- The inbound edge function is deployed with `verify_jwt = false` and authenticates strictly via `x-arive-secret`. Do not relax that check.
- The `crm_reference_id` round-trip (CRM lead UUID → Arive `external_reference_id` → back to inbound webhook) is the only thing that ties the two systems together. If a step in Part A drops it, Part B will 404.

---

## Acceptance checklist

- [ ] Outbound test ping reaches Zapier (visible in Zap History) and writes a `sent` row to `los_integration_logs`.
- [ ] Real lead "Send to LOS" creates a loan in Arive with `external_reference_id = <lead uuid>`.
- [ ] Status change in Arive flips the matching CRM pipeline opportunity to the mapped stage and writes a `deal_events` row.
- [ ] Failures show up in **Settings → LOS Integration Logs** with status `failed` and an error message.
