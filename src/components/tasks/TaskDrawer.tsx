import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ChevronsUpDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createTask, updateTask, searchRelatedRecords,
  REMINDER_OPTIONS, type RecordOption, type TaskRelatedType, type TaskRow,
} from "@/lib/tasks/api";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Partial<TaskRow> | null;
  defaultRelated?: { type: TaskRelatedType; id: string; label?: string } | null;
  onSaved?: (t: TaskRow) => void;
}

export function TaskDrawer({ open, onOpenChange, initial, defaultRelated, onSaved }: Props) {
  const editing = !!initial?.id;
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState<string>("todo");
  const [priority, setPriority] = useState<string>("medium");
  const [status, setStatus] = useState<string>("not_started");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [dueTime, setDueTime] = useState<string>("09:00");
  const [reminderMinutes, setReminderMinutes] = useState<string>("none");
  const [notes, setNotes] = useState("");
  const [relType, setRelType] = useState<TaskRelatedType | "">("");
  const [relId, setRelId] = useState<string>("");
  const [relLabel, setRelLabel] = useState<string>("");
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordQuery, setRecordQuery] = useState("");
  const [records, setRecords] = useState<RecordOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title ?? "");
      setTaskType(initial.task_type ?? "todo");
      setPriority(initial.priority === "normal" ? "medium" : initial.priority ?? "medium");
      setStatus(initial.status === "open" ? "not_started" : initial.status ?? "not_started");
      if (initial.due_at) {
        const d = new Date(initial.due_at);
        setDueDate(d);
        setDueTime(format(d, "HH:mm"));
      } else { setDueDate(undefined); setDueTime("09:00"); }
      setReminderMinutes("none");
      setNotes(initial.notes ?? initial.description ?? "");
      if (initial.related_type && initial.related_id) {
        setRelType(initial.related_type as TaskRelatedType);
        setRelId(initial.related_id);
      } else if (initial.lead_id) { setRelType("lead"); setRelId(initial.lead_id); }
      else if (initial.person_id) { setRelType("person"); setRelId(initial.person_id); }
      else if (initial.opportunity_id) { setRelType("opportunity"); setRelId(initial.opportunity_id); }
      setRelLabel("");
    } else {
      setTitle(""); setTaskType("todo"); setPriority("medium"); setStatus("not_started");
      setDueDate(undefined); setDueTime("09:00"); setReminderMinutes("none"); setNotes("");
      if (defaultRelated) { setRelType(defaultRelated.type); setRelId(defaultRelated.id); setRelLabel(defaultRelated.label ?? ""); }
      else { setRelType(""); setRelId(""); setRelLabel(""); }
    }
  }, [open, initial, defaultRelated]);

  useEffect(() => {
    if (!relType) { setRecords([]); return; }
    let cancel = false;
    const t = setTimeout(async () => {
      try {
        const rows = await searchRelatedRecords(relType as TaskRelatedType, recordQuery);
        if (!cancel) setRecords(rows);
      } catch { /* ignore */ }
    }, 200);
    return () => { cancel = true; clearTimeout(t); };
  }, [relType, recordQuery]);

  const dueAtIso = useMemo(() => {
    if (!dueDate) return null;
    const [h, m] = dueTime.split(":").map(Number);
    const d = new Date(dueDate);
    d.setHours(h || 0, m || 0, 0, 0);
    return d.toISOString();
  }, [dueDate, dueTime]);

  const reminderAtIso = useMemo(() => {
    if (!dueAtIso || reminderMinutes === "none") return null;
    const mins = Number(reminderMinutes);
    if (Number.isNaN(mins)) return null;
    return new Date(new Date(dueAtIso).getTime() - mins * 60_000).toISOString();
  }, [dueAtIso, reminderMinutes]);

  async function handleSave() {
    const t = title.trim();
    if (!t) { toast.error("Title is required"); return; }
    if (t.length > 150) { toast.error("Title must be 150 characters or fewer"); return; }
    if (!editing && dueAtIso && new Date(dueAtIso) < new Date()) {
      toast.error("Due date cannot be in the past"); return;
    }
    setSaving(true);
    try {
      const payload = {
        title: t,
        task_type: taskType as any,
        priority: priority as any,
        status: status as any,
        due_at: dueAtIso,
        reminder_at: reminderAtIso,
        notes: notes || null,
        related_type: (relType || null) as any,
        related_id: relId || null,
      };
      const row = editing
        ? await updateTask(initial!.id!, payload)
        : await createTask(payload);
      toast.success(editing ? "Task updated." : "Task created successfully.");
      onSaved?.(row);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save task");
    } finally { setSaving(false); }
  }

  const selectedRecord = records.find((r) => r.id === relId);
  const displayedLabel = relLabel || selectedRecord?.label || (relId ? "Selected record" : "Search…");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit Task" : "New Task"}</SheetTitle>
          <SheetDescription>{editing ? "Update task details." : "Create a task and link it to a record."}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="task-title">Title <span className="text-destructive">*</span></Label>
            <Input id="task-title" value={title} maxLength={150}
              onChange={(e) => setTitle(e.target.value)} placeholder="Follow up with borrower…" />
            <div className="text-[10px] text-muted-foreground mt-1 text-right">{title.length}/150</div>
          </div>

          <div>
            <Label>Related to</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select value={relType} onValueChange={(v) => { setRelType(v as TaskRelatedType); setRelId(""); setRelLabel(""); }}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="person">Person</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="opportunity">Opportunity</SelectItem>
                </SelectContent>
              </Select>
              <Popover open={recordOpen} onOpenChange={setRecordOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="col-span-2 justify-between font-normal" disabled={!relType}>
                    <span className="truncate">{displayedLabel}</span>
                    <ChevronsUpDown className="h-3 w-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Search…" value={recordQuery} onValueChange={setRecordQuery} />
                    <CommandList>
                      <CommandEmpty>No matches.</CommandEmpty>
                      <CommandGroup>
                        {records.map((r) => (
                          <CommandItem key={r.id} value={r.id} onSelect={() => {
                            setRelId(r.id); setRelLabel(r.label); setRecordOpen(false);
                          }}>
                            <div className="flex flex-col"><span>{r.label}</span>
                              {r.sublabel && <span className="text-[11px] text-muted-foreground">{r.sublabel}</span>}</div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Due date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Reminder</Label>
            <Select value={reminderMinutes} onValueChange={setReminderMinutes}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REMINDER_OPTIONS.map((o) => (
                  <SelectItem key={o.label} value={o.minutes === null ? "none" : String(o.minutes)}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {editing && (
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5}
              placeholder="Add details, bullet points, or context…" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Save changes" : "Create task"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default TaskDrawer;