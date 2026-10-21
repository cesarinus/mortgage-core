import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PEOPLE_FIELDS, guessField, parseSheet, mapRow, digits, type PeopleField } from "@/lib/import/people";

const ROLES = [
  ["real_estate_agent", "Real Estate Agent"], ["referral_partner", "Referral Partner"],
  ["title_agent", "Title Agent"], ["insurance_agent", "Insurance Agent"], ["borrower", "Borrower"], ["lead", "Lead"],
] as const;

interface Props { open: boolean; onOpenChange: (o: boolean) => void; userId: string; onDone: () => void; }

export function ImportPeopleDialog({ open, onOpenChange, userId, onDone }: Props) {
  const { toast } = useToast();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<Record<string, PeopleField>>({});
  const [role, setRole] = useState<string>("real_estate_agent");
  const [dupMode, setDupMode] = useState<"skip" | "update">("update");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number; invalid: number } | null>(null);

  const reset = () => { setHeaders([]); setRows([]); setMapping({}); setResult(null); };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const { headers, rows } = await parseSheet(f);
      setHeaders(headers); setRows(rows); setResult(null);
      setMapping(Object.fromEntries(headers.map((h) => [h, guessField(h)])));
    } catch (err: any) { toast({ title: "Could not read file", description: err.message, variant: "destructive" }); }
  };

  const mapped = useMemo(() => rows.map((r) => mapRow(r, mapping)), [rows, mapping]);

  const run = async () => {
    setRunning(true);
    try {
      const [{ data: existing }, { data: cos }] = await Promise.all([
        supabase.from("contacts").select("*"),
        supabase.from("crm_companies").select("id, name"),
      ]);
      const byEmail = new Map<string, any>(); const byPhone = new Map<string, any>();
      (existing ?? []).forEach((c: any) => {
        if (c.email) byEmail.set(c.email.toLowerCase(), c);
        const d = digits(c.phone); if (d) byPhone.set(d, c);
      });
      const coMap = new Map<string, string>((cos ?? []).map((c: any) => [c.name.trim().toLowerCase(), c.id]));
      const isPartner = !["borrower", "lead"].includes(role);
      let created = 0, updated = 0, skipped = 0, invalid = 0;

      for (const p of mapped) {
        if (!p.first_name && !p.last_name) { invalid++; continue; }
        if (!p.email && !p.phone) { invalid++; continue; }
        let company_id: string | null = null;
        if (p.company) {
          const k = p.company.toLowerCase();
          company_id = coMap.get(k) ?? null;
          if (!company_id) {
            const { data } = await supabase.from("crm_companies").insert({ name: p.company } as any).select("id").maybeSingle();
            if (data) { company_id = data.id; coMap.set(k, data.id); }
          }
        }
        const base: any = {
          first_name: p.first_name || "-", last_name: p.last_name || "-", email: p.email, phone: p.phone,
          address: p.address, job_title: p.job_title, license_number: p.license_number, notes: p.notes, company_id,
        };
        const match = (p.email && byEmail.get(p.email)) || (digits(p.phone) && byPhone.get(digits(p.phone)!));
        if (match) {
          if (dupMode === "skip") { skipped++; continue; }
          const patch: any = {};
          for (const [k, v] of Object.entries(base)) if (v && !match[k]) patch[k] = v;
          if (!match.role) patch.role = role;
          if (Object.keys(patch).length) {
            const { error } = await supabase.from("contacts").update(patch).eq("id", match.id);
            if (error) invalid++; else updated++;
          } else skipped++;
        } else {
          const { data, error } = await supabase.from("contacts").insert({
            ...base, role, contact_type: isPartner ? "partner" : "borrower", created_by: userId,
          } as any).select("*").maybeSingle();
          if (error || !data) { invalid++; continue; }
          created++;
          if (data.email) byEmail.set(data.email.toLowerCase(), data);
          const d = digits(data.phone); if (d) byPhone.set(d, data);
        }
      }
      setResult({ created, updated, skipped, invalid });
      onDone();
    } finally { setRunning(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import people from Excel / CSV</DialogTitle>
          <DialogDescription>Columns are matched automatically. Duplicates are detected by email or phone.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />

          {headers.length > 0 && !result && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Assign role to new people</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>If person already exists</Label>
                  <Select value={dupMode} onValueChange={(v) => setDupMode(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="update">Fill in empty fields only</SelectItem>
                      <SelectItem value="skip">Skip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Column mapping ({rows.length} rows)</Label>
                <div className="grid sm:grid-cols-2 gap-2 mt-2">
                  {headers.map((h) => (
                    <div key={h} className="flex items-center gap-2">
                      <span className="text-sm w-1/2 truncate" title={h}>{h}</span>
                      <Select value={mapping[h]} onValueChange={(v) => setMapping({ ...mapping, [h]: v as PeopleField })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{PEOPLE_FIELDS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Preview</Label>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead>
                    <TableHead>Company</TableHead><TableHead>License</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {mapped.slice(0, 5).map((p, i) => (
                      <TableRow key={i}>
                        <TableCell>{p.first_name} {p.last_name}</TableCell><TableCell>{p.email}</TableCell>
                        <TableCell>{p.phone}</TableCell><TableCell>{p.company}</TableCell><TableCell>{p.license_number}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <Button onClick={run} disabled={running}>
                  {running && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Import {rows.length} rows
                </Button>
              </div>
            </>
          )}

          {result && (
            <div className="grid grid-cols-4 gap-3 text-sm">
              {Object.entries({ Created: result.created, Updated: result.updated, Skipped: result.skipped, "Invalid (no name or no email/phone)": result.invalid }).map(([l, v]) => (
                <div key={l} className="rounded-md border p-3"><div className="text-xs text-muted-foreground">{l}</div><div className="text-2xl font-semibold">{v}</div></div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
