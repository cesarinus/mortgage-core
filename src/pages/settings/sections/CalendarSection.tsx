import BookingAvailabilitySettings from "@/components/settings/BookingAvailabilitySettings";
export default function CalendarSection() {
  return (
    <div className="max-w-3xl space-y-4">
      <div><h1 className="text-2xl font-bold tracking-tight">Calendar</h1><p className="text-muted-foreground text-sm">Booking availability shown on your public scheduling page.</p></div>
      <BookingAvailabilitySettings />
    </div>
  );
}