

# Mortgage CRM — Phase 1 Implementation Plan
**Version: v1.0 | Scope: Auth + Leads + Contacts + Pipeline**

---

## 1. Authentication & Role-Based Access

**User sign-up and login** with email/password via Supabase Auth. After login, users land on their dashboard.

**Three roles:**
- **Admin** — Full access to everything: manage team members, assign roles, view all leads/deals/contacts, and configure settings
- **Loan Officer** — Manages their own leads, contacts, and deals; can view shared team data
- **Processor / Assistant** — Read-only access to assigned deals and contacts; can update document status but cannot create or delete records

Roles are stored securely in a dedicated `user_roles` table with Row-Level Security enforced on all tables.

---

## 2. Modern SaaS Layout

- **Sidebar navigation** with collapsible menu: Dashboard, Leads, Contacts, Pipeline, Settings
- **Top bar** with user avatar, notifications bell, and quick-add button
- **Dashboard page** showing key metrics: total leads, active deals, deals by stage, and recent activity feed
- Clean card-based design with a professional color palette

---

## 3. Leads Module

**Lead management** for capturing and tracking prospective borrowers:

- **Lead list view** — Searchable, sortable table with columns: Name, Phone, Email, Source, Status, Assigned To, Created Date
- **Add Lead form** — Manual entry with fields: first name, last name, email, phone, source (referral, web form, walk-in, etc.), notes
- **Lead detail page** — Full view of lead info, activity timeline, and a button to convert a lead into a Contact + Deal
- **Lead assignment** — Admins and Loan Officers can assign leads to team members
- **Public web form** — A standalone, publicly accessible lead capture page that creates new leads in the system automatically (no login required)

---

## 4. Contacts Module

**Contact management** for borrowers, referral partners, and other relationships:

- **Contact list view** — Searchable table with columns: Name, Email, Phone, Type (Borrower / Partner / Other), Linked Deals
- **Add/Edit Contact form** — Name, email, phone, address, contact type, notes
- **Contact detail page** — Contact info, linked deals, and activity history
- **Lead-to-Contact conversion** — When a lead is converted, their info auto-populates a new contact record

---

## 5. Deals & Pipeline

**Visual pipeline** to track mortgage deals through your custom stages:

### Pipeline Stages (in order):
1. New Lead
2. Contacted
3. Application Sent
4. Docs Received
5. Underwriting
6. Approved
7. Clear to Close
8. Closed
9. Lost

### Features:
- **Kanban board view** — Drag-and-drop deal cards across stage columns
- **Deal list view** — Alternate table view with filtering and sorting
- **Deal card** — Shows borrower name, loan amount, loan type, and days in current stage
- **Deal detail page** — Full deal info: borrower contact, loan amount, loan type, property address, stage, assigned loan officer, notes, and timeline of stage changes
- **Create deal** — From scratch or by converting a lead; links to a contact automatically
- **Stage change tracking** — Every stage transition is logged with timestamp and user

---

## 6. Settings Page (Admin Only)

- **Team management** — Invite new users, assign/change roles, deactivate accounts
- **Profile settings** — Update name, email, password

---

## 7. Database Architecture (Supabase)

All data lives in Supabase PostgreSQL with strict Row-Level Security:

- **profiles** — User display info (linked to auth.users)
- **user_roles** — Secure role assignments (admin / loan_officer / processor)
- **leads** — Lead records with source, status, assignment
- **contacts** — Contact records with type classification
- **deals** — Deal records with loan details, stage, linked contact
- **deal_stage_history** — Audit log of every stage change
- **lead_sources** — Reference table for lead sources

---

## Build Order

1. **Supabase setup** — Database tables, RLS policies, roles, and helper functions
2. **Auth flow** — Sign up, login, role-based route protection
3. **App shell** — Sidebar layout, navigation, dashboard skeleton
4. **Leads module** — List, create, detail, assignment, public web form
5. **Contacts module** — List, create, detail, lead conversion
6. **Pipeline module** — Kanban board, deal detail, stage tracking
7. **Settings** — Team management, profile

