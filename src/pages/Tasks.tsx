import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { listTasks, type TaskRow } from "@/lib/tasks/api";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { TaskListPanel } from "@/components/tasks/TaskListPanel";

export default function TasksPage() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground">All your tasks across People, Leads, and Opportunities.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New task</Button>
      </div>
      <Card>
        <CardContent className="p-4">
          <TaskListPanel all title="" />
        </CardContent>
      </Card>
      <TaskDrawer open={open} onOpenChange={setOpen} onSaved={() => window.location.reload()} />
    </div>
  );
}