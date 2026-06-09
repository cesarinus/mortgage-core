import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Plus, LayoutDashboard, Users, Kanban, Contact, Building2, UserPlus, Search,
} from "lucide-react";

export function QuickActionsMenu({ onNewLead }: { onNewLead: () => void }) {
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" aria-label="Quick actions">
          <Plus className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Go to</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => navigate("/dashboard")}><LayoutDashboard className="h-4 w-4 mr-2" />Dashboard</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/leads")}><Users className="h-4 w-4 mr-2" />Leads</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/pipeline")}><Kanban className="h-4 w-4 mr-2" />Pipeline</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/contacts/people")}><Contact className="h-4 w-4 mr-2" />People</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/contacts/companies")}><Building2 className="h-4 w-4 mr-2" />Companies</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Create</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onNewLead}><UserPlus className="h-4 w-4 mr-2" />New lead</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/leads")}><Search className="h-4 w-4 mr-2" />Find a lead</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}