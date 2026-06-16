import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { findMatches, type MatchRow } from "@/lib/people/api";
import { AlertCircle, ExternalLink, UserPlus, Users } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  query: { email?: string; phone?: string; name?: string };
  onUseExisting: (personId: string) => void;
  onCreateNew: () => void;
  createLabel?: string;
};

export default function DuplicateMatchModal({
  open, onOpenChange, query, onUseExisting, onCreateNew, createLabel = "Create New Record Anyway",
}: Props) {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    findMatches(query).then(setMatches).finally(() => setLoading(false));
  }, [open, query.email, query.phone, query.name]);

  const tier1 = matches.filter((m) => m.match_tier === 1);
  const tier2 = matches.filter((m) => m.match_tier === 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            {tier1.length > 0 ? "Existing Person Found" : "Possible Match Found"}
          </DialogTitle>
          <DialogDescription>
            {tier1.length > 0
              ? "This person already exists in Mortgage Core. Prefer using the existing record."
              : "We found similar names. Please confirm whether this is the same person."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[420px] overflow-y-auto">
          {loading && <div className="text-sm text-muted-foreground">Searching…</div>}
          {!loading && matches.length === 0 && (
            <div className="text-sm text-muted-foreground">No matches found.</div>
          )}
          {matches.map((m) => (
            <div key={m.person_id} className="rounded-lg border p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-medium">{m.full_name || "Unnamed"}</div>
                  <Badge variant={m.match_tier === 1 ? "default" : "secondary"}>
                    {m.confidence}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {m.match_reason}
                    {m.match_tier === 2 ? ` · ${(m.similarity * 100).toFixed(0)}%` : ""}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                  {m.email && <div>{m.email}</div>}
                  {m.phone && <div>{m.phone}</div>}
                  {(m.company || m.city || m.zip) && (
                    <div className="text-xs">
                      {[m.company, m.city, m.zip].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Button size="sm" onClick={() => onUseExisting(m.person_id)}>
                  <Users className="h-3.5 w-3.5 mr-1" />
                  Use Existing
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/people/${m.person_id}`} target="_blank">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Open
                  </Link>
                </Button>
              </div>
            </div>
          ))}
          {tier2.length > 0 && tier1.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Name-similarity matches are suggestions only and require your confirmation.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" onClick={onCreateNew}>
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            {createLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}