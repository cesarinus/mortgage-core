import type { CrmFieldCondition, ConditionClause } from "./api";

function clauseTrue(c: ConditionClause, values: Record<string, any>): boolean {
  const v = values[c.field_id];
  switch (c.op) {
    case "eq": return String(v ?? "") === String(c.value ?? "");
    case "neq": return String(v ?? "") !== String(c.value ?? "");
    case "in": return Array.isArray(c.value) ? c.value.map(String).includes(String(v ?? "")) : false;
    case "gt": return Number(v) > Number(c.value);
    case "lt": return Number(v) < Number(c.value);
    case "empty": return v === null || v === undefined || v === "";
    case "not_empty": return !(v === null || v === undefined || v === "");
    default: return true;
  }
}

export function ruleMatches(cond: CrmFieldCondition, values: Record<string, any>): boolean {
  const clauses = cond.rule?.all ?? [];
  if (!clauses.length) return true;
  return clauses.every((c) => clauseTrue(c, values));
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
    const m = ruleMatches(c, values);
    if (!m) continue;
    if (c.action === "show") visible = true;
    if (c.action === "hide") visible = false;
    if (c.action === "require") required = true;
    if (c.action === "readonly") readOnly = true;
  }
  return { visible, required, readOnly };
}