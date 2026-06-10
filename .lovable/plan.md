## Root cause

The "Send to LOS" code is working correctly. It fires the `lead.sent_to_los` event through `fireZapier()`, which looks up the user's webhook URL in the `integration_webhooks` table and POSTs the payload there.

The problem is the **saved URL is wrong**. The database currently has:

```
https://hooks.zapier.com/hooks/catch/27890503/4336kzy/   ← saved in Settings
https://hooks.zapier.com/hooks/catch/27890503/432hy7l/   ← the URL you just gave me
```

The CRM has been sending the payload all along — it's just being delivered to a different (probably old/disabled) Zap, which is why your new Catch Hook in Zapier never receives anything. Diagnostics confirm it: `last_fired_at = 2026-06-10 02:20:59`, `last_status = sent`.

Because `fetch` is sent with `mode: "no-cors"`, the response is opaque and we can't tell from the browser whether Zapier actually accepted it — so this kind of silent mis-routing won't show up as an error in the UI.

## Fix

Two small changes, no logic rewrite:

1. **Update the saved webhook URL to the correct one.**
   Run one SQL update on `integration_webhooks` to replace the stale URL with `https://hooks.zapier.com/hooks/catch/27890503/432hy7l/` for your user. You can alternatively just go to Settings → Zapier Integration, paste the new URL, and click Save — same result. I'll do it in SQL so it's done immediately.

2. **Make the Settings page show the truncated URL plainly** so this kind of mismatch is easier to catch in the future.
   Tiny UI tweak in `ZapierIntegrationSettings.tsx`: under the "Last fired" line, also render the masked URL currently saved (e.g. `…/catch/27890503/432hy7l/`). No behavior change, just visibility.

That's it. No changes needed to `SendToLosButton.tsx`, `fireZapier()`, or the edge function — they're all correct. The "no data received" symptom is 100% explained by the wrong saved URL.

## After the fix — how to verify

1. Open Settings → Zapier Integration → click **Send test payload**. Your new Zap (`432hy7l`) should immediately show a run in Zapier's history.
2. Open a Qualified lead → **Send to LOS**. The Zap should receive a `lead.sent_to_los` event with `crm_reference_id`, `first_name`, `last_name`, `email`, `phone`, `loan_purpose`, `loan_amount`, `loan_officer_email`, etc.

If after step 1 the Zap still shows nothing, the issue is on Zapier's side (Zap turned off, hook revoked, or wrong Zap selected) — not the CRM.
