import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Unlink, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LinkCompanyModal } from "@/components/crm/actions/LinkContactCompanyModals";

interface Props {
  open: boolean;
  onClose: () => void;
  leadId?: string;
  companies: any[]; // rows from fetchCompanies
  onChanged: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  lender: "Lender",
  title_company: "Title company",
  insurance_agency: "Insurance agency",
  real_estate_brokerage: "Real estate brokerage",
  other: "Other",
};

export function CompaniesEditDrawer({ open, onClose, leadId, companies, onChanged }: Props) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);

  const unlink = async (linkId: string) => {
    const { error } = await supabase.from("crm_contact_companies").delete().eq("id", linkId);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Company unlinked" });
    onChanged();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Edit linked companies</SheetTitle>
          </SheetHeader>
          <div className="space-y-2">
            {companies.length === 0 && (
              <p className="text-sm text-muted-foreground">No companies linked yet.</p>
            )}
            {companies.map((row: any) => (
              <div key={row.id} className="flex items-center justify-between gap-3 rounded border p-3">
                <div className="min-w-0 flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{row.company?.name ?? "—"}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {row.company?.company_type && (
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {TYPE_LABEL[row.company.company_type] ?? row.company.company_type.replace(/_/g, " ")}
                        </Badge>
                      )}
                      {row.role && <span className="text-xs text-muted-foreground">{row.role}</span>}
                    </div>
                  </div>
                </div>
                <Button size="icon" variant="ghost" title="Unlink" onClick={() => unlink(row.id)}>
                  <Unlink className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add company
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <LinkCompanyModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        leadId={leadId}
        onDone={onChanged}
      />
    </>
  );
}