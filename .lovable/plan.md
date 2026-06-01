# CRM Audit & Fix Plan

I ran a full audit of the CRM (record workspace, leads/contacts/deals, blog admin, edge functions, auth/RLS). Found **21 concrete bugs** grouped by severity. No DB schema changes are required — all fixes are in frontend code + edge functions.

## P0 — Silent data loss (fix first)

Every CRM write below is missing the `created_by` (or equivalent) column that RLS `WITH CHECK` policies require, so the insert is silently rejected. This is why "nothing happens" on many actions.

1. **Auto-create contact** — `RecordWorkspace.tsx` `handleStatusChange`: add `created_by: user.id`.
2. **Auto-create deals** — same function: add `created_by` and `loan_officer_id` to each mapped row.
3. **Auto-link `lead_contacts`** — same function: add `created_by: user.id`.
4. **Email logging** — `ActionModals.tsx` `EmailModal`: add `created_by` to `email_logs` insert; only log the `crm_activities` row if the email_log insert succeeded.
5. **Blog Admin generate** — `BlogAdmin.tsx`: replace raw `fetch` + manual headers with `supabase.functions.invoke()` so auth/anon-key headers are always correct.
6. **`generate-blog-post` lockout** — allow `loan_officer` in addition to `admin` in the role check.
7. **Link company modal** — `LinkContactCompanyModals.tsx`: add `created_by: user.id` to `crm_contact_companies` insert.

## P1 — Degraded behavior (the user-reported issues)

8. **Blog drafts can't be edited** — Pencil icon currently only toggles publish status. Add an "Edit" action that opens an edit sheet (title, slug, excerpt, content_html, tags, featured_image, meta). View (Eye) and Distribute (Send) already exist — verify both work after fix #5.
9. **Contacts list → workspace** — add an "Open workspace" link button on each row in `Contacts.tsx` pointing to `/crm/contacts/:id` (parity with Leads).
10. **Dead "More actions" button** in `LeftRail.tsx` — remove until wired.
11. **Tabs grid mismatch** — `RecordWorkspace.tsx`: use `grid-cols-2` for contact-kind, `grid-cols-3` for lead-kind.
12. **Loan comparison email goes to wrong recipient** — `send-loan-comparison/index.ts` is hardcoded to `avantifundings@gmail.com`. Change `to` to the borrower's email and BCC the office address.
13. **Lead tag insert missing `created_by`** — `Leads.tsx`.
14. **Contact-kind workspace can't resolve its lead** — `RecordWorkspace.tsx:50` reads non-existent `rec.lead_id`. Resolve via a `lead_contacts` join so emails/attachments/tags load for contact workspaces.
15. **Contact-kind workspace can't load deals** — same root cause. Fetch deals through `lead_contacts → deals` for lead-kind, and directly by `contact_id` for contact-kind.

## P2 — Polish

16. **Admin-only nav items shown to all roles** — gate Blog Manager, Social Media, Subscribers, Email Templates in `AppSidebar.tsx` behind `role === 'admin'`.
17. **Source filter mismatch** in `Leads.tsx` — normalize on `lead_sources.name`.
18. **Upload blocked for contact-only workspaces** — `ActionModals.tsx`: allow upload with `contactId` alone.
19. **Dashboard `.not("stage","in",...)`** — switch to array syntax.
20. **In-memory rate limiter** in `submit-lead` — note as known limitation (durable fix requires a `rate_limits` table; out of scope since "no schema changes").
21. **Verify Gemini model name** in `generate-blog-post`.

## What I will NOT touch

- Database schema, RLS policies, triggers, edge function auth config (`config.toml`).
- The Mortgage Application Hub, Rate Lock Engine, Blog A/B engine, Booking flow, Landing page.
- Anything in `src/integrations/supabase/` (auto-generated).

## Verification

After each batch I'll:
- Build the project (auto-run).
- Read modified files to confirm `created_by` is present and `useAuth().user.id` is in scope.
- For edge functions: redeploy + `supabase--curl_edge_functions` smoke test for `send-loan-comparison` and `generate-blog-post`.

## Out of scope (call out, don't fix)

- "Restructure CRM data model" (rejected in the scope question).
- Borrower portal.
- Migrating off the existing CRM to Twenty (covered in prior analysis).

Approve to start with the P0 batch.
