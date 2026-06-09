## Zapier Integration Plan

Wire the CRM to fire events to your Zapier webhook (which then forwards to Arive LOS).

### 1. Storage
Add a new table `integration_webhooks` to store per-user webhook config:
- `user_id` (owner)
- `provider` ('zapier')
- `url` (the catch hook URL)
- `enabled` (bool)
- `events` (text[] — which CRM events to fire on)
- `last_fired_at`, `last_status` (for diagnostics)
- RLS: owner can manage their own row; service_role full access.

### 2. Settings UI
New card in `SettingsPage.tsx` → **Integrations → Zapier**:
- Input for webhook URL (paste the `hooks.zapier.com/hooks/catch/...` link)
- Enable/disable toggle
- Checkboxes for which events to send:
  - Lead created
  - Lead status changed (new → contacted → qualified)
  - Deal stage changed
  - Deal closed
  - Document uploaded
- "Send test payload" button (fires a sample event so you can finish the Zap setup in Zapier)
- Last fired timestamp + status indicator

### 3. Event firing
Lightweight client-side helper `src/lib/integrations/zapier.ts`:
- `fireZapier(event, payload)` → reads the current user's enabled webhook + event list, POSTs JSON with `mode: "no-cors"`
- Called from existing mutation points (lead insert, deal stage update, etc.) — additive, non-blocking, wrapped in try/catch so it never breaks the CRM flow.

Payload shape (consistent across events):
```
{ event: "lead.created", timestamp, source: "ngcapital-crm", data: { ...record } }
```

### 4. Where it gets called (additive only)
- `useAuth`/lead creation paths → `lead.created`
- Pipeline stage change handler → `deal.stage_changed`, `deal.closed`
- Document upload in CRM → `document.uploaded`

No existing logic modified — only an extra fire-and-forget call after success.

### 5. Out of scope (for now)
- Inbound webhooks from Arive → CRM (would need an edge function endpoint; we can add later if Arive needs to push updates back).
- Server-side firing from DB triggers (current plan fires from the client, which is simpler and works for everything happening in the app UI).

### Technical notes
- `mode: "no-cors"` means we can't read Zapier's response — success is verified in Zapier's Zap History.
- Webhook URL is treated as semi-sensitive but stored in DB (not localStorage) and protected by RLS.
- Test button fires a dummy `test.ping` event so Zapier's "Test trigger" step can capture the schema.

Ready to implement when you approve.
