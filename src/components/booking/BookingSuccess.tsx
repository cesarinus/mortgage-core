import { Button } from "@/components/ui/button";
import { CheckCircle2, CalendarPlus, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDateLong, formatTimeRange, generateICS, downloadICS } from "@/lib/booking";

interface Props {
  start: Date;
  end: Date;
  meetingType: "call" | "zoom";
  firstName: string;
}

export default function BookingSuccess({ start, end, meetingType, firstName }: Props) {
  const downloadCalendar = () => {
    const ics = generateICS({
      title: "NexGen Capital — Mortgage Consultation",
      description: `Meeting type: ${meetingType === "zoom" ? "Zoom Video Call" : "Phone Call"}.\nWe'll be in touch shortly.`,
      start,
      end,
      location: meetingType === "zoom" ? "Zoom (link emailed before meeting)" : "Phone call",
    });
    downloadICS("nexgen-meeting.ics", ics);
  };

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="h-9 w-9" />
      </div>
      <h2 className="font-display text-2xl font-bold">You're all set, {firstName}!</h2>
      <p className="mt-2 text-muted-foreground">A confirmation email is on its way.</p>

      <div className="card-elevated mx-auto mt-6 max-w-md p-5 text-left">
        <p className="text-sm font-semibold text-primary">{formatDateLong(start)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{formatTimeRange(start, end)}</p>
        <p className="mt-3 text-sm">
          <span className="font-medium">Meeting type:</span>{" "}
          {meetingType === "zoom" ? "Zoom Video Call" : "Phone Call"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {meetingType === "zoom"
            ? "We'll email you the Zoom link before the meeting."
            : "We'll call you at the phone number you provided."}
        </p>
      </div>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button onClick={downloadCalendar} className="btn-shadow">
          <CalendarPlus className="mr-2 h-4 w-4" /> Add to calendar
        </Button>
        <Button asChild variant="outline">
          <Link to="/"><Home className="mr-2 h-4 w-4" /> Back to home</Link>
        </Button>
      </div>
    </div>
  );
}