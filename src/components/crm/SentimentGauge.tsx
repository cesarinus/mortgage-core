import { Flame, ThermometerSun, Snowflake, CircleDashed, CheckCircle2 } from "lucide-react";

const map = {
  hot: { label: "Hot", color: "text-red-600 bg-red-50 border-red-200", Icon: Flame },
  warm: { label: "Warm", color: "text-orange-600 bg-orange-50 border-orange-200", Icon: ThermometerSun },
  cold: { label: "Cold", color: "text-sky-600 bg-sky-50 border-sky-200", Icon: Snowflake },
  unresponsive: { label: "Unresponsive", color: "text-muted-foreground bg-muted border-border", Icon: CircleDashed },
  ready: { label: "Ready to Apply", color: "text-emerald-600 bg-emerald-50 border-emerald-200", Icon: CheckCircle2 },
} as const;

export function SentimentGauge({ temperature }: { temperature?: string | null }) {
  const key = (temperature && temperature in map ? temperature : "warm") as keyof typeof map;
  const { label, color, Icon } = map[key];
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${color}`}>
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}