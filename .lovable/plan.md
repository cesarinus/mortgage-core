## Sprint 3 — ARIVE LOS Mapping, Integrations Hub, Team & Security

Large scope. Proposing a phased delivery so each module ships verifiably. All DB changes additive; existing `los_field_mappings`, `los_integration_logs`, `los_sync_queue`, `integration_webhooks`, `user_roles`, `crm_audit_logs` are reused — no rewrites.

---

### Phase 1 — ARIVE LOS Mapping Center
**Location:** `Settings → Mortgage → LOS Mapping` (replaces current `AriveFieldMappings.tsx`).

**DB (additive):**
- Extend `los_field_mappings`: add `category` (borrower|loan|property|realtor|employment|assets|liabilities), `sync_direction` (crm_to_los|los_to_crm|two_way), `transform_type` (none|upper|lower|date|value_map|formula), `transform_config` jsonb, `validation_status` (mapped|unmapped|invalid|duplicate|deprecated), `last_validated_at`.
- New `arive_sync_jobs`: id, object_type, object_id, direction, status (pending|running|success|failed), started_at, finished_at, error.
- Reuse `los_integration_logs` for sync log feed.
- New view `arive_connection_status`: counts of synced loans/borrowers, last sync, error count (last 24h).

**UI (`AriveMappingCenter.tsx`):**
- Top: Connection status card (Connected, Last Sync, Loans/Borrowers Synced, Errors).
- Tabs: Borrower / Loan / Property / Realtor / Employment / Assets / Liabilities.
- Per row: CRM field ↔ ARIVE field, direction selector, transform editor (value-map table for enums), status badge.
- Actions: **Test Mapping**, **Validate Mapping**, **Preview Payload** (reuse `buildPayload.ts` + `ariveValidate.ts`).
- Sync Logs panel: filter by date/object/result.

---

### Phase 2 — Integrations Hub
**Location:** `Settings → Integrations` (new top-level section).

**DB:**
- New `integration_connections`: key (unique), name, category (infra|comms|automation|mortgage|productivity|ai), provider, status, config jsonb, credentials_secret_ref, is_active.
- New `integration_health_snapshots`: connection_id, checked_at, status, latency_ms, requests_today, error_count.
- Reuse existing `integration_webhooks` table.

**UI (`IntegrationsHub.tsx`):**
- Card grid grouped by category: Core (Supabase, OpenAI, Ollama), Comms (Twilio, Resend), Automation (Zapier, n8n), Mortgage (ARIVE), Productivity (Google, Microsoft).
- Each card: status dot, last sync, latency, requests today, [Configure] / [Test] / [Disconnect].
- Detail drawer: API keys/webhooks/secrets/OAuth tabs. Credentials reference secrets — never displayed in plaintext.
- Webhook sub-panel: URL, status, last delivery, failures, [Test] [Replay] [Pause].
- **AI provider toggle**: cloud (Lovable AI Gateway / OpenAI) vs local (Ollama base URL) — stored in `integration_connections`.

---

### Phase 3 — Team & Permissions Center
**Location:** `Settings → Business → Team`.

**DB:**
- Extend `app_role` enum: add `loan_officer`, `processor`, `assistant`, `realtor`, `portal_user` (keep `admin`, existing values).
- New `roles` (custom role definitions): id, key (unique), name, description, base_role app_role, is_system, is_active.
- New `permissions`: id, resource (leads|borrowers|loans|pipeline|documents|reports|settings), action (view|create|edit|delete|export|manage).
- New `role_permissions`: role_id, permission_id, scope (own|team|branch|company).
- New `record_permissions`: role_id, resource, scope.
- New `team_invitations`: email, role_id, invited_by, token, expires_at, accepted_at.
- New SECURITY DEFINER fn `has_permission(_user uuid, _resource text, _action text, _scope text)`.

**UI (`TeamManagement.tsx`, `RolesAndPermissions.tsx`):**
- Team table: Name, Role, Email, Status, Last Login + [Invite] [Deactivate] [Reset PW] [Transfer Ownership].
- Roles tab: list system + custom roles, [Create] [Clone] [Edit] [Delete].
- **Permission matrix**: rows = resources, cols = view/create/edit/delete/export/manage, cells = scope dropdown (none/own/team/branch/company).
- Field-level perms link back to Sprint 1 `crm_field_permissions` per role.

---

### Phase 4 — Security Center
**Location:** `Settings → Business → Security`.

**DB:**
- New `security_settings` (singleton): password_policy jsonb, session_timeout_minutes, lockout_threshold, lockout_minutes, mfa_mode (off|optional|required), mfa_default_channel (email|totp).
- New `user_sessions`: user_id, ip, device, location, last_seen_at, revoked_at.
- New `security_events`: user_id, event_type (login|logout|perm_change|field_change|integration_change|settings_change|mfa_enroll|lockout), ip, metadata jsonb.
- New `mfa_settings`: user_id, channel, enabled, secret_ref, verified_at.

**UI (`SecurityCenter.tsx`):**
- Login Security card: password policy, session timeout, lockout.
- MFA card: mode selector (Email default), per-user enrollment table.
- Activity Monitor: sessions table (last login, IP, device, location).
- Audit Trail feed: filterable view of `security_events` + `crm_audit_logs`.
- AI Recommendations panel (Lovable AI): scans permissions and ARIVE health, surfaces actions like "3 users have excessive permissions".

---

### Cross-cutting
- All mutations call existing `logAudit()` from Sprint 1.
- Routes added to `App.tsx`; nav entries added in `SettingsLayout.tsx`.
- RLS: every new table — authenticated read where appropriate, `is_admin()` for writes. GRANT statements included.
- No edits to `client.ts`, `types.ts`, or `supabase/config.toml`.

### Delivery order
1. Migration (all Phase 1–4 tables in one migration).
2. Phase 1 ARIVE Mapping Center.
3. Phase 2 Integrations Hub.
4. Phase 3 Team & Permissions.
5. Phase 4 Security Center + AI recommendations.

### Out of scope
- Real OAuth flows for Google/Microsoft (UI placeholder + secret refs only).
- Live Ollama health probe (status surface only; user configures base URL).
- Two-way ARIVE realtime sync engine (mapping + manual test/preview only; the existing ARIVE webhook handles inbound).
- Migrating existing users to new granular roles (default everyone keeps current role; admins re-assign).
