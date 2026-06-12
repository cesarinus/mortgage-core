# Sprint 1 — Settings Control Center

Big scope. Delivered in 4 sequential, shippable phases. Each phase ends with working UI persisted to the database and surviving reload.

## Phase 1 — Layout Designer (full)

Extend `crm_layouts.layout` JSON to carry per-section settings (no new tables — keeps it additive):

```text
layout.sections[i] = {
  section_id, sort, hidden,
  width: "full" | "half" | "third",
  default_collapsed: boolean,
  mobile: "show" | "hide" | "desktop_only",
  role_visibility: { admin, loan_officer, processor, assistant, realtor },  // bool each
  role_permissions: { <role>: { view, edit, delete } },
  columns?, fields: [...existing]
}
```

Rebuild `CrmLayoutDesigner.tsx`:
- `@dnd-kit/core` + `@dnd-kit/sortable` (already in repo if present; install otherwise) for drag-and-drop section reordering with a grip handle.
- Per-section inline controls: width selector, default state (Expanded/Collapsed), mobile visibility, role visibility checkboxes, role permission matrix (view/edit/delete) — collapsible "Advanced" panel to keep the row compact.
- Live preview rail on the right shows the resulting grid (`grid-cols-6`: full=6, half=3, third=2) so admins see Row 1 / Row 2 visually.
- Save writes the full sections array via existing `saveLayout()` (already snapshots prior versions to `crm_layout_versions`).

**Layout Templates** — new lightweight table:
```sql
crm_layout_templates(id, module_id, name, description, layout jsonb, created_by, created_at, updated_at)
```
"Save as template" + "Apply template" dropdown in the designer. Templates are module-scoped (Lead Intake, Loan Officer, Processor, Realtor).

## Phase 2 — Conditional Logic Engine

Real visual rule builder replacing the placeholder tab. Uses existing `crm_field_conditions` (already has `rule jsonb`, `action`, `field_id`).

- Extend `rule` shape to support OR: `{ all?: Clause[], any?: Clause[] }`. Update `src/lib/crm-fields/conditions.ts` to evaluate both.
- Add `target_kind: "field" | "section"` and `target_id` columns (migration) so a rule can show/hide a whole section, not only a field.
- Add ops already listed: `eq, neq, contains, gt, lt, empty, not_empty`.
- Builder UI: source field picker → operator → value (typed by source field), with AND/OR toggle and `+ Add condition`. Action picker: Show / Hide / Require / Read-only, target = field or section.
- `CustomFieldsRenderer` already calls `evaluateField`; extend it to also evaluate section-level rules and hide whole sections live in record forms.

## Phase 3 — Permissions Tab

Powered by existing `crm_field_permissions` plus a new `crm_section_permissions` table:
```sql
crm_section_permissions(id, section_id, role app_role, can_view, can_edit, can_delete)
```
- Matrix UI: rows = fields/sections, columns = the 5 roles (extend `app_role` enum with `assistant`, `realtor` via migration), cells = checkboxes (View / Edit / Required / Hidden for fields; View / Edit / Delete for sections).
- Bulk "apply to all fields in section" action.
- Enforcement: `CustomFieldsRenderer` already respects field permissions via `evaluateField`; add section-permission gate in `RecordWorkspace` so hidden sections never render and read-only sections lock all inputs inside.

## Phase 4 — History & Audit Log

New table:
```sql
crm_audit_logs(
  id, module_id, actor_id,
  entity_type text,    -- field | section | layout | condition | permission
  entity_id uuid,
  action text,         -- created | updated | deleted | renamed | moved
  before jsonb, after jsonb,
  created_at timestamptz default now()
)
```
- Helper `logAudit()` called from every save path in `src/lib/crm-fields/api.ts` (saveField, deleteField, saveSection, deleteSection, saveLayout, saveFieldCondition, upsertFieldPermission, plus new section-permission saves).
- History tab: filterable list (module / user / date range), shows timestamp, actor name (joined from `profiles`), entity, action, and a diff popover for `before`/`after`.

## Technical notes

- All DB changes are additive — no breaking change to existing `crm_layouts` shape (new keys default safely).
- RLS: new tables get authenticated read + admin-write policies, matching existing `crm_*` pattern.
- `dnd-kit` (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`) installed if missing.
- No edits to `src/integrations/supabase/client.ts` or `types.ts` (regenerated).
- Mobile responsiveness work from prior sprint is preserved.

## Out of scope

- New modules beyond the existing ones.
- Form-builder reordering of fields within sections via DnD (fields keep current sort controls; section DnD only).
- Realtime sync across multiple admins editing the same module.

## Delivery order

1. Migration: new tables (`crm_layout_templates`, `crm_section_permissions`, `crm_audit_logs`), enum additions, condition columns.
2. Phase 1 Layout Designer + templates.
3. Phase 2 Conditional Logic builder + section-level rules in renderer.
4. Phase 3 Permissions matrix + enforcement.
5. Phase 4 Audit log writes + History tab.

Each phase is independently testable; you can preview after each.
