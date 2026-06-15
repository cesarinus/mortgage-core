import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, ShieldCheck, Copy, Trash2, Plus } from "lucide-react";

type Member = { id: string; email: string; first_name: string; last_name: string; role?: string; last_sign_in_at?: string };
type Role = { id: string; key: string; name: string; description: string | null; base_role: string; is_system: boolean; is_active: boolean };
type Permission = { id: string; resource: string; action: string };

const RESOURCES = ["leads", "borrowers", "loans", "pipeline", "documents", "reports", "settings"];
const ACTIONS = ["view", "create", "edit", "delete", "export", "manage"];
const SCOPES = ["none", "own", "team", "branch", "company"];

export default function TeamManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [perms, setPerms] = useState<Permission[]>([]);
  const [rolePerms, setRolePerms] = useState<Record<string, Record<string, string>>>({});
  const [activeRole, setActiveRole] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState<string>("");

  async function load() {
    const sb: any = supabase;
    const [p, r, pm, rp] = await Promise.all([
      sb.from("profiles").select("id, email, first_name, last_name"),
      sb.from("roles").select("*").order("is_system", { ascending: false }),
      sb.from("permissions").select("*"),
      sb.from("role_permissions").select("role_id, scope, permissions(resource, action)"),
    ]);
    setMembers(p.data || []);
    setRoles(r.data || []);
    setPerms(pm.data || []);
    const map: Record<string, Record<string, string>> = {};
    (rp.data || []).forEach((row: any) => {
      map[row.role_id] ||= {};
      map[row.role_id][`${row.permissions.resource}:${row.permissions.action}`] = row.scope;
    });
    setRolePerms(map);
    if (!activeRole && r.data?.[0]) setActiveRole(r.data[0].id);

    const userRoles = await sb.from("user_roles").select("user_id, role");
    setMembers(prev => prev.map(m => ({ ...m, role: userRoles.data?.find((u: any) => u.user_id === m.id)?.role })));
  }

  useEffect(() => { load(); }, []);

  async function invite() {
    if (!inviteEmail) return;
    const { error } = await (supabase as any).from("team_invitations").insert({ email: inviteEmail, role_id: inviteRoleId || null });
    if (error) return toast.error(error.message);
    toast.success(`Invitation created for ${inviteEmail}`);
    setInviteEmail(""); setInviteRoleId("");
  }

  async function createRole() {
    const name = prompt("New role name?");
    if (!name) return;
    const key = name.toLowerCase().replace(/\s+/g, "_");
    const { error } = await (supabase as any).from("roles").insert({ key, name, base_role: "assistant", is_system: false });
    if (error) return toast.error(error.message);
    toast.success("Role created");
    load();
  }

  async function setPerm(roleId: string, resource: string, action: string, scope: string) {
    const perm = perms.find(p => p.resource === resource && p.action === action);
    if (!perm) return;
    const sb: any = supabase;
    if (scope === "none") {
      await sb.from("role_permissions").delete().eq("role_id", roleId).eq("permission_id", perm.id);
    } else {
      await sb.from("role_permissions").upsert({ role_id: roleId, permission_id: perm.id, scope }, { onConflict: "role_id,permission_id" });
    }
    setRolePerms(prev => {
      const next = { ...prev };
      next[roleId] = { ...(next[roleId] || {}) };
      if (scope === "none") delete next[roleId][`${resource}:${action}`];
      else next[roleId][`${resource}:${action}`] = scope;
      return next;
    });
  }

  const role = roles.find(r => r.id === activeRole);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Team & Permissions</h1>
        <p className="text-sm text-muted-foreground">Manage users, roles, and access control.</p>
      </div>

      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-4 space-y-3">
          <Card>
            <CardHeader className="flex-row justify-between items-center pb-3">
              <CardTitle className="text-base">Members</CardTitle>
              <Dialog>
                <DialogTrigger asChild><Button size="sm"><UserPlus className="h-3.5 w-3.5 mr-1" />Invite User</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
                  <div className="space-y-3 mt-2">
                    <Input placeholder="email@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                    <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                      <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                      <SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button onClick={invite} className="w-full">Send Invitation</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Last Login</TableHead></TableRow></TableHeader>
                <TableBody>
                  {members.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{[m.first_name, m.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                      <TableCell className="text-xs">{m.email}</TableCell>
                      <TableCell><Badge variant="outline">{m.role || "no role"}</Badge></TableCell>
                      <TableCell><Badge className="bg-emerald-500/10 text-emerald-600">Active</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">—</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <Card>
            <CardHeader className="flex-row justify-between items-center pb-3">
              <CardTitle className="text-base">Roles</CardTitle>
              <Button size="sm" onClick={createRole}><Plus className="h-3.5 w-3.5 mr-1" />Create Role</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Key</TableHead><TableHead>Base</TableHead><TableHead>Type</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {roles.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.key}</TableCell>
                      <TableCell><Badge variant="outline">{r.base_role}</Badge></TableCell>
                      <TableCell>{r.is_system ? <Badge className="bg-blue-500/10 text-blue-600">System</Badge> : <Badge>Custom</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" disabled={r.is_system} onClick={async () => { await (supabase as any).from("roles").delete().eq("id", r.id); load(); }}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Permission Matrix</CardTitle>
                <Select value={activeRole} onValueChange={setActiveRole}>
                  <SelectTrigger className="h-8 w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {role && (
                <Table>
                  <TableHeader><TableRow><TableHead>Resource</TableHead>{ACTIONS.map(a => <TableHead key={a} className="capitalize">{a}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>
                    {RESOURCES.map(res => (
                      <TableRow key={res}>
                        <TableCell className="font-medium capitalize">{res}</TableCell>
                        {ACTIONS.map(act => {
                          const cur = rolePerms[role.id]?.[`${res}:${act}`] || "none";
                          return (
                            <TableCell key={act}>
                              <Select value={cur} onValueChange={v => setPerm(role.id, res, act, v)}>
                                <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{SCOPES.map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}</SelectContent>
                              </Select>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}