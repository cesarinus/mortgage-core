import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { loadMappings, saveMapping, deleteMapping, type LosFieldMapping } from "@/lib/los/mappings";

const DATA_TYPES = ["string", "email", "phone", "money", "number", "zip", "date", "boolean"];

export default function AriveFieldMappings() {
  const { toast } = useToast();
  const [rows, setRows] = useState<LosFieldMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setRows(await loadMappings("arive")); }
    catch (e: any) { toast({ title: "Load failed", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<LosFieldMapping>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const handleSave = async (row: LosFieldMapping) => {
    setSavingId(row.id);
    try { await saveMapping(row); toast({ title: "Saved" }); }
    catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setSavingId(null); }
  };

  const handleAdd = async () => {
    try {
      await saveMapping({
        integration: "arive", crm_field: "new_field", external_field: "newField",
        required: false, data_type: "string", sort_order: (rows.at(-1)?.sort_order ?? 0) + 10,
        active: true, default_value: null, transform: null,
      } as any);
      await load();
    } catch (e: any) { toast({ title: "Add failed", description: e.message, variant: "destructive" }); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteMapping(id); await load(); }
    catch (e: any) { toast({ title: "Delete failed", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ARIVE Field Mappings</h1>
          <p className="text-muted-foreground text-sm">Configure how CRM lead fields map to ARIVE / Zapier fields. Editable any time.</p>
        </div>
        <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1" /> Add mapping</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mappings ({rows.length})</CardTitle>
          <CardDescription>Required fields drive validation and readiness score. Default values fill in if the lead has no data.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CRM field</TableHead>
                    <TableHead>External field</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-32"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell><Input value={r.crm_field} onChange={(e) => update(r.id, { crm_field: e.target.value })} /></TableCell>
                      <TableCell><Input value={r.external_field} onChange={(e) => update(r.id, { external_field: e.target.value })} /></TableCell>
                      <TableCell>
                        <Select value={r.data_type} onValueChange={(v) => update(r.id, { data_type: v })}>
                          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>{DATA_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Switch checked={r.required} onCheckedChange={(v) => update(r.id, { required: v })} /></TableCell>
                      <TableCell><Input value={r.default_value ?? ""} onChange={(e) => update(r.id, { default_value: e.target.value || null })} placeholder="—" /></TableCell>
                      <TableCell><Switch checked={r.active} onCheckedChange={(v) => update(r.id, { active: v })} /></TableCell>
                      <TableCell className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleSave(r)} disabled={savingId === r.id}>
                          {savingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}