## Contact / Lead Record Workspace — Implementation Plan

A HubSpot-style full-page workspace for any Lead or Contact, with Catch-up + Activities tabs, action rail, deal/document sidebar, and mortgage snapshot. Built additively per the project's change-control rules (no edits to existing core tables; all new schema is extension).

### Routes
- `/crm/leads/:id` — workspace bound to `leads` row
- `/crm/contacts/:id` — workspace bound to `contacts` row
- Update Leads list + Pipeline cards to deep-link into these routes

### Layout (3-column, sticky)

```
┌──────────────┬──────────────────────────────┬──────────────┐
│ Left rail    │  Tabs: Catch-up | Activities │ Right rail   │
│ - Avatar     │                              │ - Companies  │
│ - Identity   │  Catch-up:                   │ - Deals      │
│ - Owner      │   Inbound / Outbound         │ - Tickets    │
│ - Loan facts │   Health & Sentiment         │ - Documents  │
│ - Tags       │   Challenges / Positives     │              │
│ - Actions    │   Mortgage Snapshot          │              │
│              │  Activities: timeline+filters│              │
└──────────────┴──────────────────────────────┴──────────────┘
```

Action rail buttons (each opens a modal/sheet that writes a row + auto-creates a timeline activity):
Note · Email · Call · Task · Meeting · Upload · More

### New database (extension-only, all RLS-locked to record owner / admin)
- `crm_activities` — unified timeline (type, ref_id, lead_id, contact_id, deal_id, actor, body, metadata, created_at)
- `crm_notes` — rich-text notes, pinned flag
- `crm_tasks` — title, due_at, priority, status, assignee
- `crm_calls` — outcome, duration_sec, follow_up_at, direction
- `crm_meetings` — start_at, end_at, location, video_link
- `crm_attachments` — bucket path, category, size, mime, expires_at, version
- `crm_document_categories` — seed: Tax Return, W-2, Pay Stub, Bank Statement, ID, Credit, VOE, 1099, Business Tax Return, P&L
- `crm_companies` + `crm_contact_companies` — many-to-many employer/business links
- `mortgage_profiles` (1:1 with lead) — loan_program, purchase_price, down_payment, occupancy, property_type, est_income, est_dti, est_monthly_payment, stage
- `lead_sentiment` — temperature (hot/warm/cold/unresponsive/ready), summary, recommendations[], challenges[], positives[], generated_at

Existing `deals`, `leads`, `contacts`, `lead_events`, `lead_tags`, `email_logs`, `bookings` are reused as-is.

Triggers: every insert into notes/tasks/calls/meetings/attachments + lead status / deal stage change writes a `crm_activities` row.

### Storage
- New bucket `crm-documents` (private). Path `{lead_id}/{category}/{uuid}-{filename}`. RLS via signed URLs from an edge function; admins + record owners only.

### Front-end pieces (all new, no edits to frozen core)
- `src/pages/crm/RecordWorkspace.tsx` — shell, loads record + tabs
- `src/components/crm/LeftRail.tsx` — identity + action buttons
- `src/components/crm/RightRail.tsx` — Companies / Deals / Documents collapsibles
- `src/components/crm/tabs/CatchUpTab.tsx` — Inbound, Outbound, Sentiment gauge, Challenges, Positives, Mortgage Snapshot, "Income Analysis (Coming Soon)" placeholder
- `src/components/crm/tabs/ActivitiesTab.tsx` — filtered timeline, expandable cards
- `src/components/crm/actions/{NoteModal,EmailModal,CallModal,TaskModal,MeetingModal,UploadModal}.tsx` — full CRUD, optimistic React Query
- `src/components/crm/DocumentCenter.tsx` — drag-drop, preview, category tag, version
- `src/components/crm/SentimentGauge.tsx` — visualization
- `src/lib/crm/ai.ts` — thin service layer ready for future Lovable AI calls (sentiment, summary, next-action) — stubbed, returns deterministic fallback today
- Wire deep-links from `Leads.tsx` row click and `Pipeline.tsx` card click

### Email sending
Reuses the existing `send-review-request` pattern → new edge function `crm-send-email` (template-aware, logs to `email_logs` + `crm_activities`). Templates page already exists.

### AI hooks (architecture only, not invoked yet)
- `crm-generate-sentiment` edge function scaffold (calls Lovable AI Gateway, gemini-2.5-flash) — wired but gated behind a "Refresh AI summary" button so we don't burn credits passively.
- Income calc / DTI / AUS left as typed interfaces in `src/lib/crm/income.ts` with TODO stubs.

### Permissions
Reuses `is_admin()` + record-ownership checks already in `leads`/`deals` policies. New tables follow the same pattern: admin full access; loan officer / processor see rows tied to their leads/deals.

### Out of scope for this slice
- Real Twilio/VAPI calling (logging only)
- Real OCR / income engine (schema + UI placeholder only)
- Calendar provider sync (fields stored, no external sync)
- Dark mode polish (uses existing tokens, will inherit when toggled)

### Sequencing
1. Migration (all new tables + bucket + RLS + activity triggers) — single approval
2. Edge functions (`crm-send-email`, `crm-generate-sentiment`, `crm-signed-url`)
3. Workspace shell + routing + left rail
4. Catch-up tab + sentiment + mortgage snapshot
5. Activities tab + all 6 action modals (CRUD wired)
6. Right rail (Companies, Deals, Document Center)
7. Deep-link from Leads list and Pipeline

Estimated: large change set, ~15–20 new files. No edits to frozen core modules; existing pages get only deep-link additions.

Approve to proceed and I'll start with the migration.
