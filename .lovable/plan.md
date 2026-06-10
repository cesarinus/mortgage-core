## ARIVE LOS Integration Audit & Remediation — Plan

This is a **large, multi-phase build**. Before I write code, I want your sign-off on scope, sequencing, and a few open questions so we don't burn credits rebuilding things twice.

---

### Open questions I need answered first

1. **Are you actually calling ARIVE directly, or through Zapier?** Today the CRM POSTs a JSON payload to a Zapier Catch Hook; Zapier then maps fields to ARIVE's Create Loan action. If Zapier is doing the mapping, most of "Phase 3 mapping layer" should stay in Zapier, not in the CRM. Confirm which side owns the mapping.
2. **Do you have ARIVE's Create Loan API spec / Zap template?** I can't invent the required-field matrix — I need the official ARIVE field list (names, enums, formats). Without it, Phase 2 is guesswork. Paste the doc link or export the Zap step.
3. **What's the actual error Zapier/ARIVE is returning right now?** "Create Loan failing" — I need the exact error text from the latest Zap run. That tells us in 30 seconds which field is wrong, and may make Phases 3–10 unnecessary.
4. **Scope of expansion:** Phase 9 adds ~25 new lead columns. Do you want them all now, or only the ones ARIVE actually requires? I recommend the latter to avoid bloating the schema.

---

### Current state (what I already verified)

**`leads` table** has: `first_name, last_name, email, phone, loan_purpose, property_type, property_value, credit_range, employment_type, annual_income, timeline, property_address, loan_amount, los_sync_status, los_application_id, sent_to_los_at` and standard CRM fields. Missing for ARIVE: DOB, SSN last 4, marital status, occupancy_type, property city/state/zip (currently one freeform `property_address`), down_payment, loan_program, loan_officer NMLS, realtor/builder blocks.

**Send to LOS flow:** `SendToLosButton.tsx` → `fireZapier("lead.sent_to_los", payload)` → Zapier Catch Hook (`…/432hy7l/`) → Zap → ARIVE. The CRM payload includes: name, email, phone, loan_purpose, loan_amount (now auto-calculated), credit, property_address, property_type, property_value, annual_income, employment, timeline, loan_officer_email, deal_id.

**Validation today:** only checks first_name, last_name, email, phone, loan_purpose, loan_amount. Property address was intentionally removed (Arive returns it). No format normalization, no logging, no readiness score.

---

### Recommended sequencing (smallest credit spend first)

I strongly suggest we do **Step 0 + Phase 1 + Phase 6 + Phase 7** first. That alone usually fixes "Create Loan failing" issues, costs the least, and gives us logs to drive the rest.

**Step 0 — Diagnose the actual error (no code)**
Open the latest failed Zap run, copy the ARIVE error response, share it. 80% chance the fix is one field rename or one format change.

**Phase 1 — Schema audit report**
Generate a markdown report of every `leads` column with `% empty` over real data + the ARIVE equivalent. Output to `/mnt/documents/lead-schema-audit.md`. **No schema changes.**

**Phase 6 — Data formatting engine** (`src/lib/los/format.ts`)
Pure functions: `normalizePhone`, `normalizeMoney`, `normalizeZip`, `normalizeEmail`, `normalizeDate`. Wired into `SendToLosButton` payload build. Backwards compatible.

**Phase 7 — Integration log** (new table `los_integration_logs`)
Columns: `id, lead_id, event, payload jsonb, response jsonb, status, error, retry_count, created_at`. RLS + GRANTs per house rules. Write a row on every `fireZapier("lead.sent_to_los", …)`. Add a Settings → "LOS Integration Logs" page with filter/search. Replaces "go to Zapier to debug."

**Phase 4 — Validation engine** (`src/lib/los/validate.ts`)
Single source of truth for required fields + format rules, driven by a config object. `SendToLosButton` renders a checklist (✓/✗) and blocks submit. Same engine reused in Phase 10 console.

**Phase 3 — Mapping layer** (`src/lib/los/ariveMapping.ts`)
Config object `{ crmField → ariveField, transform, default }`. New `arive_field_mappings` table so Admin can edit from Settings without redeploy. Only build this if Zapier is NOT doing the mapping (see Q1).

**Phase 5 — Smart defaults**
Driven by the same mapping config. Settings UI toggle per field.

**Phase 8 — Readiness score**
`computeReadiness(lead)` returns `{ score, missing[] }`. Show as badge on lead detail header, pipeline cards, leads list. Pure derived value, no DB column needed.

**Phase 9 — Schema expansion** (additive migration)
Only after Q2/Q4 answered. All columns nullable, no defaults that change behaviour, no triggers touched. Add a "Loan details" section to the lead workspace to capture them.

**Phase 10 — Payload testing console**
Settings → "LOS Payload Tester": pick a lead, see generated JSON + validation + "Send test" button that posts to Zapier with `test_mode: true` flag.

---

### Guardrails (will be enforced)

- No existing column dropped or renamed. No existing trigger touched.
- All new tables: explicit GRANTs + RLS per house rules.
- Mapping/defaults configurable, not hardcoded.
- New UI behind existing routes; no route renames.
- Every phase merged independently so you can stop after any phase.

---

### What I need from you to start

1. Answer Q1–Q4 above.
2. Paste the latest ARIVE error message from Zapier.
3. Confirm sequencing: **"do Step 0 + Phases 1, 6, 7 first, then re-plan"** — or tell me to do all 10 in one go (more credits, more risk).

Once you reply I'll start with Phase 1 (read-only audit report) immediately.