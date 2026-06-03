import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sparkles } from "lucide-react";
import { getStageSuggestions } from "@/lib/crm/stageTasks";

type Task = {
  id: string;
  lead_id: string | null;
  deal_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_at: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  completed_by: string | null;
};

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

interface Props {
  leadId?: string;
  dealId?: string;
  /** Current stage/status used to drive suggestions. */
  stage?: string | null;
}

export function TasksTab({ leadId, dealId, stage }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<string>("medium");

  const load = useCallback(async () => {
    if (!leadId && !dealId) return;
    setLoading(true);
    let q = (supabase as any).from("tasks").select("*");
    if (leadId && dealId) q = q.or(`lead_id.eq.${leadId},deal_id.eq.${dealId}`);
    else if (leadId) q = q.eq("lead_id", leadId);
    else if (dealId) q = q.eq("deal_id", dealId);
    const { data, error } = await q;
    if (error) toast({ title: "Failed to load tasks", description: error.message, variant: "destructive" });
    setTasks((data as Task[]) ?? []);
    setLoading(false);
  }, [leadId, dealId, toast]);

  useEffect(() => { load(); }, [load]);

  const addTask = async (overrides?: Partial<Task>) => {
    const t = (overrides?.title ?? title).trim();
    if (!t) return;
    const payload: any = {
      lead_id: leadId ?? null,
      deal_id: dealId ?? null,
      title: t,
      priority: overrides?.priority ?? priority,
      created_by: user?.id ?? null,
    };
    const { error } = await (supabase as any).from("tasks").insert(payload);
    if (error) {
      toast({ title: "Could not add task", description: error.message, variant: "destructive" });
      return;
    }
    if (!overrides) setTitle("");
    load();
  };

  const toggleComplete = async (task: Task, complete: boolean) => {
    const { error } = await (supabase as any)
      .from("tasks")
      .update({
        status: complete ? "completed" : "open",
        completed_at: complete ? new Date().toISOString() : null,
        completed_by: complete ? user?.id ?? null : null,
      })
      .eq("id", task.id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else load();
  };

  const sorted = useMemo(() => {
    const arr = [...tasks];
    arr.sort((a, b) => {
      const aDone = a.status === "completed" ? 1 : 0;
      const bDone = b.status === "completed" ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;
      return (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
    });
    return arr;
  }, [tasks]);

  const suggestions = useMemo(() => {
    const existing = new Set(tasks.map((t) => t.title.toLowerCase()));
    return getStageSuggestions(stage).filter((s) => !existing.has(s.title.toLowerCase()));
  }, [stage, tasks]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3 flex items-center gap-2">
          <Input
            placeholder="Quick add a task…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
          />
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => addTask()}>
            <Plus className="h-4 w-4 mr-1" />Add
          </Button>
        </CardContent>
      </Card>

      {suggestions.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Suggested next actions for this stage
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <Button
                  key={s.title}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => addTask({ title: s.title, priority: s.priority ?? "medium" } as any)}
                >
                  <Plus className="h-3 w-3 mr-1" />{s.title}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && sorted.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">No tasks yet.</p>
        )}
        {sorted.map((t) => {
          const done = t.status === "completed";
          return (
            <Card key={t.id} className={done ? "opacity-60" : ""}>
              <CardContent className="p-3 flex items-start gap-3">
                <Checkbox
                  checked={done}
                  onCheckedChange={(v) => toggleComplete(t, !!v)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm ${done ? "line-through" : ""}`}>{t.title}</span>
                    <Badge
                      variant={t.priority === "high" ? "destructive" : t.priority === "low" ? "secondary" : "outline"}
                      className="text-[10px] capitalize"
                    >
                      {t.priority}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {done && t.completed_at
                      ? `Completed ${new Date(t.completed_at).toLocaleString()}`
                      : t.due_at
                      ? `Due ${new Date(t.due_at).toLocaleString()}`
                      : `Created ${new Date(t.created_at).toLocaleDateString()}`}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default TasksTab;