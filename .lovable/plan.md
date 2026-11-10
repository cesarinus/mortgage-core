# Audit Report: AI Referral Attribution into Mortgage Core (read-only)

No files, data, settings or deployments were changed. Only source code and column names were read. No borrower data was queried.

## 1. Executive summary
**Status: partially working at the visitor level, missing at the lead level.**
- First-touch `utm_source/medium/campaign` and `first_referrer` are saved for a website visitor (`website_visitors`). They reach a lead only indirectly, through the `vid` link.
- The lead itself (`leads.source`) stores only the form name (`application_hub`, `contact_form`, `calculator`, `website`). It never stores the traffic channel.
- No code anywhere identifies AI platforms. ChatGPT, Perplexity, Claude, Copilot and Gemini all show up as a raw referrer string at best.
- The Mortgage Core site (ngcapital.net) never calls `track-visitor-activity` itself. Attribution exists only if nexgen-capital.com tracked the visitor and passed `?vid=`. That tracker was still listed as outstanding and is **not verified** in this audit.

## 2. Current lead flow
```text
nexgen-capital.com (tracker, if installed) --track-visitor-activity--> website_visitors (first-touch UTM/referrer) + website_events
        | link to ngcapital.net/?start=1&vid=XXXX
ngcapital.net: captureVisitorIdFromUrl() -> localStorage ng_visitor_id
        | ApplicationHub / ContactFormSection / MortgageCalculator submit {source, visitor_id}
submit-lead -> leads.insert(source=form name) -> links website_visitors.lead_id + website_events.lead_id
```
| Entry point | Creates the lead | Receiving function | Attribution passed |
|---|---|---|---|
| Application hub `/?start=1` | Submit | `submit-lead` | `source="application_hub"` + `visitor_id` |
| Contact form | Submit | `submit-lead` | `source="contact_form"` + `visitor_id` |
| Calculator quote/email/print | Action | `submit-lead` | `source="calculator*"` + `visitor_id` |
| Ask Cesar chat | Contact captured | `chat-lead-upsert` | `source_id = lead_sources "AI Chat"`. No `vid`, UTM or referrer |
| Phone / email | Manual entry by staff | CRM UI | None |
| Arive LOS | Webhook | `arive-webhook` | `metadata.source="arive-webhook"` only |
| External calculator iframe (nexgen-capital.com) | Not in this project | n/a | Unknown |

## 3. Attribution inventory
| Field | Captured | Persisted | Passed to lead | Reportable |
|---|---|---|---|---|
| utm_source / medium / campaign | Yes (tracker body) | `website_visitors`, first touch only | Indirectly via `vid` | Visitors page only |
| utm_content / utm_term | Kept in event `path` query only | `website_events.path` | No | No |
| Referrer | Yes (`body.referrer`) | `website_visitors.first_referrer`, first touch | Indirectly | Hostname on visitors page |
| Landing page | Event paths | `website_events.path` | Indirectly | Manual only |
| First touch | Yes (insert only) | Yes | Indirectly | Partial |
| Last touch | **No.** Updates never touch UTM or referrer | No | No | No |
| Visitor ID | `vid` URL param → localStorage | `website_visitors.visitor_id` | Yes | Yes |
| Lead source | Form name | `leads.source` / `source_id` | Yes | Yes, but means form, not channel |
| AI platform | **No** | No | No | No |

When the referrer is missing, `WebsiteVisitors.tsx` shows **"Direct"**. That is the empty-referrer-equals-direct assumption you flagged. Without a `vid`, a ngcapital.net lead has no attribution at all.

## 4. AI referral detection
None is implemented. Reliability by platform, once a rule exists:
- **Confirmed (referrer present):** chatgpt.com, chat.openai.com, perplexity.ai, claude.ai, copilot.microsoft.com, gemini.google.com. These are reliable only when the browser sends a referrer.
- **Confirmed (tag present):** ChatGPT often adds `utm_source=chatgpt.com`. Manually tagged links (`utm_source=perplexity` etc.) would already be stored.
- **Unknown:** AI apps and browsers that strip the referrer. These show up as empty and must be labeled "Unknown", not "Direct" or "AI".
- Google, Bing, Facebook and Instagram are also not classified. Today they are raw hostnames only.

## 5. Reporting gaps
- AI-referred lead count, per-platform breakdown: **not possible.**
- Landing pages for AI leads: only by manually joining visitor events.
- AI leads that completed an application: not possible, because no channel is stored on the lead.
- Funded loans by channel: not possible. `pipeline_opportunities` has no channel and Arive exports carry no attribution.

## 6. Risks
- **Overwrite and loss:** last touch is never kept. Ask Cesar leads lose all web attribution. Phone and email leads have none.
- **Linking:** a lead is linked to a visitor only once (`.is("lead_id", null)`), which preserves the original link. Email-based linking in the tracker picks the most recent lead with that email, which could attach history to the wrong duplicate.
- **Duplicates and merges:** `chat-lead-upsert` updates an existing lead. Whether that update rewrites `source_id` is unverified and needs a line-level check. Merge or import tools were not checked for `source` handling.
- **Privacy:** good. Query strings are stripped except `utm_*` and `start`, calculator amounts are bucketed, and `vid` is random rather than a lead ID. One concern: the tracker accepts `email` in its request body, which is personal data in an analytics call. Whether the tracker respects cookie consent sits in the other project and is unverified.
- **Mislabeling:** "Direct" is shown for missing referrers.

## 7. Recommended minimum changes (not implemented)
1. **`track-visitor-activity/index.ts` + `website_visitors`** (new nullable columns only): add `utm_content`, `utm_term`, `first_landing_path`, `last_utm_source/medium/campaign`, `last_referrer`, `last_seen_channel`, and `ai_platform`/`channel`, using a referrer-and-UTM classifier with a `confirmed | tagged | unknown` confidence. *Why:* gives first and last touch plus AI detection. *Impact:* tracking backend only, no visible change on the site.
2. **`leads`** (new nullable columns): `attribution_channel`, `attribution_platform`, `attribution_confidence`, `first_touch` jsonb. `submit-lead` copies these from the linked visitor once, at insert, and never on update. *Why:* lets you report directly on leads and keeps the original source. *Impact:* lead intake writes extra fields. Existing workflows are unchanged.
3. **ngcapital.net client (`visitorTracking.ts`)**: when no `vid` is present, capture `document.referrer`, UTMs and the landing path in first-party storage and send them with `submit-lead`. *Why:* covers visitors who land directly on Mortgage Core. *Impact:* public site, small, no visible UI change. Must respect the existing consent banner.
4. **`chat-lead-upsert`**: accept `visitor_id` and referrer, and never overwrite an existing source. *Impact:* Ask Cesar intake.
5. **`WebsiteVisitors.tsx`**: show "Unknown" instead of "Direct" when nothing is known. *Impact:* CRM display only.
6. Optional: add the attribution fields to the Arive/Zapier export mappings, so funded-loan reporting is possible. *Impact:* LOS export.

## 8. Inspected
- **Files:** `src/lib/visitorTracking.ts`, `src/components/landing/ApplicationHub.tsx`, `src/components/landing/ContactFormSection.tsx`, `src/components/calculator/MortgageCalculator.tsx`, `src/pages/WebsiteVisitors.tsx`, `src/components/crm/WebActivityPanel.tsx`
- **Functions:** `submit-lead`, `track-visitor-activity`, `chat-lead-upsert`, `arive-webhook`. Zapier/Arive settings pages were checked by name only.
- **Tables (columns only):** `leads` (`source`, `source_id`, `lead_score`), `lead_sources`, `lead_source_rules`, `lead_events` (`id`, `lead_id`, `event_type`, `points`, `metadata`, `created_at`), `website_visitors`, `website_events`, `contacts`, `pipeline_opportunities` (`source_system`).

## 9. Evidence
- **Verified by code read and column query:** sections 2, 3 and 4, the missing AI logic, first-touch-only behavior, the "Direct" fallback, and that no `track-visitor-activity` caller exists in this project.
- **Assumed or unknown:** whether the nexgen-capital.com tracker is live and consent-gated; whether `chat-lead-upsert` overwrites the source on update; how merge and import tools treat `source`; real AI referrer rates. No live traffic or production rows were examined.

Approving this report does not start any changes. Tell me which recommendations to build, if any.
