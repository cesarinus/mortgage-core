import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type NotifChannel = "in_app" | "email" | "sms" | "push";

export interface NotificationPrefs {
  user_id: string;
  channels: Record<string, Partial<Record<NotifChannel, boolean>>>;
  quiet_hours: { enabled?: boolean; start?: string; end?: string; tz?: string };
  digest_mode: "instant" | "hourly" | "daily" | "weekly";
}

export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs | null> {
  const { data } = await sb.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle();
  return data ?? null;
}

export async function upsertNotificationPrefs(prefs: Partial<NotificationPrefs> & { user_id: string }) {
  const { error } = await sb.from("notification_preferences").upsert(prefs, { onConflict: "user_id" });
  if (error) throw error;
}

function inQuietHours(now: Date, qh: NotificationPrefs["quiet_hours"]) {
  if (!qh?.enabled || !qh.start || !qh.end) return false;
  const [sh, sm] = qh.start.split(":").map(Number);
  const [eh, em] = qh.end.split(":").map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  return s < e ? cur >= s && cur < e : cur >= s || cur < e;
}

/**
 * Dispatch a notification to a user respecting prefs, quiet hours and digest mode.
 * Always records a row in notification_events.
 */
export async function notify(opts: {
  user_id: string;
  type: string;                 // e.g. "new_lead", "stage_change"
  title: string;
  body?: string;
  priority?: "low" | "normal" | "high" | "critical";
  payload?: Record<string, any>;
}) {
  const priority = opts.priority ?? "normal";
  const prefs = await getNotificationPrefs(opts.user_id);
  const channels = (prefs?.channels?.[opts.type] ?? { in_app: true }) as Partial<Record<NotifChannel, boolean>>;
  const quiet = prefs ? inQuietHours(new Date(), prefs.quiet_hours) : false;
  const digestable = prefs?.digest_mode && prefs.digest_mode !== "instant" && priority !== "critical";

  const baseEvent = {
    user_id: opts.user_id,
    type: opts.type,
    title: opts.title,
    body: opts.body ?? null,
    payload: opts.payload ?? {},
    priority,
    status: digestable || (quiet && priority !== "critical") ? "queued" : "sent",
    sent_at: digestable || quiet ? null : new Date().toISOString(),
  };

  // Always write an in-app event row so the bell can render history.
  await sb.from("notification_events").insert({ ...baseEvent, channel: "in_app" });

  if (digestable || (quiet && priority !== "critical")) return;

  if (channels.email) {
    await sb.functions.invoke("send-email", {
      body: { to: null, user_id: opts.user_id, subject: opts.title, html: opts.body ?? "", template_alias: opts.type },
    }).catch(() => {});
    await sb.from("notification_events").insert({ ...baseEvent, channel: "email" });
  }
  if (channels.sms) {
    // SMS is wired but only fires when Twilio connector is configured server-side.
    await sb.from("notification_events").insert({ ...baseEvent, channel: "sms", status: "queued" });
  }
  if (channels.push) {
    await sb.from("notification_events").insert({ ...baseEvent, channel: "push", status: "queued" });
  }
}

export const NOTIFICATION_CATALOG: { category: string; types: { key: string; label: string }[] }[] = [
  { category: "CRM", types: [
    { key: "new_lead", label: "New Lead" },
    { key: "lead_assigned", label: "Lead Assigned" },
    { key: "task_assigned", label: "Task Assigned" },
    { key: "document_uploaded", label: "Document Uploaded" },
    { key: "stage_change", label: "Pipeline Stage Change" },
    { key: "loan_funded", label: "Loan Funded" },
    { key: "application_submitted", label: "Application Submitted" },
  ]},
  { category: "Email", types: [
    { key: "email_master", label: "Enable Email Alerts" },
    { key: "daily_digest", label: "Daily Digest" },
    { key: "weekly_summary", label: "Weekly Summary" },
    { key: "funding_alerts", label: "Funding Alerts" },
    { key: "lead_alerts", label: "Lead Alerts" },
  ]},
  { category: "SMS", types: [
    { key: "sms_master", label: "Enable SMS" },
    { key: "sms_high_priority", label: "High Priority Alerts" },
    { key: "sms_missed_followup", label: "Missed Follow-Ups" },
    { key: "sms_urgent_tasks", label: "Urgent Tasks" },
  ]},
  { category: "AI", types: [
    { key: "ai_opportunities", label: "AI Opportunities" },
    { key: "ai_refi", label: "Refinance Opportunities" },
    { key: "ai_missing_docs", label: "Missing Documents" },
    { key: "ai_high_risk", label: "High Risk Loans" },
    { key: "ai_rate_drop", label: "Rate Drop Opportunities" },
    { key: "ai_bottleneck", label: "Pipeline Bottlenecks" },
  ]},
  { category: "System", types: [
    { key: "sys_supabase", label: "Supabase Errors" },
    { key: "sys_arive", label: "ARIVE Sync Failures" },
    { key: "sys_zapier", label: "Zapier Errors" },
    { key: "sys_twilio", label: "Twilio Failures" },
    { key: "sys_api", label: "API Failures" },
  ]},
];