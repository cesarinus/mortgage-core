import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import {
  StickyNote, Mail, Phone, ListChecks, CalendarDays, Upload, ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getAllowedNext, normalizeStatus } from "@/lib/crm/stateMachine";

type ActionKey = "note" | "email" | "call" | "task" | "meeting" | "upload";

interface Props {
  record: any;
  kind: "lead" | "contact";
  tags?: { tag: string }[];
  onAction: (k: ActionKey) => void;
  onStatusChange?: (status: string) => void;
}

const actionList: { key: ActionKey; label: string; Icon: any }[] = [
  { key: "note", label: "Note", Icon: StickyNote },
  { key: "email", label: "Email", Icon: Mail },
  { key: "call", label: "Call", Icon: Phone },
  { key: "task", label: "Task", Icon: ListChecks },
  { key: "meeting", label: "Meeting", Icon: CalendarDays },
  { key: "upload", label: "Upload", Icon: Upload },
];

const LEAD_STATUSES = [
  "new", "contacted", "qualified", "pre_qualified",
  "application_started", "underwriting", "approved",
  "closed", "converted", "lost", "unqualified",
];

export function LeftRail({ record, kind, tags = [], onAction, onStatusChange }: Props) {
  const fullName = `${record?.first_name ?? ""} ${record?.last_name ?? ""}`.trim() || "(Unnamed)";
  const initials = `${record?.first_name?.[0] ?? ""}${record?.last_name?.[0] ?? ""}`.toUpperCase() || "?";
  return (
    <Card className="sticky top-4 self-start">
      <CardContent className="p-5 space-y-4">
        <Link to={kind === "lead" ? "/leads" : "/contacts"} className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3 mr-1" /> Back to {kind === "lead" ? "Leads" : "Contacts"}
        </Link>
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-semibold truncate">{fullName}</div>
            {record?.status && (
              <Badge variant="outline" className="capitalize mt-1">{String(record.status).replace(/_/g, " ")}</Badge>
            )}
          </div>
        </div>

        {kind === "lead" && onStatusChange && (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Status</div>
            {(() => {
              const current = normalizeStatus(record?.status, "new");
              const allowed = new Set([current, ...getAllowedNext("lead", current)]);
              return (
                <Select value={current} onValueChange={onStatusChange}>
              <SelectTrigger className="h-8 capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                    {LEAD_STATUSES.map((s) => (
                      <SelectItem
                        key={s}
                        value={s}
                        disabled={!allowed.has(s)}
                        className="capitalize"
                      >
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
              );
            })()}
          </div>
        )}

        <div className="grid grid-cols-3 gap-1.5">
          {actionList.map(({ key, label, Icon }) => (
            <Button key={key} variant="outline" size="sm" className="flex-col h-auto py-2 gap-1" onClick={() => onAction(key)}>
              <Icon className="h-4 w-4" />
              <span className="text-[10px]">{label}</span>
            </Button>
          ))}
        </div>

        <Separator />
        <div className="space-y-2 text-sm">
          <Field label="Email" value={record?.email} />
          <Field label="Phone" value={record?.phone} />
          {kind === "lead" && (
            <>
              <Field label="Loan purpose" value={record?.loan_purpose} />
              <Field label="Property value" value={record?.property_value ? `$${Number(record.property_value).toLocaleString()}` : null} />
              <Field label="Credit range" value={record?.credit_range} />
              <Field label="Source" value={record?.source} />
              <Field label="Lead score" value={record?.lead_score?.toString()} />
            </>
          )}
          <Field label="Created" value={record?.created_at ? format(new Date(record.created_at), "PP") : null} />
          <Field label="Last activity" value={record?.last_activity_at ? format(new Date(record.last_activity_at), "PPp") : null} />
        </div>

        {tags.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-1">
              {tags.map((t, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{t.tag}</Badge>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}