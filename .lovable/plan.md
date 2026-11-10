# Targeted Verification: Mortgage Attribution (read-only)

Nothing was changed, deployed or created. Only source code and database definitions were read: Mortgage Core, plus a read-only snapshot of NexGen Foundation, which is nexgen-capital.com, commit b77d2b57. No borrower records were read.

Each finding is labeled VERIFIED, NOT VERIFIED or NOT APPLICABLE.

## 1. Website tracker and consent (NexGen Foundation)

- **VERIFIED: the site calls `track-visitor-activity` from the browser.**
  - The address is hard-coded in `src/lib/visitor-tracking.ts` (`TRACKING_ENDPOINT`).
  - Requests go out with `credentials: "omit"` and `keepalive`.
- **VERIFIED: every page loads the tracker.**
  - `<VisitorTracking />` is mounted in `src/routes/__root.tsx` (line 159).
  - It records one `page_view` per route change.
  - `installJourneyTracking()` records `cta_click` for links to ngcapital.net, www.ngcapital.net and askcesar.ngcapital.net.
- **VERIFIED: nothing is sent or stored until the visitor accepts Analytics cookies.**
  - Every send path checks `hasAnalyticsConsent()` first. This reads `nexgen-cookie-consent-v1.analytics === true` from browser storage.
  - `getVisitorId()` returns null and stores nothing without consent.
  - If consent is granted later, the `cookie-consent-updated` event records the current page.
  - If consent is withdrawn, the stored ID `nexgen-vid` is deleted and `vid` is removed from links.
  - Tests in `visitor-tracking.test.ts` and `visitor-id.test.ts` cover this.
- **VERIFIED: what gets captured.**
  - Captured: the page path (query string dropped), the referrer reduced to its origin only (for example `https://chatgpt.com`), and `utm_source`, `utm_medium` and `utm_campaign`, each checked against `^[a-z0-9_-]{1,100}$`.
  - Not captured: `utm_content`, `utm_term`, or the full landing URL.
  - Values with dots fail that check. `utm_source=chatgpt.com` is **thrown away**. So is the site's own `utm_source=nexgen-capital.com` from `landing-pages.ts`. This is a real gap.
  - The landing page itself does arrive, as the path of the first `page_view`.
- **VERIFIED: links to `ngcapital.net/?start=1` keep the visitor ID.** `installVidLinkDecorator()` adds `vid` at click time, but only with consent.
  - Campaign tags: the Florida landing-page buttons add fixed UTMs (`intakeHref`). Other buttons (home page, learning center, loan programs, Naples page) are a plain `?start=1` link, so the visitor's original UTMs are **not** passed on.
  - **NOT VERIFIED:** whether `installVidLinkDecorator` is actually started at the app root. Its call site was not found in `__root.tsx`. Since your earlier end-to-end test worked, it is likely started elsewhere, but this needs one more check.
- **VERIFIED: without consent, or with storage blocked, nothing is tracked.** Errors are caught, so the site keeps working. Those leads arrive with no attribution and must be labeled Unknown.
- **VERIFIED: the Mortgage Core intake (ngcapital.net) never calls the tracker itself.**
  - `src/lib/visitorTracking.ts` only reads `?vid` into `ng_visitor_id`.
  - It saves that ID without a consent check on ngcapital.net. NexGen Foundation only sends the ID after consent, but this is still a privacy point to review.
- **NOT VERIFIED:** live traffic volume and the deployed version of the site.

## 2. Ask Cesar (`supabase/functions/chat-lead-upsert/index.ts`)

- **VERIFIED: access is protected.** Calls need `Authorization: Bearer CHAT_INGEST_SECRET` (lines 12–16), so they come from the Ask Cesar server, not from browsers.
- **VERIFIED: how it matches an existing lead (lines 85–100), in this order:**
  1. `chat_session_id`
  2. email, case-insensitive, with `maybeSingle`
  3. phone, by loading **every** lead that has a phone and comparing digits in memory
- **VERIFIED: what it updates (lines 105–114).** Only fields that are currently empty get filled.
  - Fields it can fill: first_name, last_name, email, phone, loan_purpose, property_type, property_value, credit_range, employment_type, annual_income, timeline, intent_tag, notes, chat_session_id.
  - **`source` and `source_id` are never in the update set, so the original source of an existing lead is kept.**
- **VERIFIED: what a new lead gets (lines 118–123).** It sets `source_id` to the "AI Chat" lead source, `status=new_lead` and `lead_score=0`. It does **not** set `source`, so those leads show an empty source text.
- **VERIFIED: it cannot link to a website visitor.** The request has no `visitor_id`, UTM or referrer, and nothing reads `website_visitors`.
  - The Foundation site does add `vid` to askcesar.ngcapital.net links. Whether the Ask Cesar app reads it is **NOT VERIFIED**, because that app's code is not in either project.
- **VERIFIED: the reply includes the internal `lead_id`.** Only the authenticated caller receives it, which is acceptable but worth noting.

## 3. Duplicates, merges, imports and other updates

- **`submit-lead`, VERIFIED:** it always creates a new lead, with no duplicate check. `source` is set to the form name. A visitor is linked only where it has no lead yet (`.is("lead_id", null)`), so the first link is kept.
- **Manual create and edit (`src/lib/crm/leadIntake.ts`), VERIFIED:** saving writes `source_id: data.source_id || null` and `source: data.referral_source || undefined`.
  - The form is pre-filled from the lead (lines 380–385), so values are kept unless staff change them.
  - **Clearing the source dropdown blanks `source_id`, and choosing a new referral source replaces `source`.** This is a human overwrite, with no history of the original.
- **Status changes (`Leads.tsx`, `RecordWorkspace.tsx`, `moveToPipeline.ts`), VERIFIED:** they update `status` only.
- **Lead source rules (`applyLeadSourceRules`), VERIFIED:** they change `lead_score` and `assigned_to`, and add tags and tasks. They never touch the source.
- **Arive webhook, VERIFIED:** it finds the lead by `crm_reference_id` and only sets `status`. Its event metadata says `source: "arive-webhook"`.
- **Arive import (`src/lib/import/arive.ts`), VERIFIED by code comment and function at line 281:** it fills empty fields and never overwrites filled ones.
- **People duplicate check (`DuplicateMatchModal`, `find_person_matches`) and People import, VERIFIED:** these work on people and contacts, not `leads.source`. NOT APPLICABLE to lead attribution.
- **Database triggers on `leads`, VERIFIED by trigger list only:** `update_leads_updated_at`, `trg_notify_lead_created_email`, `trg_tl_lead_created`, `trg_ms_from_lead`. None are named as source writers. Their bodies were not read line by line, so this is NOT VERIFIED.
- **Zapier (`src/lib/integrations/zapier.ts`):** the outgoing message has a fixed `source: "ngcapital-crm"`. Whether lead source or UTM fields are included is NOT VERIFIED.
- **Arive export mappings:** no attribution field is known to be mapped. This is NOT VERIFIED, because the mappings are stored in the database and were not read.
- **No lead-merge feature exists:** VERIFIED. No code merges two leads.

## 4. Additional risks

1. **Dropped campaign tags.** The UTM check rejects dots, which silently drops `chatgpt.com`, `perplexity.ai` and the site's own `nexgen-capital.com` tags.
2. **Duplicate chat leads.** When two leads share an email, `maybeSingle` errors and `existing` becomes null. Ask Cesar then creates another duplicate lead.
3. **Phone lookup loads every lead.** It reads all leads with a phone into memory. This is a performance and data-exposure concern inside the server.
4. **Duplicate form leads.** `submit-lead` has no duplicate check, so the same person can create several leads, each with its own source.
5. **No original-source history.** A manual edit can replace or blank the source with no record of what it was.
6. **Ask Cesar leads have no source text.** They set `source_id` but leave `source` empty, so reports grouped by `source` miss them.
7. **ngcapital.net stores `vid` without its own consent check.** NexGen Foundation only sends it after consent.

## 5. Recommended implementation order

1. Allow dots in the UTM check, add `utm_content` and `utm_term`, and pass the visitor's original UTMs on to ngcapital.net links. This is in NexGen Foundation and has the lowest risk.
2. Classify referrers in `track-visitor-activity` into channel, platform and confidence (confirmed, tagged or unknown). Add last-touch fields while keeping first touch as it is.
3. Copy attribution onto the lead **once, at creation**, in `submit-lead` and `chat-lead-upsert`, into new write-once columns. Never update them afterwards.
4. Have Ask Cesar accept `vid` and referrer, and fix the email-match error and the full phone scan.
5. In the CRM: show "Unknown" instead of "Direct", show the original attribution read-only on the lead, and optionally add it to the Zapier and Arive exports.

## 6. What the eventual changes would affect

- **NexGen Foundation:** `src/lib/visitor-tracking.ts` (`safeCampaign`, `buildTrackingPayload`), `src/lib/visitor-id.ts` (`withVid`), `src/lib/landing-pages.ts`
- **Mortgage Core server functions:** `supabase/functions/track-visitor-activity/index.ts`, `supabase/functions/submit-lead/index.ts`, `supabase/functions/chat-lead-upsert/index.ts`
- **Mortgage Core site and CRM screens:** `src/lib/visitorTracking.ts`, `src/pages/WebsiteVisitors.tsx`, `src/components/crm/WebActivityPanel.tsx`, `src/lib/crm/leadIntake.ts` (keep attribution read-only), and optionally `src/lib/integrations/zapier.ts` and the Arive export mappings
- **Database (new nullable columns only):** `website_visitors` (utm_content, utm_term, first_landing_path, last_* fields, channel, ai_platform, confidence) and `leads` (attribution_channel, attribution_platform, attribution_confidence, first_touch)
- **External, not in either project:** the Ask Cesar app, to forward `vid` and referrer

Approving this report does not start any changes. Tell me which steps to build.
