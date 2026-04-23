import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ScheduleManager() {
  const qc = useQueryClient();
  const { data: schedule = [] } = useQuery({
    queryKey: ["social-media-schedule"],
    queryFn: async () => {
      const { data, error } = await supabase.from("social_media_schedule").select("*").order("day_of_week");
      if (error) throw error;
      return data;
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("social_media_schedule").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-media-schedule"] });
      toast.success("Schedule updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Posting Schedule</CardTitle>
        <CardDescription>Default content type and time for each day of the week</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {schedule.map((s: any) => (
            <div key={s.id} className="flex items-center gap-4 rounded-lg border p-3">
              <div className="w-24 font-medium">{DAYS[s.day_of_week]}</div>
              <div className="flex-1 text-sm text-muted-foreground">{s.description}</div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Time</Label>
                <Input
                  type="time"
                  className="w-28"
                  defaultValue={(s.default_time || "10:00:00").slice(0, 5)}
                  onBlur={(e) => update.mutate({ id: s.id, patch: { default_time: e.target.value + ":00" } })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={s.is_active}
                  onCheckedChange={(c) => update.mutate({ id: s.id, patch: { is_active: c } })}
                />
                <Label className="text-xs">Active</Label>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}