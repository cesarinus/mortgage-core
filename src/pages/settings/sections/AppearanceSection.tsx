import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTheme, type ThemeName } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Moon, Sun, Palette, Monitor } from "lucide-react";

export default function AppearanceSection() {
  const { theme, setTheme } = useTheme(); const { toast } = useToast();
  return (
    <div className="max-w-3xl space-y-4">
      <div><h1 className="text-2xl font-bold tracking-tight">Appearance</h1><p className="text-muted-foreground text-sm">Choose how the CRM looks. Saved to your profile.</p></div>
      <Card>
        <CardHeader><CardTitle>Theme</CardTitle><CardDescription>Live preview — changes apply instantly.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            { id: "ng-dark",  label: "NG Dark",     Icon: Moon,    swatch: ["#0F172A", "#111827", "#FF7A00"] },
            { id: "ng-light", label: "NG Light",    Icon: Sun,     swatch: ["#F5F7FA", "#FFFFFF", "#FF7A00"] },
            { id: "original", label: "Original CRM", Icon: Palette, swatch: ["#FAF8F5", "#FFFFFF", "#FF7A00"] },
            { id: "system",   label: "Auto System",  Icon: Monitor, swatch: ["#0F172A", "#FFFFFF", "#FF7A00"] },
          ] as { id: ThemeName; label: string; Icon: any; swatch: string[] }[]).map((opt) => (
            <button key={opt.id} type="button"
              onClick={() => { setTheme(opt.id); toast({ title: `Theme: ${opt.label}` }); }}
              className={cn(
                "group flex flex-col gap-2 rounded-xl border bg-card p-3 text-left transition-all hover:border-primary/50 hover:shadow-md",
                theme === opt.id ? "border-primary ring-2 ring-primary/20" : "border-border",
              )}>
              <div className="flex items-center justify-between">
                <opt.Icon className="h-4 w-4 text-muted-foreground" />
                {theme === opt.id && <span className="text-[10px] font-semibold uppercase text-primary">Active</span>}
              </div>
              <div className="flex h-10 overflow-hidden rounded-md border border-border/60">
                {opt.swatch.map((c, i) => (<div key={i} className="flex-1" style={{ background: c }} />))}
              </div>
              <p className="text-sm font-medium">{opt.label}</p>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}