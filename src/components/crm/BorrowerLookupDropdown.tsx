import { useEffect, useRef, useState } from "react";
import { searchBorrowers, type LookupResult } from "@/lib/people/lookup";
import { Badge } from "@/components/ui/badge";
import { User, Globe, Briefcase, Loader2, MapPin, Clock, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

function formatRelative(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

interface Props {
  query: { name?: string; email?: string; phone?: string };
  onPick: (r: LookupResult) => void;
  /** Hide results panel (e.g. after the user has explicitly cleared/dismissed). */
  dismissedKey?: string;
}

function sourceIcon(s: LookupResult["source"]) {
  if (s === "portal") return <Globe className="h-3.5 w-3.5" />;
  if (s === "lead") return <Briefcase className="h-3.5 w-3.5" />;
  return <User className="h-3.5 w-3.5" />;
}

export function BorrowerLookupDropdown({ query, onPick }: Props) {
  const [results, setResults] = useState<LookupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const lastKeyRef = useRef("");

  useEffect(() => {
    setDismissed(false);
    const name = (query.name ?? "").trim();
    const email = (query.email ?? "").trim();
    const phone = (query.phone ?? "").replace(/[^0-9]/g, "");
    // Need at least 2 chars somewhere meaningful
    if (name.length < 2 && email.length < 3 && phone.length < 4) {
      setResults([]);
      return;
    }
    const key = `${name}|${email}|${phone}`;
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const rows = await searchBorrowers({ name, email, phone });
        setResults(rows);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [query.name, query.email, query.phone]);

  if (dismissed) return null;
  if (!loading && results.length === 0) return null;

  return (
    <div className="rounded-md border bg-muted/30 p-2 space-y-1">
      <div className="flex items-center justify-between px-1 pb-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {loading ? "Searching existing records…" : `${results.length} potential match${results.length === 1 ? "" : "es"}`}
        </p>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        {!loading && (
          <button
            type="button"
            className="text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => setDismissed(true)}
          >
            Dismiss
          </button>
        )}
      </div>
      <div className="space-y-1">
        {results.map((r, i) => (
          <button
            key={`${r.source}-${r.personId ?? r.leadId ?? i}`}
            type="button"
            onClick={() => onPick(r)}
            className={cn(
              "w-full text-left rounded border bg-background hover:bg-accent/60 transition",
              "px-2.5 py-2 flex items-start gap-2",
            )}
          >
            <span className="mt-0.5 text-muted-foreground">{sourceIcon(r.source)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-medium truncate">{r.fullName}</span>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                  {r.badge}
                </Badge>
                {r.confidence === "High" && (
                  <Badge className="text-[10px] py-0 px-1.5 h-4 bg-emerald-500/15 text-emerald-600 border-emerald-500/20">
                    {r.matchReason}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {[r.email, r.phone, r.company, r.city].filter(Boolean).join(" · ")}
              </div>
              {r.source === "portal" && r.meta && (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  {r.meta.last_login_at && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Last login {formatRelative(r.meta.last_login_at)}
                    </span>
                  )}
                  {typeof r.meta.documents_uploaded === "number" && (
                    <span className="inline-flex items-center gap-1">
                      <FileCheck className="h-3 w-3" />
                      {r.meta.documents_uploaded}/{r.meta.documents_required} docs
                    </span>
                  )}
                  {r.meta.property_address && (
                    <span className="inline-flex items-center gap-1 truncate max-w-[18rem]">
                      <MapPin className="h-3 w-3" /> {r.meta.property_address}
                    </span>
                  )}
                  {r.meta.loan_type && <span>{r.meta.loan_type}</span>}
                </div>
              )}
            </div>
            <span className="text-[11px] text-primary self-center shrink-0">Use</span>
          </button>
        ))}
      </div>
    </div>
  );
}