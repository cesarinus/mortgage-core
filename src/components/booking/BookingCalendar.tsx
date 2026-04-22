import { useEffect, useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toISODate, formatTime, formatDateLong } from "@/lib/booking";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  selectedSlot: string | null;
  onSelectSlot: (iso: string) => void;
}

export default function BookingCalendar({ selectedSlot, onSelectSlot }: Props) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [date, setDate] = useState<Date | undefined>();
  const [days, setDays] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  // Fetch a 60-day window of availability on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const from = toISODate(today);
      const toDate = new Date(today);
      toDate.setDate(toDate.getDate() + 60);
      const to = toISODate(toDate);
      const { data, error } = await supabase.functions.invoke("get-booking-availability", {
        body: { from, to },
      });
      if (!cancelled) {
        if (error) console.error("availability error:", error);
        setDays((data as any)?.days ?? {});
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [today]);

  const slotsForDate = date ? days[toISODate(date)] ?? [] : [];
  const hasSlots = (d: Date) => (days[toISODate(d)]?.length ?? 0) > 0;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      {/* Calendar */}
      <div>
        <h3 className="mb-3 font-display text-lg font-semibold">Select a Date</h3>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={(d) => {
            const dd = new Date(d);
            dd.setHours(0, 0, 0, 0);
            if (dd < today) return true;
            const max = new Date(today);
            max.setDate(max.getDate() + 60);
            if (dd > max) return true;
            return !hasSlots(dd);
          }}
          className="rounded-md border"
        />
        <p className="mt-3 text-xs text-muted-foreground">Time zone: Eastern Time (ET)</p>
      </div>

      {/* Time slots */}
      <div>
        <h3 className="mb-3 font-display text-lg font-semibold">
          {date ? formatDateLong(date) : "Pick a date"}
        </h3>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading availability…
          </div>
        ) : !date ? (
          <p className="text-sm text-muted-foreground">Choose a day to see open times.</p>
        ) : slotsForDate.length === 0 ? (
          <p className="text-sm text-muted-foreground">No times available on this day.</p>
        ) : (
          <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1">
            {slotsForDate.map((iso) => {
              const isSelected = selectedSlot === iso;
              return (
                <Button
                  key={iso}
                  variant={isSelected ? "default" : "outline"}
                  className="justify-center"
                  onClick={() => onSelectSlot(iso)}
                >
                  {formatTime(new Date(iso))}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}