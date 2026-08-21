import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { money, num } from "@/lib/closing-disclosure/calc";
import { cn } from "@/lib/utils";

/** Labels (lowercased) that were pre-filled from a Deal/Opportunity import. */
export const ImportedFieldsContext = createContext<Set<string>>(new Set());

function useImported(label: string) {
  const set = useContext(ImportedFieldsContext);
  return set.has(label.trim().toLowerCase());
}

/** Small "from deal" tag shown next to imported labels. */
function ImportedTag({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="cd-imported-tag">from deal</span>;
}

export function Section({
  title,
  description,
  children,
  letter,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  letter?: string;
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {letter && (
            <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
              {letter}
            </span>
          )}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function Grid({ cols = 2, children }: { cols?: 1 | 2 | 3 | 4; children: ReactNode }) {
  const map = {
    1: "grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  } as const;
  return <div className={cn("grid gap-4 grid-cols-1", map[cols])}>{children}</div>;
}

interface BaseProps {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  required,
  placeholder,
  className,
}: BaseProps & { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function AreaField({
  label,
  value,
  onChange,
  hint,
  rows = 3,
  className,
}: BaseProps & { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Textarea rows={rows} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function DateField({
  label,
  value,
  onChange,
  required,
  className,
}: BaseProps & { value: string; onChange: (v: string) => void }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** Currency input: free typing, formats to $0,000.00 on blur. */
export function MoneyField({
  label,
  value,
  onChange,
  hint,
  required,
  className,
  compact,
}: BaseProps & { value: number | null; onChange: (v: number | null) => void; compact?: boolean }) {
  const [text, setText] = useState(value === null || value === undefined ? "" : String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(value === null || value === undefined ? "" : String(value));
  }, [value, focused]);

  const display = focused ? text : value === null || value === undefined ? "" : money(value);

  return (
    <div className={cn("space-y-1.5", className)}>
      {!compact && (
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <Input
        inputMode="decimal"
        aria-label={label}
        placeholder="$0.00"
        value={display}
        onFocus={() => setFocused(true)}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          setFocused(false);
          const cleaned = text.replace(/[^0-9.-]/g, "");
          onChange(cleaned === "" ? null : num(cleaned));
        }}
        className="text-right tabular-nums"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = "0.001",
  hint,
  required,
  className,
  compact,
}: BaseProps & {
  value: number | null;
  onChange: (v: number | null) => void;
  suffix?: string;
  step?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {!compact && (
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          type="number"
          step={step}
          aria-label={label}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className={cn("text-right tabular-nums", suffix && "pr-8")}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  className,
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function CheckField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border/70 p-3 transition-colors hover:bg-muted/40">
      <Checkbox checked={!!checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <span className="space-y-0.5">
        <span className="block text-sm font-medium leading-tight">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

export function TotalRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number | null;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
        emphasis ? "border-primary/40 bg-primary/5 font-semibold" : "border-border/60 bg-muted/40",
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums">{money(value ?? 0)}</span>
    </div>
  );
}

export interface Column<T> {
  key: keyof T & string;
  header: string;
  type: "text" | "money" | "number" | "check";
  width?: string;
  suffix?: string;
}

export function LineItems<T extends object>({
  title,
  rows,
  columns,
  onChange,
  makeRow,
  addLabel = "Add line",
}: {
  title?: string;
  rows: T[];
  columns: Array<Column<T>>;
  onChange: (rows: T[]) => void;
  makeRow: () => T;
  addLabel?: string;
}) {
  const update = (i: number, key: string, v: unknown) => {
    const next = rows.map((r, idx) => (idx === i ? ({ ...r, [key]: v } as T) : r));
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {title && <p className="text-sm font-medium">{title}</p>}
      <div className="space-y-3">
        {rows.length === 0 && (
          <p className="rounded-md border border-dashed border-border/70 p-4 text-center text-sm text-muted-foreground">
            No lines added.
          </p>
        )}
        {rows.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-1 items-end gap-3 rounded-lg border border-border/60 p-3 sm:grid-cols-[repeat(auto-fit,minmax(140px,1fr))_auto]"
          >
            {columns.map((c) => {
              const value = (row as Record<string, unknown>)[c.key];
              if (c.type === "text") {
                return (
                  <TextField
                    key={c.key}
                    label={c.header}
                    value={(value as string) ?? ""}
                    onChange={(v) => update(i, c.key, v)}
                  />
                );
              }
              if (c.type === "money") {
                return (
                  <div key={c.key} className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {c.header}
                    </Label>
                    <MoneyField
                      label={c.header}
                      compact
                      value={(value as number | null) ?? null}
                      onChange={(v) => update(i, c.key, v)}
                    />
                  </div>
                );
              }
              if (c.type === "number") {
                return (
                  <div key={c.key} className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {c.header}
                    </Label>
                    <NumberField
                      label={c.header}
                      compact
                      suffix={c.suffix}
                      value={(value as number | null) ?? null}
                      onChange={(v) => update(i, c.key, v)}
                    />
                  </div>
                );
              }
              return (
                <label key={c.key} className="flex items-center gap-2 pb-2 text-sm">
                  <Checkbox
                    checked={!!value}
                    onCheckedChange={(v) => update(i, c.key, v === true)}
                  />
                  {c.header}
                </label>
              );
            })}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove line"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, makeRow()])}>
        <Plus className="mr-2 h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  );
}
