# Borrower / Client Portal

A separate authenticated area at `/portal` where borrowers can track their loan, upload documents, review and acknowledge loan scenarios, and message their loan officer. CRM stays untouched — the portal is an extension.

## How a borrower gets in

1. Loan officer clicks **Invite to Portal** on a deal in the CRM. This generates a one-time, signed invite token tied to that `deal_id` and the borrower's email.
2. Borrower receives an email (via existing Resend connector) with a link: `/portal/accept?token=…`.
3. Accept page asks them to sign up (Email/password or Google). On signup, the token is consumed and a `portal_users` row is created that binds their `auth.user.id` to the specific deal/lead/contact. No email-matching guesswork — the LO controls the link.
4. Subsequent visits: borrower signs in at `/portal/login` and lands on their dashboard.

## What's in the portal

```text
/portal/login              Email/password + Google
/portal/accept             Token redemption + signup
/portal                    Dashboard: status timeline, next step
/portal/documents          Required docs checklist + upload
/portal/scenarios          Loan options prepared by the LO + acknowledge
/portal/messages           Thread with assigned loan officer
```

- **Status timeline** — Reads `deals.stage` + `deal_stage_history`. Visual stepper through the 6 pipeline stages with timestamps.
- **Documents** — Lists categories from `crm_document_categories`, shows what's uploaded vs. missing, lets the borrower upload to `crm-documents` storage. Files are recorded in `crm_attachments` so the LO sees them in the CRM workspace automatically.
- **Scenarios** — Read-only view of `loan_scenarios` for their lead. Borrower can press **Acknowledge** (stored in a new `loan_scenario_acknowledgements` table — not e-sign, just a recorded acknowledgement).
- **Messages** — Lightweight thread (new `portal_messages` table) with realtime updates; the LO sees the same thread inside the existing CRM record workspace.

## Backend changes (additive only)

New tables (with RLS + GRANTs):

- `portal_invites` — `id, deal_id, lead_id, contact_id, email, token_hash, expires_at, accepted_at, accepted_by, created_by`
- `portal_users` — `user_id (pk), deal_id, lead_id, contact_id, created_at` — the binding row that authorizes a borrower
- `portal_messages` — `id, deal_id, sender_user_id, sender_role ('borrower'|'officer'), body, created_at, read_at`
- `loan_scenario_acknowledgements` — `id, scenario_id, deal_id, user_id, acknowledged_at, ip, user_agent`

Helper RPC `portal_user_deal()` → returns the deal the signed-in borrower owns. Used in RLS on the four tables above and to scope reads of `deals`, `deal_stage_history`, `loan_scenarios`, `crm_attachments`, `crm_document_categories`.

Two new edge functions:

- `portal-invite-create` — LO-only. Generates token, stores hash, emails the borrower.
- `portal-invite-accept` — Validates token, links the newly signed-up user to the deal via `portal_users`, marks invite consumed.

Storage: reuse the existing `crm-documents` bucket. Add RLS allowing the bound borrower to upload/read files for their own deal only.

## CRM side (minimal)

- New **Invite to Portal** button on the deal record workspace → calls `portal-invite-create`.
- Messages panel in the record workspace reads/writes `portal_messages` so the LO can reply.
- Everything else (kanban, leads, scenarios editor) is unchanged.

## Auth

Lovable Cloud managed Google + email/password. Borrowers and CRM staff share the same auth pool; access control is purely by RLS: CRM pages already check `has_role`, portal pages check `portal_users.user_id = auth.uid()`. A CRM user without a `portal_users` row simply sees an empty portal — and vice versa.

## Out of scope (this iteration)

- True e-signature (DocuSign-style). The acknowledge button is a recorded click, not legally binding.
- Conditional document requirements per loan product.
- Push/SMS notifications — only the existing email channel.
