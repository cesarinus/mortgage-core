# Arive Import — People & Companies

A reusable admin-only page to import Arive `Borrowers.xlsx` and `BusinessContacts.xlsx` exports into `contacts`, `crm_companies`, and `crm_contact_companies`, with field mapping, preview, dedup-by-email (update existing), and a rejects CSV.

## Scope of changes

### 1. Additive schema (migration)
Only the fields you explicitly need become real columns. Everything else is preserved in `notes` so nothing is lost.

`contacts` — add:
- `middle_name text`
- `license_number text`
- `dob date` (free to omit; included since it's a common Arive field — say the word and I'll drop it)

`crm_companies` — add:
- `address text`
- `license_number text`

All other unmapped fields (home/work phones, secondary email, fax, marital status, suffix, state code, affiliate_type, company email) → appended to `notes` in a labeled block, e.g.:
```
--- Imported from Arive 2026-06-08 ---
Phone (home): 555-...
Phone (work): 555-...
Marital status: Married
```

No RLS / policy changes — existing `contacts` and `crm_companies` policies already cover the new columns.

### 2. New page: `Settings → Import from Arive` (admin-only)
Route: `/settings/import-arive`, gated by `useAuth` role === `admin`.

Flow:
1. **Upload** two files (Borrowers + BusinessContacts). Either one alone is allowed.
2. **Parse** in-browser with `xlsx` (SheetJS — add as dep).
3. **Preview & mapping table** — shows detected Arive columns → target table.column for each file, with a sample row. Mapping is fixed (built from the field inspection), not editable in v1.
4. **Dry-run summary**: counts of will-create vs will-update (by email match) vs rejects (missing required fields, e.g. no first+last name).
5. **Import** button — runs all inserts/updates client-side via the existing `supabase` client, scoped to `auth.uid()` as `created_by`. No edge function needed; RLS handles authorization.
6. **Result panel**: counts + a "Download rejects" button (CSV of skipped rows with reason).

### 3. Mapping (locked in v1)

**Borrowers.xlsx → `contacts`** (role/type = `borrower`):
| Arive | Target |
|---|---|
| First Name | `first_name` |
| Middle Name | `middle_name` *(new)* |
| Last Name | `last_name` |
| Email | `email` |
| Date of Birth | `dob` *(new)* |
| Cell Phone → Home → Work (first non-empty) | `phone` |
| Street + Unit + City, State Zip, County | `address` (concatenated) |
| Home Phone, Work Phone, Marital Status, Secondary Email, Fax, Suffix | appended to `notes` |
| — | `contact_type = 'borrower'`, `role = 'borrower'`, `created_by = auth.uid()` |

**BusinessContacts.xlsx → `contacts` + `crm_companies` + `crm_contact_companies`:**

Person side → `contacts`:
| Arive | Target |
|---|---|
| First / Last Name | `first_name`, `last_name` |
| Email | `email` |
| License # | `license_number` *(new)* |
| Address fields | `address` |
| Contact Type (Real Estate Agent / Title Agent / Insurance / etc.) | `role` (mapped enum) |
| Suffix, Secondary Email, Fax, State Code | `notes` |

Company side → `crm_companies` (one row per unique company name, case-insensitive):
| Arive | Target |
|---|---|
| Company Name | `name` |
| Company Phone | `phone` |
| Company Address | `address` *(new)* |
| Company License # | `license_number` *(new)* |
| Contact Type → `company_type` enum | `company_type` |
| Company Email, Affiliate Type, Fax | `notes` |

Link row → `crm_contact_companies` with `contact_role` mapped from Contact Type.

### 4. Dedup rules (you chose: email match, update existing)
- **contacts**: match on `lower(email)` where email present. If found → `UPDATE` (only fill empty fields + append a dated note block; never overwrite a non-empty value). If no email → insert new (no dedup).
- **crm_companies**: match on `lower(name)`. Same fill-empty-only rule.
- **crm_contact_companies**: skip if row already exists for that `(contact_id, company_id)`.

### 5. Borrowers without a deal
Imported as standalone `contacts` with `contact_type='borrower'`, `role='borrower'`, no `lead_id`. They show up in People immediately and can be linked to a lead/deal later from the contact workspace.

## Technical notes
- New dep: `xlsx` (SheetJS) — parses .xlsx in browser, ~400KB gz, only loaded on the import route via dynamic import so it doesn't bloat the main bundle.
- All writes go through the regular Supabase client under the admin's session — same path the rest of the CRM uses.
- No edge function, no service-role exposure.
- Existing `People.tsx` / `Companies.tsx` are not touched.

## Out of scope (v1)
- Editable column mapping UI (mapping is fixed; revisit if Arive exports change shape)
- Linking borrowers to existing/closed deals during import (separate flow — happens manually in the contact workspace afterward)
- Background/queued imports (sync, runs in the browser; ~400 borrower rows + 147 contacts is fine)

## Files

New:
- `supabase/migrations/<ts>_arive_import_fields.sql` — adds the 5 new columns
- `src/pages/settings/ImportArive.tsx` — the page
- `src/lib/import/arive.ts` — parse + map + dedup + write logic
- Route added in `src/App.tsx` (protected, admin-only)
- Nav link added in `SettingsPage.tsx` (or sidebar settings section)

Modified:
- `package.json` — `xlsx` added
- `src/integrations/supabase/types.ts` — regenerated after migration

Want me to drop `dob` from the schema additions, or keep it? Otherwise this is ready to build.
