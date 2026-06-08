import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { fetchAllContacts, fetchAllCompanies } from "@/lib/crm/queries";

export const ROLE_ON_DEAL_OPTIONS = [
  { value: "primary_borrower", label: "Primary borrower" },
  { value: "co_borrower", label: "Co-borrower" },
  { value: "real_estate_agent", label: "Real estate agent" },
  { value: "title_agent", label: "Title agent" },
  { value: "insurance_agent", label: "Insurance agent" },
  { value: "referral_partner", label: "Referral partner" },
  { value: "other", label: "Other" },
] as const;

const BORROWER_DEAL_ROLES = new Set(["primary_borrower", "co_borrower"]);

interface BaseProps {
  open: boolean;
  onClose: () => void;
  leadId?: string;
  contactId?: string;
  onDone: () => void;
}

export function LinkContactModal({ open, onClose, leadId, onDone }: BaseProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [all, setAll] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("link");
  const [roleOnDeal, setRoleOnDeal] = useState<string>("co_borrower");
  const [isPrimary, setIsPrimary] = useState<boolean>(false);

  useEffect(() => { if (open) fetchAllContacts().then(setAll); }, [open]);

  const link = async (contactId: string, role?: string) => {
    if (!leadId) return;
    // If marking primary, demote others first to satisfy the unique-primary index.
    if (isPrimary) {
      await supabase.from("lead_contacts").update({ is_primary: false })
        .eq("lead_id", leadId).neq("contact_id", contactId);
    }
    const payload: any = {
      lead_id: leadId,
      contact_id: contactId,
      role: role || null,
      role_on_deal: (roleOnDeal || null) as any,
      is_primary: isPrimary,
      created_by: user!.id,
    };
    const { error } = await supabase.from("lead_contacts").upsert(
      payload,
      { onConflict: "lead_id,contact_id", ignoreDuplicates: false }
    );
    if (error) {
      if ((error as any).code === "23505") {
        toast({ title: "Already linked", description: "This contact is already on the lead.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else { toast({ title: "Contact linked" }); onDone(); onClose(); }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { data, error } = await supabase.from("contacts").insert({
      first_name: fd.get("first_name") as string,
      last_name: fd.get("last_name") as string,
      email: (fd.get("email") as string) || null,
      phone: (fd.get("phone") as string) || null,
      contact_type: (fd.get("contact_type") as any) || "borrower",
      created_by: user!.id,
    }).select("id").maybeSingle();
    if (error || !data) { toast({ title: "Error", description: error?.message, variant: "destructive" }); return; }
    await link(data.id, fd.get("role") as string);
  };

  const filtered = all.filter(c =>
    `${c.first_name} ${c.last_name} ${c.email ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 px-1">
          <div>
            <Label className="text-xs">Role on deal</Label>
            <Select value={roleOnDeal} onValueChange={(v) => {
              setRoleOnDeal(v);
              if (v === "primary_borrower") setIsPrimary(true);
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_ON_DEAL_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-end gap-2 pb-2 cursor-pointer">
            <Checkbox checked={isPrimary} onCheckedChange={(v) => setIsPrimary(!!v)} id="link-primary" />
            <span className="text-sm">Primary contact for this lead</span>
          </label>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="link">Link existing</TabsTrigger>
            <TabsTrigger value="new">Create new</TabsTrigger>
          </TabsList>
          <TabsContent value="link" className="space-y-3 mt-4">
            <Input placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} />
            <div className="max-h-72 overflow-auto space-y-1">
              {filtered.map(c => (
                <button key={c.id} onClick={() => link(c.id)}
                  className="w-full text-left rounded border p-2 hover:bg-muted text-sm">
                  <div className="font-medium">{c.first_name} {c.last_name}</div>
                  <div className="text-xs text-muted-foreground">{c.email ?? "—"} · {c.contact_type}</div>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-xs text-muted-foreground p-3 text-center">No contacts found.</p>}
            </div>
          </TabsContent>
          <TabsContent value="new" className="mt-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>First name</Label><Input name="first_name" required /></div>
                <div><Label>Last name</Label><Input name="last_name" required /></div>
              </div>
              <div><Label>Email</Label><Input name="email" type="email" /></div>
              <div><Label>Phone</Label><Input name="phone" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Type</Label>
                  <Select name="contact_type" defaultValue="borrower">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="borrower">Borrower</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Role on lead</Label><Input name="role" placeholder="Co-borrower, agent…" /></div>
              </div>
              <Button type="submit" className="w-full">Create &amp; link</Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function LinkCompanyModal({ open, onClose, leadId, contactId, onDone }: BaseProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [all, setAll] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("link");

  useEffect(() => { if (open) fetchAllCompanies().then(setAll); }, [open]);

  const link = async (companyId: string, role?: string) => {
    const { error } = await supabase.from("crm_contact_companies").insert({
      lead_id: leadId ?? null, contact_id: contactId ?? null, company_id: companyId,
      role: role || null,
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Company linked" }); onDone(); onClose(); }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { data, error } = await supabase.from("crm_companies").insert({
      name: fd.get("name") as string,
      industry: (fd.get("industry") as string) || null,
      website: (fd.get("website") as string) || null,
      is_self_employed: fd.get("self_employed") === "on",
      created_by: user!.id,
    }).select("id").maybeSingle();
    if (error || !data) { toast({ title: "Error", description: error?.message, variant: "destructive" }); return; }
    await link(data.id, fd.get("role") as string);
  };

  const filtered = all.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Company</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="link">Link existing</TabsTrigger>
            <TabsTrigger value="new">Create new</TabsTrigger>
          </TabsList>
          <TabsContent value="link" className="space-y-3 mt-4">
            <Input placeholder="Search companies…" value={search} onChange={e => setSearch(e.target.value)} />
            <div className="max-h-72 overflow-auto space-y-1">
              {filtered.map(c => (
                <button key={c.id} onClick={() => link(c.id)}
                  className="w-full text-left rounded border p-2 hover:bg-muted text-sm">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.industry ?? "—"}{c.is_self_employed ? " · Self-employed" : ""}</div>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-xs text-muted-foreground p-3 text-center">No companies found.</p>}
            </div>
          </TabsContent>
          <TabsContent value="new" className="mt-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div><Label>Name</Label><Input name="name" required /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Industry</Label><Input name="industry" /></div>
                <div><Label>Website</Label><Input name="website" /></div>
              </div>
              <div><Label>Role</Label><Input name="role" placeholder="Employer, lender…" /></div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="self_employed" /> Self-employed
              </label>
              <Button type="submit" className="w-full">Create &amp; link</Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}