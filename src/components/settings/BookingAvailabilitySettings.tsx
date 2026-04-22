import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Loader2, Plus } from "lucide-react";

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
] as const;

type Hours = Record<string, [string, string] | null>;

export default function BookingAvailabilitySettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [hours, setHours] = useState<Hours>({});
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [blackouts, setBlackouts] = useState<Array<{ id: string; date: string; reason: string | null }>>([]);
  const [newBlackoutDate, setNewBlackoutDate] = useState("");
  const [newBlackoutReason, setNewBlackoutReason] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: settings }, { data: bd }] = await Promise.all([
        supabase.from("booking_settings").select("*").limit(1).maybeSingle(),
        supabase.from("booking_blackout_dates").select("*").order("date", { ascending: true }),
      ]);
      if (settings) {
        setSettingsId(settings.id);
        const wh = settings.weekday_hours as Record<string, [string, string]>;
        const next: Hours = {};
        DAYS.forEach((d) => {
          next[d.key] = wh?.[d.key] ?? null;
        });
        setHours(next);
        setSlotMinutes(settings.slot_minutes);
        setBufferMinutes(settings.buffer_minutes);
        setNotifyEmail(settings.notify_email);
      }
      setBlackouts(bd ?? []);
      setLoading(false);
    })();
  }, []);

  const toggleDay = (key: string, open: boolean) => {
    setHours((p) => ({ ...p, [key]: open ? ["09:00", "17:00"] : null }));
  };
  const setHour = (key: string, idx: 0 | 1, value: string) => {
    setHours((p) => {
      const cur = p[key] ?? ["09:00", "17:00"];
      const next: [string, string] = [cur[0], cur[1]];
      next[idx] = value;
      return { ...p, [key]: next };
    });
  };

  const save = async () => {
    if (!settingsId) return;
    setSaving(true);
    const weekday_hours: Record<string, [string, string]> = {};
    Object.entries(hours).forEach(([k, v]) => {
      if (v) weekday_hours[k] = v;
    });
    const { error } = await supabase
      .from("booking_settings")
      .update({ weekday_hours, slot_minutes: slotMinutes, buffer_minutes: bufferMinutes, notify_email: notifyEmail })
      .eq("id", settingsId);
    setSaving(false);
    if (error) toast({ title: "Error saving", description: error.message, variant: "destructive" });
    else toast({ title: "Availability updated" });
  };

  const addBlackout = async () => {
    if (!newBlackoutDate) return;
    const { data, error } = await supabase
      .from("booking_blackout_dates")
      .insert({ date: newBlackoutDate, reason: newBlackoutReason || null })
      .select()
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setBlackouts((p) => [...p, data].sort((a, b) => a.date.localeCompare(b.date)));
    setNewBlackoutDate("");
    setNewBlackoutReason("");
  };

  const removeBlackout = async (id: string) => {
    const { error } = await supabase.from("booking_blackout_dates").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setBlackouts((p) => p.filter((b) => b.id !== id));
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking availability</CardTitle>
        <CardDescription>Control when prospects can book a meeting on your /book page.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weekday hours */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Weekly hours (Eastern Time)</Label>
          {DAYS.map((d) => {
            const open = !!hours[d.key];
            const v = hours[d.key] ?? ["09:00", "17:00"];
            return (
              <div key={d.key} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
                <div className="flex w-32 items-center gap-2">
                  <Switch checked={open} onCheckedChange={(c) => toggleDay(d.key, c)} />
                  <span className="text-sm font-medium">{d.label}</span>
                </div>
                {open ? (
                  <div className="flex items-center gap-2">
                    <Input type="time" value={v[0]} onChange={(e) => setHour(d.key, 0, e.target.value)} className="w-32" />
                    <span className="text-muted-foreground">–</span>
                    <Input type="time" value={v[1]} onChange={(e) => setHour(d.key, 1, e.target.value)} className="w-32" />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Slot length + buffer + notify */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Slot length</Label>
            <Select value={String(slotMinutes)} onValueChange={(v) => setSlotMinutes(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[15, 30, 45, 60].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Buffer between meetings</Label>
            <Select value={String(bufferMinutes)} onValueChange={(v) => setBufferMinutes(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 5, 10, 15, 30].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notify email</Label>
            <Input type="email" value={notifyEmail} onChange={(e) => setNotifyEmail(e.target.value)} />
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="btn-shadow">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : "Save changes"}
        </Button>

        {/* Blackout dates */}
        <div className="space-y-3 border-t pt-6">
          <Label className="text-sm font-semibold">Blackout dates</Label>
          <p className="text-xs text-muted-foreground">Block specific dates from being booked (holidays, vacation).</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={newBlackoutDate} onChange={(e) => setNewBlackoutDate(e.target.value)} className="w-44" />
            </div>
            <div className="space-y-1 flex-1 min-w-[180px]">
              <Label className="text-xs">Reason (optional)</Label>
              <Input value={newBlackoutReason} onChange={(e) => setNewBlackoutReason(e.target.value)} placeholder="Holiday, vacation…" />
            </div>
            <Button onClick={addBlackout} disabled={!newBlackoutDate} variant="outline">
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>

          {blackouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blackout dates yet.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {blackouts.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="text-sm font-medium">{new Date(b.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                    {b.reason && <p className="text-xs text-muted-foreground">{b.reason}</p>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeBlackout(b.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}