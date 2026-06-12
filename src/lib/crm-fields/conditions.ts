import type { CrmFieldCondition, ConditionClause } from "./api";

function clauseTrue(c: ConditionClause, values: Record<string, any>): boolean {
  const v = values[c.field_id];
  switch (c.op) {
    case "eq": return String(v ?? "") === String(c.value ?? "");
    case "neq": return String(v ?? "") !== String(c.value ?? "");
    case "in": return Array.isArray(c.value) ? c.value.map(String).includes(String(v ?? "")) : false;
    case "contains": return String(v ?? "").toLowerCase().includes(String(c.value ?? "").toLowerCase());
    case "gt": return Number(v) > Number(c.value);
    case "lt": return Number(v) < Number(c.value);
    case "empty": return v === null || v === undefined || v === "";
    case "not_empty": return !(v === null || v === undefined || v === "");
    default: return true;
  }
}

export function ruleMatches(cond: CrmFieldCondition, values: Record<string, any>): boolean {
  const all = cond.rule?.all ?? [];
  const any = cond.rule?.any ?? [];
  if (!all.length && !any.length) return true;
  const allOk = all.length === 0 || all.every((c) => clauseTrue(c, values));
  const anyOk = any.length === 0 || any.some((c) => clauseTrue(c, values));
  return allOk && anyOk;
}

export interface FieldState { visible: boolean; required: boolean; readOnly: boolean }

export function evaluateField(
  fieldId: string,
  baseRequired: boolean,
  baseReadOnly: boolean,
  baseHidden: boolean,
  conditions: CrmFieldCondition[],
  values: Record<string, any>,
): FieldState {
  let visible = !baseHidden;
  let required = baseRequired;
  let readOnly = baseReadOnly;
  for (const c of conditions) {
    if (!c.active || c.field_id !== fieldId) continue;
    // skip section-targeted rules here
    if (c.target_kind === "section") continue;
    const m = ruleMatches(c, values);
    if (!m) continue;
    if (c.action === "show") visible = true;
    if (c.action === "hide") visible = false;
    if (c.action === "require") required = true;
    if (c.action === "readonly") readOnly = true;
  }
  return { visible, required, readOnly };
}

export interface SectionState { visible: boolean }

export function evaluateSection(
  sectionId: string,
  baseHidden: boolean,
  conditions: CrmFieldCondition[],
  values: Record<string, any>,
): SectionState {
  let visible = !baseHidden;
  for (const c of conditions) {
    if (!c.active) continue;
    if (c.target_kind !== "section" || c.target_id !== sectionId) continue;
    const m = ruleMatches(c, values);
    if (!m) continue;
    if (c.action === "show") visible = true;
    if (c.action === "hide") visible = false;
  }
  return { visible };
}