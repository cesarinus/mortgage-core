import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckSquare, Plus } from "lucide-react";
import { listTasks, priorityClasses, type TaskRow } from "@/lib/tasks/api";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";

export function TasksWidget() {
  const [today, setToday] = useState<TaskRow[]>([]);
  const [overdue, setOverdue] = useState<TaskRow[]>([]);
  const [upcoming, setUpcoming] = useState<TaskRow[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const [t, o, u] = await Promise.all([
      listTasks({ due_window: "today", status: "open", assignee_self: true }),
      listTasks({ due_window: "overdue", status: "open", assignee_self: true }),
      listTasks({ due_window: "upcoming_7", status: "open", assignee_self: true }),
    ]);
    setToday(t); setOverdue(o); setUpcoming(u);
  }
  useEffect(() => { load(); }, []);

  const renderList = (rows: TaskRow[], emptyText: string, showOverdue = false) => (
    rows.length === 0
      ? <div className="text-xs text-muted-foreground py-3 text-center">{emptyText}</div>
      : <ul className="divide-y divide-border/40">
          {rows.slice(0, 5).map((t) => {
            const days = t.due_at ? Math.floor((Date.now() - new Date(t.due_at).getTime()) / 86400000) : 0;
            return (
              <li key={t.id} className="py-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{t.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {showOverdue && days > 0 ? `${days}d overdue` :
                      t.due_at ? new Date(t.due_at).toLocaleString() : "No due date"}
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] capitalize ${priorityClasses(t.priority)}`}>{t.priority}</Badge>
              </li>
            );
          })}
        </ul>
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" /> My Tasks
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs"><Link to="/tasks">View all</Link></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Due Today</div>
            {renderList(today, "Nothing due today.")}
          </div>
          <div>
            <div className="text-xs font-medium text-destructive mb-1">Overdue</div>
            {renderList(overdue, "Nothing overdue.", true)}
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Upcoming (7 days)</div>
            {renderList(upcoming, "Nothing scheduled.")}
          </div>
        </CardContent>
      </Card>
      <TaskDrawer open={open} onOpenChange={setOpen} onSaved={() => load()} />
    </>
  );
}

export default TasksWidget;