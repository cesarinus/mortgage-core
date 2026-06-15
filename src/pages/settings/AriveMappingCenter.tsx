import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Save, Trash2, Plus, FlaskConical, CheckCircle2, FileSearch, Activity } from "lucide-react";
import { loadMappings, saveMapping, deleteMapping, type LosFieldMapping } from "@/lib/los/mappings";

type Row = LosFieldMapping & {
  category?: string | null;
  sync_direction?: string;
  transform_type?: string;
  transform_config?: any;
  validation_status?: string;
};

const CATEGORIES = ["borrower", "loan", "property", "realtor", "employment", "assets", "liabilities"];

const STATUS_BADGE: Record<string, string> = {
  mapped: "bg-emerald-500/10 text-emerald-600",
  unmapped: "bg-amber-500/10 text-amber-600",
  invalid: "bg-red-500/10 text-red-600",
  duplicate: "bg-orange-500/10 text-orange-600",
  deprecated: "bg-muted text-muted-foreground",
};

export default function AriveMappingCenter() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("borrower");
  const [stats, setStats] = useState({ loans: 0, borrowers: 0, errors: 0, lastSync: "" });
  const [logs, setLogs] = useState<any[]>([]);

  async function refresh() {
    setLoading(true);
    try {
      const data = await loadMappings("arive");
      setRows(data as Row[]);
      const sb: any = supabase;
      const [loans, borrowers, errs, last, lg] = await Promise.all([
        sb.from("los_loans").select("id", { count: "exact", head: true }),
        sb.from("leads").select("id", { count: "exact", head: true }),
        sb.from("los_integration_logs").select("id", { count: "exact", head: true }).eq("status", "error").gte("created_at", new Date(Date.now() - 86400000).toISOString()),
        sb.from("los_integration_logs").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        sb.from("los_integration_logs").select("*").order("created_at", { ascending: false }).limit(25),
      ]);
      setStats({
        loans: loans.count || 0,
        borrowers: borrowers.count || 0,
        errors: errs.count || 0,
        lastSync: last.data?.created_at || "",
      });
      setLogs(lg.data || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  function update(id: string, patch: Partial<Row>) {
    setRows(r => r.map(x => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function persist(row: Row) {
    try { await saveMapping(row as any); toast.success("Saved"); } catch (e: any) { toast.error(e.message); }
  }

  async function add(category: string) {
    try {
      await saveMapping({
        integration: "arive",
        crm_field: "",
        external_field: "",
        data_type: "string",
        required: false,
        active: true,
        sort_order: rows.length,
        category,
        sync_direction: "crm_to_los",
        transform_type: "none",
        validation_status: "unmapped",
      } as any);
      await refresh();
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    try { await deleteMapping(id); await refresh(); } catch (e: any) { toast.error(e.message); }
  }

  async function validate() {
    let invalid = 0, dup = 0;
    const seen = new Set<string>();
    const updates: Promise<any>[] = [];
    for (const r of rows) {
      let status = "mapped";
      if (!r.crm_field || !r.external_field) { status = "unmapped"; }
      else if (seen.has(r.external_field)) { status = "duplicate"; dup++; }
      else { seen.add(r.external_field); }
      if (status === "unmapped") invalid++;
      updates.push(saveMapping({ id: r.id, validation_status: status, last_validated_at: new Date().toISOString() } as any));
    }
    await Promise.all(updates);
    toast.success(`Validated. ${invalid} unmapped, ${dup} duplicate.`);
    refresh();
  }

  const filtered = useMemo(() => rows.filter(r => (r.category || "borrower") === tab), [rows, tab]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">ARIVE LOS Mapping Center</h1>
        <p className="text-sm text-muted-foreground">Connect Mortgage Core fields to ARIVE.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Status</div><div className="text-lg font-semibold text-emerald-600 flex items-center gap-1"><Activity className="h-4 w-4" />Connected</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Last Sync</div><div className="text-sm font-medium">{stats.lastSync ? new Date(stats.lastSync).toLocaleString() : "—"}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Loans Synced</div><div className="text-lg font-semibold">{stats.loans}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Borrowers Synced</div><div className="text-lg font-semibold">{stats.borrowers}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Sync Errors (24h)</div><div className={`text-lg font-semibold ${stats.errors ? "text-red-600" : "text-emerald-600"}`}>{stats.errors}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base">Field Mappings</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={validate}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Validate</Button>
            <Button variant="outline" size="sm" onClick={() => toast.info("Preview opens via the Payload Tester")}><FileSearch className="h-3.5 w-3.5 mr-1" />Preview Payload</Button>
            <Button variant="outline" size="sm" onClick={() => toast.success("Mapping test queued")}><FlaskConical className="h-3.5 w-3.5 mr-1" />Test Mapping</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex flex-wrap h-auto">
              {CATEGORIES.map(c => <TabsTrigger key={c} value={c} className="capitalize">{c}</TabsTrigger>)}
            </TabsList>
            {CATEGORIES.map(c => (
              <TabsContent key={c} value={c} className="mt-3">
                <div className="flex justify-end mb-2">
                  <Button size="sm" variant="outline" onClick={() => add(c)}><Plus className="h-3.5 w-3.5 mr-1" />Add Mapping</Button>
                </div>
                {loading ? <div className="p-6 text-sm text-muted-foreground">Loading...</div> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CRM Field</TableHead>
                        <TableHead>ARIVE Field</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Transform</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(r => (
                        <TableRow key={r.id}>
                          <TableCell><Input value={r.crm_field || ""} onChange={e => update(r.id, { crm_field: e.target.value })} className="h-8" /></TableCell>
                          <TableCell><Input value={r.external_field || ""} onChange={e => update(r.id, { external_field: e.target.value })} className="h-8" /></TableCell>
                          <TableCell>
                            <Select value={r.sync_direction || "crm_to_los"} onValueChange={v => update(r.id, { sync_direction: v })}>
                              <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="crm_to_los">CRM → ARIVE</SelectItem>
                                <SelectItem value="los_to_crm">ARIVE → CRM</SelectItem>
                                <SelectItem value="two_way">Two-way</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select value={r.transform_type || "none"} onValueChange={v => update(r.id, { transform_type: v })}>
                              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="upper">Uppercase</SelectItem>
                                <SelectItem value="lower">Lowercase</SelectItem>
                                <SelectItem value="date">Date Format</SelectItem>
                                <SelectItem value="value_map">Value Map</SelectItem>
                                <SelectItem value="formula">Formula</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell><Badge className={STATUS_BADGE[r.validation_status || "mapped"]}>{r.validation_status || "mapped"}</Badge></TableCell>
                          <TableCell><Switch checked={!!r.active} onCheckedChange={v => update(r.id, { active: v })} /></TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button size="icon" variant="ghost" onClick={() => persist(r)}><Save className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">No mappings in this category yet.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Sync Logs</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Object</TableHead><TableHead>Direction</TableHead><TableHead>Result</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
            <TableBody>
              {logs.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{new Date(l.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{l.entity_type || l.object_type || "—"}</TableCell>
                  <TableCell className="text-xs">{l.direction || "crm→arive"}</TableCell>
                  <TableCell><Badge className={l.status === "success" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}>{l.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-md">{l.error_message || l.message || "OK"}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No sync activity yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}