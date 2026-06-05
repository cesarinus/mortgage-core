# Real Email Engine via Titan SMTP

## Scope
Add a production-ready email pipeline using your Titan account (`CMartinez@NGCapital.net`) with stored SMTP credentials, a server-side send function, automated triggers, and full logging. All additive — no changes to `leads`, `pipeline_opportunities`, `crm_contacts` schemas, or n8n/borrower portal.

## 1. Database (additive migrations)

**`email_providers`**
- name, host, port, username, password (encrypted/server-only), from_email, from_name, is_active, created_at
- RLS: only admins can read/write
- GRANTs to `authenticated` + `service_role`

**`email_logs`**
- to_email, subject, template_id → email_templates(id), lead_id → leads(id), opportunity_id → pipeline_opportunities(id), status (sent/failed/bounced), error_message, sent_at
- RLS: admins + owners of related lead can read; service_role inserts
- GRANTs accordingly

**`email_templates`** (extend existing)
- Add `merge_fields text[]` and `trigger_event text` columns (additive)

## 2. Edge Functions

**`send-email`** (new, `verify_jwt = true`)
- Inputs: `to`, `subject`, `body` OR `template_alias` + `vars`, optional `lead_id`, `opportunity_id`
- Loads active `email_providers` row (service-role client)
- Sends via SMTP using `nodemailer` (npm: specifier in Deno)
- Renders `{{merge}}` fields server-side
- Writes row to `email_logs`
- Returns `{ ok, id, error? }`

**`test-smtp`** (new) — sends a single test email to caller's email using a supplied or active provider config without persisting unless `save=true`.

**Trigger functions** (DB → pg_net → edge):

- `notify-lead-created` — DB trigger on `leads` AFTER INSERT → invokes `send-email` with `welcome-email`.
- `notify-deal-closed` — DB trigger on `pipeline_opportunities` AFTER UPDATE WHERE new.stage='closed' → invokes `send-email` with `google-review-request`.
- `document-reminder-cron` — scheduled (pg_cron daily) → finds leads with `status='qualified'` whose linked deal/portal has 0 documents and `last_activity_at < now()-3d` → invokes `send-email` with `document-reminder`.

## 3. Settings → Email page

New route `/settings/email` (admin only):
- Form: Host (default `smtp.titan.email`), Port (587/465 toggle), Username, App Password, From Name
- Save → upserts active `email_providers` row (server side via edge fn `save-smtp-provider` to avoid exposing password reads)
- "Test Connection" button → calls `test-smtp` edge function, shows toast with result
- Status badge: "Active provider: …"

## 4. Email Templates page upgrade

Keep `/email/templates`. Additions:
- `merge_fields` chips below subject
- `trigger_event` dropdown (none / lead_created / qualified_no_docs / deal_closed)
- Preview drawer renders with sample data (existing)
- Highlight `{{var}}` tokens in HTML textarea (simple regex-styled overlay)
- Seed templates if missing: `welcome-email`, `document-reminder`, `google-review-request` (with the bodies specified)

## 5. Lead/Opportunity detail integration

- New "Emails" sub-tab inside Activities (or extend existing email log component) showing rows from `email_logs` filtered by `lead_id` / `opportunity_id`
- Columns: Sent at · Subject · To · Status · Error

## 6. Security

- SMTP password stored in `email_providers`; RLS denies anon/authenticated SELECT of password column (separate view exposing non-secret fields for UI).
- All sends go through edge functions using service role.
- Client never sees password; settings form only writes via edge fn.
- Input validation with zod in all functions.

## Technical Notes
- nodemailer via `npm:nodemailer@6` in Deno edge runtime.
- DB triggers use `net.http_post` with project anon key (pattern already used by `notify_lead_status_change`).
- pg_cron job created via `insert` tool (not migration) since it embeds project URL/anon key.

## Files
- `supabase/migrations/<ts>_email_engine.sql`
- `supabase/functions/send-email/index.ts`
- `supabase/functions/test-smtp/index.ts`
- `supabase/functions/save-smtp-provider/index.ts`
- `src/pages/settings/EmailSettings.tsx` + route
- `src/components/email/EmailLogList.tsx` + integration in `RecordWorkspace`
- Updates to `src/pages/EmailTemplates.tsx`

## Out of scope (unchanged)
- `leads`, `pipeline_opportunities`, `crm_contacts` schemas
- Leads list / smart views / filters
- Existing n8n workflows
- Borrower portal
