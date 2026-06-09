import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Briefcase, Paperclip, Plus, Download, FileText, Users, Pencil, Minus } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { formatPhone } from "@/lib/format";

interface Props {
  companies: any[];
  deals: any[];
  attachments: any[];
  contacts?: any[];
  onUpload: () => void;
  onAddCompany: () => void;
  onAddContact?: () => void;
  onEditCompanies?: () => void;
  onSignedUrl: (path: string) => Promise<string | null>;
  onRemoveContact?: (lc: any) => void;
  onRemoveCompany?: (cc: any) => void;
}

export function RightRail({ companies, deals, attachments, contacts = [], onUpload, onAddCompany, onAddContact, onEditCompanies, onSignedUrl, onRemoveContact, onRemoveCompany }: Props) {
  return (
    <div className="space-y-4 sticky top-4 self-start">
      {onAddContact && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Contacts ({contacts.length})</CardTitle>
            <Button size="sm" variant="ghost" onClick={onAddContact}><Plus className="h-3.5 w-3.5" /></Button>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm">
            {contacts.length === 0 && <p className="text-muted-foreground text-xs">No contacts linked.</p>}
            {contacts.map((lc) => (
              <div key={lc.id} className="rounded border p-2 group relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link to={`/crm/contacts/${lc.contact?.id}`} className="font-medium hover:underline">
                      {lc.contact?.first_name} {lc.contact?.last_name}
                    </Link>
                    <div className="text-xs text-muted-foreground truncate">
                      {lc.contact?.email ?? "—"}
                    </div>
                    {lc.contact?.phone && (
                      <div className="text-xs text-muted-foreground">{formatPhone(lc.contact.phone)}</div>
                    )}
                    {lc.role && <Badge variant="outline" className="text-xs mt-1">{lc.role}</Badge>}
                  </div>
                  {onRemoveContact && (
                    <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" title="Remove" onClick={() => onRemoveContact(lc)}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Companies ({companies.length})</CardTitle>
          <div className="flex items-center gap-1">
            {onEditCompanies && (
              <Button size="sm" variant="ghost" onClick={onEditCompanies} title="Edit companies">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onAddCompany} title="Add company"><Plus className="h-3.5 w-3.5" /></Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2 text-sm">
          {companies.length === 0 && <p className="text-muted-foreground text-xs">No companies linked.</p>}
          {companies.map((cc) => (
            <div key={cc.id} className="rounded border p-2 group relative">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{cc.company?.name}</div>
                  {cc.role && <div className="text-xs text-muted-foreground">{cc.role}</div>}
                  {cc.company?.is_self_employed && <Badge variant="outline" className="text-xs mt-1">Self-employed</Badge>}
                </div>
                {onRemoveCompany && (
                  <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" title="Remove" onClick={() => onRemoveCompany(cc)}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Briefcase className="h-4 w-4" /> Deals ({deals.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2 text-sm">
          {deals.length === 0 && <p className="text-muted-foreground text-xs">No deals linked. Create one from Pipeline.</p>}
          {deals.map((d) => (
            <div key={d.id} className="rounded border p-2">
              <div className="font-medium">{d.loan_type ?? "Mortgage deal"}</div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground capitalize">{String(d.stage).replace(/_/g, " ")}</span>
                {d.loan_amount && <span>${Number(d.loan_amount).toLocaleString()}</span>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Paperclip className="h-4 w-4" /> Documents ({attachments.length})</CardTitle>
          <Button size="sm" variant="ghost" onClick={onUpload}><Plus className="h-3.5 w-3.5" /></Button>
        </CardHeader>
        <CardContent className="pt-0 space-y-2 text-sm">
          {attachments.length === 0 && <p className="text-muted-foreground text-xs">No documents uploaded.</p>}
          {attachments.map((a) => (
            <div key={a.id} className="flex items-start gap-2 rounded border p-2">
              <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{a.file_name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {a.category_slug} · {format(new Date(a.created_at), "PP")}
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={async () => {
                  const url = await onSignedUrl(a.file_path);
                  if (url) window.open(url, "_blank");
                }}
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}