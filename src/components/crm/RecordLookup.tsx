import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LookupItem {
  id: string;
  label: string;
  sub?: string;
}

interface Props {
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  items: LookupItem[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

export function RecordLookup({
  value, onChange, items, placeholder = "Select…", emptyText = "No matches.",
  disabled, allowClear = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => items.find(i => i.id === value) ?? null, [items, value]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-1">
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className={cn("truncate text-left", !selected && "text-muted-foreground")}>
              {selected ? selected.label : placeholder}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0 ml-2" />
          </Button>
        </PopoverTrigger>
        {allowClear && selected && !disabled && (
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0"
            onClick={() => onChange(null)} title="Clear">
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map(item => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.sub ?? ""} ${item.id}`}
                  onSelect={() => { onChange(item.id); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", value === item.id ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0">
                    <div className="truncate text-sm">{item.label}</div>
                    {item.sub && <div className="truncate text-xs text-muted-foreground">{item.sub}</div>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}