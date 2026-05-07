import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, CalendarDays, CheckSquare, StickyNote, Paperclip, Settings2, ChevronDown } from "lucide-react";
import { format } from "date-fns";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "note", label: "Notes" },
  { key: "email", label: "Emails" },
  { key: "call", label: "Calls" },
  { key: "task", label: "Tasks" },
  { key: "meeting", label: "Meetings" },
  { key: "attachment", label: "Documents" },
  { key: "system", label: "System" },
];

const ICON: Record<string, any> = {
  note: StickyNote, email: Mail, call: Phone, task: CheckSquare,
  meeting: CalendarDays, attachment: Paperclip, system: Settings2, status_change: Settings2,
};

export function ActivitiesTab({ activities }: { activities: any[] }) {
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const filtered = filter === "all" ? activities : activities.filter((a) => a.activity_type === filter || (filter === "system" && a.activity_type === "status_change"));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}>
            {f.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No activities to show.</CardContent></Card>
      )}

      <ol className="relative border-l border-border ml-3 space-y-3">
        {filtered.map((a) => {
          const Icon = ICON[a.activity_type] ?? Settings2;
          const isOpen = expanded[a.id];
          return (
            <li key={a.id} className="ml-6">
              <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background border">
                <Icon className="h-3 w-3" />
              </span>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize text-[10px]">{a.activity_type}</Badge>
                        <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), "PPp")}</span>
                      </div>
                      <div className="font-medium text-sm mt-1">{a.title || "Activity"}</div>
                      {a.body && (
                        <div className={`text-sm text-muted-foreground mt-1 ${isOpen ? "" : "line-clamp-2"}`}>{a.body}</div>
                      )}
                    </div>
                    {a.body && a.body.length > 120 && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpanded((p) => ({ ...p, [a.id]: !isOpen }))}>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}