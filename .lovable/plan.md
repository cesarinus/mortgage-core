## Goal

Revert the unified single-stage model. Reinstate two independent enums:
- **Leads**: `New → Contacted → Qualified → Unqualified` (4 statuses only)
- **Pipeline/Opportunities**: a NEW `pipeline_opportunities` table with stages `application_sent → underwriting → approved → clear_to_close → closed → lost`

Pipeline becomes a separate record set, linked to leads via FK. Leads only "convert" into opportunities via a Move-to-Pipeline action.

---

## Database changes (additive)

**Migration 1 — new opportunity table + LOS queue rebind**

```sql
CREATE TABLE public.pipeline_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL UNIQUE,                  -- soft FK to leads.id
  stage text NOT NULL DEFAULT 'application_sent',
  loan_amount numeric,
  property_address text,
  primary_contact_id uuid,                       -- soft FK to contacts.id
  title_company_id uuid,                         -- soft FK to crm_companies.id
  lender_company_id uuid,                        -- soft FK to crm_companies.id
  close_date timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_opportunities TO authenticated;
GRANT ALL ON public.pipeline_opportunities TO service_role;

ALTER TABLE public.pipeline_opportunities ENABLE ROW LEVEL SECURITY;

-- Admin all access + lead owners can manage their opportunity
CREATE POLICY "Admins all opportunities" ON public.pipeline_opportunities
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Lead owners read opportunities" ON public.pipeline_opportunities
  FOR SELECT USING (user_owns_lead(lead_id));
CREATE POLICY "Lead owners insert opportunities" ON public.pipeline_opportunities
  FOR INSERT WITH CHECK (user_owns_lead(lead_id) AND created_by = auth.uid());
CREATE POLICY "Lead owners update opportunities" ON public.pipeline_opportunities
  FOR UPDATE USING (user_owns_lead(lead_id));

CREATE TRIGGER trg_pipeline_opps_updated_at
  BEFORE UPDATE ON public.pipeline_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

**Lead status enum rollback**
- Revert prior unified migration so `lead_status` enum exposes only: `new`, `contacted`, `qualified`, `unqualified` (legacy values stay for safety but unused). Existing rows holding other values are downcast back: `prequalified→qualified`, `application_sent/underwriting/approved/clear_to_close/closed → unqualified` (since they now belong in opportunities — they'll get auto-created opportunity rows in the same migration where stage maps to the matching pipeline stage).
- Update `auto_progress_lead_pipeline` trigger to only advance through `new → contacted → qualified`, then stop (no auto application_sent etc.).

**LOS queue**
- Keep `los_sync_queue` but repoint `opportunity_id` to `pipeline_opportunities.id` (the table was created in last migration). Add column comment.

---

## Code changes

### `src/lib/crm/stages.ts` (rewrite)
- Export `LEAD_STATUSES = ['new','contacted','qualified','unqualified']` with labels/badges.
- Export `PIPELINE_STAGES = ['application_sent','underwriting','approved','clear_to_close','closed','lost']` with labels/badges.
- Drop the unified list.

### `src/lib/crm/stateMachine.ts`
- Two separate transition maps:
  - `lead`: `new→[contacted,unqualified]`, `contacted→[qualified,unqualified]`, `qualified→[unqualified]` (the move-to-pipeline button handles the conversion, not a status transition), `unqualified→[new]`.
  - `opportunity` (renamed from `deal`): exactly the spec'd 6-stage map.
- `normalizeStatus` no longer aliases lead values to pipeline names.

### `src/pages/Leads.tsx`
- Status dropdown: only the 4 lead statuses.
- Filter out leads that have a row in `pipeline_opportunities` (left join + filter).
- Replace the "Application Complete" button with **Move to Pipeline** (only visible when `status='qualified'`):
  - Validates `property_address` filled + at least one linked contact in `lead_contacts`.
  - Inserts a `pipeline_opportunities` row (copies loan_amount, property_address, primary contact).
  - Sets `leads.status='unqualified'`.
  - Enqueues LOS sync.
  - Toast "Moved to Pipeline — Application Sent" and navigates to `/pipeline/kanban`.

### `src/pages/Pipeline.tsx` (rewrite data source)
- Read from `pipeline_opportunities` joined to `leads` (for name) and contacts/companies.
- Kanban columns: the 6 pipeline stages.
- Click-and-hold + drag uses the opportunity transition map.
- Updates write `pipeline_opportunities.stage`, not `leads.status`.
- Table view shows opportunities only.

### `src/components/crm/LeftRail.tsx` / `RecordWorkspace.tsx`
- Lead record uses lead enum dropdown (4 statuses).
- If the lead has a linked opportunity, show a read-only chip "In Pipeline · {stage}" linking to the opportunity in the Pipeline.

### Edge functions
- `submit-lead`, `chat-lead-upsert`, `create-booking`: write `status='new'` (revert from `new_lead`).
- No other edge function touches pipeline stages.

---

## Out of scope / unchanged
- `leads` table columns (keeps `loan_amount`, `property_address` from prior migration — still useful).
- `crm_contacts`, `crm_companies`, borrower portal, n8n payloads.
- `deals` table (legacy, untouched).

---

## Order of operations
1. Migration: create `pipeline_opportunities`, rebind `los_sync_queue`, revert lead enum trigger, downcast lingering lead.status values, auto-create opportunity rows for leads that were already advanced past qualified under the unified scheme.
2. After migration approved → rewrite `stages.ts`, `stateMachine.ts`, `Leads.tsx`, `Pipeline.tsx`, `LeftRail.tsx`, `RecordWorkspace.tsx`, the 3 edge functions.
3. Sanity-check the build.
