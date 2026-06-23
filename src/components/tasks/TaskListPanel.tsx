import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listTasks, updateTask, deleteTask,
  priorityClasses, statusLabel,
  type TaskRow, type TaskRelatedType,
} from "@/lib/tasks/api";
import { TaskDrawer } from "./TaskDrawer";

interface Props {
  related?: { type: TaskRelatedType; id: string; label?: string };
  /** When true, list ALL tasks (used by /tasks page). */
  all?: boolean;
  title?: string;
}

export function TaskListPanel({ related, all = false, title = "Tasks" }: Props) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"open" | "overdue" | "completed">("open");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listTasks(all ? {} : { related_type: related?.type, related_id: related?.id });
      setTasks(rows);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load tasks");
    } finally { setLoading(false); }
  }, [all, related?.type, related?.id]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return tasks.filter((t) => {
      const done = t.status === "completed";
      const overdue = t.due_at && new Date(t.due_at).getTime() < now && !done;
      if (tab === "completed") return done;
      if (tab === "overdue") return overdue;
      return !done;
    });
  }, [tasks, tab]);

  async function toggleComplete(t: TaskRow, complete: boolean) {
    try {
      await updateTask(t.id, { status: complete ? "completed" : "not_started" });
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this task?")) return;
    try { await deleteTask(id); load(); toast.success("Task deleted."); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">{title}</h3>
        <Button size="sm" onClick={() => { setEditing(null); setDrawerOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New task
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid grid-cols-3 w-full sm:w-auto">
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading && <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</div>}
      {!loading && filtered.length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No tasks here.</CardContent></Card>
      )}

      <div className="space-y-2">
        {filtered.map((t) => {
          const done = t.status === "completed";
          const overdue = t.due_at && new Date(t.due_at).getTime() < Date.now() && !done;
          return (
            <Card key={t.id} className={done ? "opacity-60" : ""}>
              <CardContent className="p-3 flex items-start gap-3">
                <Checkbox checked={done} onCheckedChange={(v) => toggleComplete(t, !!v)} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className={`text-sm font-medium ${done ? "line-through" : ""}`}>{t.title}</span>
                    <Badge variant="outline" className={`text-[10px] capitalize ${priorityClasses(t.priority)}`}>{t.priority}</Badge>
                    <Badge variant="secondary" className="text-[10px] capitalize">{t.task_type}</Badge>
                    {overdue && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                    <Badge variant="outline" className="text-[10px]">{statusLabel(t.status)}</Badge>
                  </div>
                  {t.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-line">{t.notes}</p>}
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {t.due_at ? `Due ${new Date(t.due_at).toLocaleString()}` : `Created ${new Date(t.created_at).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(t); setDrawerOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <TaskDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        initial={editing}
        defaultRelated={!editing && related ? related : null}
        onSaved={() => load()}
      />
    </div>
  );
}

export default TaskListPanel;