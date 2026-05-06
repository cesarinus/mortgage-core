# Set up secrets, then build Newsletter MVP

## Step 1 — Request the two pending secrets

Open the secure secrets form for:

- **`PING_SECRET`** — I'll provide a freshly generated 64-char hex value you can copy/paste directly into the form. Sample (do not reuse, I'll generate a fresh one at request time):
  ```
  e8b4c1a7d9f6432580b3e7c9d2f5a814603e9b7c2a5d8f1e4063b9c7a2d5e8f1
  ```
- **`AUTOMATION_WEBHOOK_URL`** — paste your n8n webhook URL, OR leave blank for now (the system gracefully skips webhook calls when unset; everything else still works).

You'll see one secure form. Approve to store both.

## Step 2 — Verify content-ping works end-to-end

Once stored, I'll:
1. Test `content-ping` via curl with the new `PING_SECRET` (expect 200 + Pingomatic OK).
2. Click "Distribute" on a published blog post in BlogAdmin to confirm the admin path also works.
3. Check edge logs for any errors.

## Step 3 — Begin Newsletter MVP (separate approval)

After secrets are confirmed, I'll start the Newsletter MVP slice you approved:

- **DB migration** (extension-only, additive): `subscribers`, `email_templates`, `email_logs` tables + RLS (admins only).
- **Preloaded "Google Review Request" template** seeded with your branded HTML + text.
- **Subscribers admin page** with table, add/edit/delete, tag chips, CSV import/export.
- **Templates admin page** with TipTap editor + live preview + `{{first_name}}` / `{{google_review_link}}` merge fields.
- **`send-review-request` edge function** using existing Resend connector (reuses `RESEND_API_KEY`).
- **"Send Review Request" button** on closed/converted leads in the Pipeline view.

Newsletters, Campaigns, Analytics, scheduling, and tracking pixels are deferred to a later slice (per your MVP choice).

## Notes

- No code changes happen in Step 1. Only the secrets form opens.
- The DB migration in Step 3 is additive and will not modify any existing tables — consistent with your change control policy.
- All emails go through Resend (already connected), no new API keys needed.
