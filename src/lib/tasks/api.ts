import { supabase } from "@/integrations/supabase/client";

export type TaskRelatedType = "person" | "lead" | "opportunity";
export type TaskType = "todo" | "email" | "call";
export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "not_started" | "in_progress" | "completed" | "cancelled";

export interface TaskRow {
  id: string;
  title: string;
  task_type: string;
  priority: string;
  status: string;
  due_at: string | null;
  reminder_at: string | null;
  notes: string | null;
  description: string | null;
  related_type: string | null;
  related_id: string | null;
  lead_id: string | null;
  person_id: string | null;
  opportunity_id: string | null;
  deal_id: string | null;
  contact_id: string | null;
  assignee_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TaskInput {
  title: string;
  task_type?: TaskType;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_at?: string | null;
  reminder_at?: string | null;
  notes?: string | null;
  related_type?: TaskRelatedType | null;
  related_id?: string | null;
}

function applyRelation(input: TaskInput): Record<string, any> {
  const out: Record<string, any> = { ...input };
  out.lead_id = null;
  out.person_id = null;
  out.opportunity_id = null;
  if (input.related_type && input.related_id) {
    if (input.related_type === "lead") out.lead_id = input.related_id;
    if (input.related_type === "person") out.person_id = input.related_id;
    if (input.related_type === "opportunity") out.opportunity_id = input.related_id;
  }
  return out;
}

export async function createTask(input: TaskInput): Promise<TaskRow> {
  const { data: u } = await supabase.auth.getUser();
  const payload = {
    ...applyRelation(input),
    status: input.status ?? "not_started",
    priority: input.priority ?? "medium",
    task_type: input.task_type ?? "todo",
    created_by: u.user?.id ?? null,
  };
  const { data, error } = await (supabase as any).from("tasks").insert(payload).select("*").single();
  if (error) throw error;
  return data as TaskRow;
}

export async function updateTask(id: string, patch: Partial<TaskInput> & { status?: TaskStatus }): Promise<TaskRow> {
  const payload: Record<string, any> = { ...patch };
  if (patch.related_type !== undefined || patch.related_id !== undefined) {
    Object.assign(payload, applyRelation({ title: "", ...patch } as TaskInput));
    delete payload.title;
  }
  if (patch.status === "completed") payload.completed_at = new Date().toISOString();
  if (patch.status && patch.status !== "completed") payload.completed_at = null;
  const { data, error } = await (supabase as any).from("tasks").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return data as TaskRow;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await (supabase as any).from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export interface TaskFilters {
  related_type?: TaskRelatedType;
  related_id?: string;
  status?: TaskStatus | "all" | "open";
  priority?: TaskPriority;
  task_type?: TaskType;
  search?: string;
  due_window?: "overdue" | "today" | "upcoming_7" | "all";
  assignee_self?: boolean;
  sort?: "due_at" | "priority" | "created_at";
}

export async function listTasks(f: TaskFilters = {}): Promise<TaskRow[]> {
  let q = (supabase as any).from("tasks").select("*");
  if (f.related_type && f.related_id) {
    const col = f.related_type === "lead" ? "lead_id" : f.related_type === "person" ? "person_id" : "opportunity_id";
    q = q.eq(col, f.related_id);
  }
  if (f.status && f.status !== "all") {
    if (f.status === "open") q = q.in("status", ["not_started", "in_progress", "open"]);
    else q = q.eq("status", f.status);
  }
  if (f.priority) q = q.eq("priority", f.priority);
  if (f.task_type) q = q.eq("task_type", f.task_type);
  if (f.search) q = q.or(`title.ilike.%${f.search}%,notes.ilike.%${f.search}%`);
  if (f.assignee_self) {
    const { data: u } = await supabase.auth.getUser();
    if (u.user?.id) q = q.or(`assignee_id.eq.${u.user.id},created_by.eq.${u.user.id}`);
  }
  const now = new Date().toISOString();
  if (f.due_window === "overdue") q = q.lt("due_at", now).neq("status", "completed");
  if (f.due_window === "today") {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    q = q.gte("due_at", start.toISOString()).lte("due_at", end.toISOString());
  }
  if (f.due_window === "upcoming_7") {
    const end = new Date(); end.setDate(end.getDate() + 7);
    q = q.gte("due_at", now).lte("due_at", end.toISOString());
  }
  const sort = f.sort ?? "due_at";
  q = q.order(sort, { ascending: sort !== "priority", nullsFirst: false });
  const { data, error } = await q;
  if (error) throw error;
  return (data as TaskRow[]) ?? [];
}

export interface RecordOption { id: string; label: string; sublabel?: string; type: TaskRelatedType }

export async function searchRelatedRecords(type: TaskRelatedType, query: string): Promise<RecordOption[]> {
  const q = query.trim();
  if (type === "person") {
    const { data } = await (supabase as any).from("people")
      .select("id, full_name, email").ilike("full_name", `%${q}%`).limit(10);
    return ((data ?? []) as any[]).map((r) => ({ id: r.id, label: r.full_name || "Unnamed", sublabel: r.email ?? undefined, type }));
  }
  if (type === "lead") {
    let qb = (supabase as any).from("leads").select("id, first_name, last_name, email, loan_purpose").limit(10);
    if (q) qb = qb.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`);
    const { data } = await qb;
    return ((data ?? []) as any[]).map((r) => ({
      id: r.id,
      label: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.email || "Lead",
      sublabel: r.loan_purpose ?? undefined,
      type,
    }));
  }
  const { data } = await (supabase as any).from("pipeline_opportunities")
    .select("id, title, stage, loan_amount").ilike("title", `%${q}%`).limit(10);
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    label: r.title || `Opportunity ${r.id.slice(0, 6)}`,
    sublabel: r.stage ?? undefined,
    type,
  }));
}

export const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, normal: 1, low: 2 };

export function priorityClasses(p: string): string {
  if (p === "high") return "bg-red-500/10 text-red-600 border-red-500/30";
  if (p === "low") return "bg-muted text-muted-foreground border-border";
  return "bg-primary/10 text-primary border-primary/30";
}

export function statusLabel(s: string): string {
  if (s === "open") return "Not Started";
  return s.split("_").map((p) => p[0].toUpperCase() + p.slice(1)).join(" ");
}

export const REMINDER_OPTIONS: { label: string; minutes: number | null }[] = [
  { label: "None", minutes: null },
  { label: "At due time", minutes: 0 },
  { label: "15 minutes before", minutes: 15 },
  { label: "30 minutes before", minutes: 30 },
  { label: "1 hour before", minutes: 60 },
  { label: "4 hours before", minutes: 240 },
  { label: "1 day before", minutes: 1440 },
];