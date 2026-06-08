import { LucideIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export type SmartViewItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  count: number;
};

export type FilterTier = {
  title: string;
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string }[];
};

type Props = {
  smartViews: SmartViewItem[];
  smartView: string;
  onSmartViewChange: (v: string) => void;
  tiers: FilterTier[];
};

/**
 * Left-rail filter sidebar shared by CRM list pages.
 * Styled to match the Leads / Pipeline filter panel.
 */
export function FilterSidebar({ smartViews, smartView, onSmartViewChange, tiers }: Props) {
  return (
    <div className="hidden lg:flex w-56 shrink-0 flex-col border-r bg-card p-4 gap-5 overflow-y-auto">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Smart Views
        </h3>
        <div className="space-y-0.5">
          {smartViews.map((v) => {
            const Icon = v.icon;
            const active = smartView === v.key;
            return (
              <button
                key={v.key}
                onClick={() => onSmartViewChange(v.key)}
                className={`flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="truncate">{v.label}</span>
                <span className="ml-auto text-xs opacity-70">{v.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {tiers.map((tier) => (
        <div key={tier.title}>
          <Separator className="mb-4" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {tier.title}
          </h3>
          <div className="space-y-0.5">
            <button
              onClick={() => tier.onChange("all")}
              className={`w-full text-left rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                tier.value === "all"
                  ? "bg-muted font-medium"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              All
            </button>
            {tier.options.map((o) => (
              <button
                key={o.key}
                onClick={() => tier.onChange(o.key)}
                className={`w-full text-left rounded-md px-2.5 py-1.5 text-sm capitalize transition-colors ${
                  tier.value === o.key
                    ? "bg-muted font-medium"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}