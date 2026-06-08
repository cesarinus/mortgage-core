import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { Loader2, Upload, Download, Database } from "lucide-react";
import {
  parseFile,
  runImport,
  rejectsToCsv,
  type ParsedFile,
  type ImportResult,
} from "@/lib/import/arive";

export default function ImportArive() {
  const { user, role, loading } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [parsing, setParsing] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  if (loading) return null;
  if (role !== "admin") return <Navigate to="/dashboard" replace />;

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    if (!list.length) return;
    setParsing(true);
    setResult(null);
    try {
      const parsed = await Promise.all(list.map(parseFile));
      setFiles((prev) => {
        // Replace same kind if re-uploaded
        const next = [...prev];
        for (const p of parsed) {
          const idx = next.findIndex((f) => f.kind === p.kind);
          if (idx >= 0) next[idx] = p;
          else next.push(p);
        }
        return next;
      });
    } catch (err: any) {
      toast({ title: "Parse error", description: err.message, variant: "destructive" });
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  };

  const runDry = async () => {
    if (!user || !files.length) return;
    setRunning(true);
    try {
      const r = await runImport(files, user.id, { dryRun: true });
      setResult(r);
    } finally {
      setRunning(false);
    }
  };

  const runReal = async () => {
    if (!user || !files.length) return;
    if (!confirm("Import to the live database? Existing contacts/companies with matching email/name will be updated (empty fields filled only).")) return;
    setRunning(true);
    try {
      const r = await runImport(files, user.id, { dryRun: false });
      setResult(r);
      toast({ title: "Import complete", description: `${r.contactsCreated + r.contactsUpdated} contacts, ${r.companiesCreated + r.companiesUpdated} companies` });
    } catch (err: any) {
      toast({ title: "Import error", description: err.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const downloadRejects = () => {
    if (!result?.rejected.length) return;
    const csv = rejectsToCsv(result.rejected);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arive-rejects-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import from Arive</h1>
        <p className="text-muted-foreground">Upload Borrowers and Business Contacts exports. Existing records are updated by email (contacts) or name (companies); empty fields are filled, non-empty values are preserved.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Upload files</CardTitle>
          <CardDescription>Borrowers.xlsx and/or BusinessContacts.xlsx. File type is detected automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="files">Choose .xlsx files</Label>
            <Input id="files" type="file" multiple accept=".xlsx,.xls" onChange={onPick} disabled={parsing} />
          </div>
          {parsing && <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Parsing…</div>}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f) => (
                <div key={f.kind} className="flex items-center gap-3 text-sm">
                  <Badge variant="secondary" className="capitalize">{f.kind === "borrowers" ? "Borrowers" : "Business Contacts"}</Badge>
                  <span>{f.rows.length} rows · {f.headers.length} columns</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Run import</CardTitle>
            <CardDescription>Preview first to see what will change without writing anything. Then run for real.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button variant="outline" onClick={runDry} disabled={running}>
                {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                Preview (dry run)
              </Button>
              <Button onClick={runReal} disabled={running}>
                {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Import for real
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>3. Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Stat label="Contacts created" value={result.contactsCreated} />
              <Stat label="Contacts updated" value={result.contactsUpdated} />
              <Stat label="Companies created" value={result.companiesCreated} />
              <Stat label="Companies updated" value={result.companiesUpdated} />
              <Stat label="Links created" value={result.linksCreated} />
              <Stat label="Rejected" value={result.rejected.length} />
            </div>
            {result.rejected.length > 0 && (
              <Button variant="outline" size="sm" onClick={downloadRejects}>
                <Download className="h-4 w-4 mr-2" /> Download rejects CSV
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}