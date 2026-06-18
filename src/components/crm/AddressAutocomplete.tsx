import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { getAddressProvider, type AddressSuggestion, type ResolvedAddress } from "@/lib/address/provider";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onResolved?: (addr: ResolvedAddress) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function newSessionToken() {
  // RFC4122-ish session token used by Places billing
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function AddressAutocomplete({ value, onChange, onResolved, placeholder, className, disabled }: Props) {
  const provider = useMemo(() => getAddressProvider(), []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const sessionTokenRef = useRef<string>(newSessionToken());
  const lastQueryRef = useRef<string>("");
  const skipNextSearchRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    const q = (value ?? "").trim();
    if (q.length < 3) {
      setItems([]);
      setOpen(false);
      return;
    }
    if (q === lastQueryRef.current) return;
    lastQueryRef.current = q;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await provider.autocomplete(q, sessionTokenRef.current);
        setItems(res);
        setOpen(res.length > 0);
        setActiveIdx(0);
      } catch {
        setItems([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [value, provider]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const choose = async (s: AddressSuggestion) => {
    setOpen(false);
    try {
      const resolved = await provider.resolve(s.id, sessionTokenRef.current);
      sessionTokenRef.current = newSessionToken();
      skipNextSearchRef.current = true;
      onChange(resolved.formatted || s.description);
      onResolved?.(resolved);
    } catch {
      skipNextSearchRef.current = true;
      onChange(s.description);
    }
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          disabled={disabled}
          placeholder={placeholder ?? "Start typing an address…"}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => items.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (!open || items.length === 0) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(items.length - 1, i + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
            else if (e.key === "Enter") { e.preventDefault(); choose(items[activeIdx]); }
            else if (e.key === "Escape") setOpen(false);
          }}
          className="pl-8"
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && items.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-72 overflow-auto">
          {items.map((s, i) => (
            <button
              type="button"
              key={s.id}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => choose(s)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm border-b last:border-b-0",
                i === activeIdx ? "bg-accent" : "hover:bg-accent/60",
              )}
            >
              <div className="font-medium">{s.mainText}</div>
              {s.secondaryText && (
                <div className="text-xs text-muted-foreground">{s.secondaryText}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}