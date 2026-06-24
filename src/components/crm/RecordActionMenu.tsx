import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRightSquare,
  Copy,
  Eye,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  StickyNote,
  Trash2,
  Clock,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export type RecordActionKey =
  | "view"
  | "open"
  | "edit"
  | "copyEmail"
  | "copyPhone"
  | "copyAddress"
  | "createTask"
  | "addNote"
  | "sendEmail"
  | "viewTimeline"
  | "delete";

export type RecordEntity = "lead" | "opportunity" | "contact" | "company" | "loan";

export type RecordPayload = {
  id: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  /** URL to a lightweight detail/drawer view */
  viewHref?: string;
  /** URL to the full workspace */
  workspaceHref?: string;
};

export type RecordActionMenuProps = {
  entityType: RecordEntity;
  record: RecordPayload;
  available?: RecordActionKey[];
  onView?: () => void;
  onEdit?: () => void;
  onCreateTask?: () => void;
  onAddNote?: () => void;
  onSendEmail?: () => void;
  onViewTimeline?: () => void;
  onDelete?: () => void;
  size?: "sm" | "icon";
};

const DEFAULTS: Record<RecordEntity, RecordActionKey[]> = {
  lead: ["view", "open", "edit", "copyEmail", "copyPhone", "createTask", "addNote", "sendEmail", "delete"],
  opportunity: [
    "open",
    "edit",
    "copyEmail",
    "copyPhone",
    "copyAddress",
    "createTask",
    "addNote",
    "sendEmail",
    "viewTimeline",
  ],
  contact: ["view", "edit", "copyEmail", "copyPhone", "createTask", "sendEmail"],
  company: ["view", "edit", "copyAddress"],
  loan: ["open", "viewTimeline"],
};

function copy(value: string | null | undefined, label: string) {
  if (!value) return;
  navigator.clipboard.writeText(value);
  toast.success(`${label} copied`);
}

export function RecordActionMenu(props: RecordActionMenuProps) {
  const navigate = useNavigate();
  const actions = props.available ?? DEFAULTS[props.entityType];
  const { record } = props;

  const has = (k: RecordActionKey) => actions.includes(k);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Row actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {has("view") && props.onView && (
          <DropdownMenuItem onClick={props.onView}>
            <Eye className="h-3.5 w-3.5 mr-2" /> View
          </DropdownMenuItem>
        )}
        {has("open") && (record.workspaceHref || record.viewHref) && (
          <DropdownMenuItem onClick={() => navigate(record.workspaceHref || record.viewHref!)}>
            <ArrowUpRightSquare className="h-3.5 w-3.5 mr-2" /> Open Workspace
          </DropdownMenuItem>
        )}
        {has("edit") && props.onEdit && (
          <DropdownMenuItem onClick={props.onEdit}>
            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
          </DropdownMenuItem>
        )}
        {has("copyEmail") && record.email && (
          <DropdownMenuItem onClick={() => copy(record.email, "Email")}>
            <Copy className="h-3.5 w-3.5 mr-2" /> Copy Email
          </DropdownMenuItem>
        )}
        {has("copyPhone") && record.phone && (
          <DropdownMenuItem onClick={() => copy(record.phone, "Phone")}>
            <Phone className="h-3.5 w-3.5 mr-2" /> Copy Phone
          </DropdownMenuItem>
        )}
        {has("copyAddress") && record.address && (
          <DropdownMenuItem onClick={() => copy(record.address, "Address")}>
            <MapPin className="h-3.5 w-3.5 mr-2" /> Copy Address
          </DropdownMenuItem>
        )}
        {(has("createTask") || has("addNote") || has("sendEmail") || has("viewTimeline")) && (
          <DropdownMenuSeparator />
        )}
        {has("createTask") && props.onCreateTask && (
          <DropdownMenuItem onClick={props.onCreateTask}>
            <Plus className="h-3.5 w-3.5 mr-2" /> Create Task
          </DropdownMenuItem>
        )}
        {has("addNote") && props.onAddNote && (
          <DropdownMenuItem onClick={props.onAddNote}>
            <StickyNote className="h-3.5 w-3.5 mr-2" /> Add Note
          </DropdownMenuItem>
        )}
        {has("sendEmail") && (props.onSendEmail || record.email) && (
          <DropdownMenuItem
            onClick={() =>
              props.onSendEmail
                ? props.onSendEmail()
                : record.email && (window.location.href = `mailto:${record.email}`)
            }
          >
            <Mail className="h-3.5 w-3.5 mr-2" /> Send Email
          </DropdownMenuItem>
        )}
        {has("viewTimeline") && (
          <DropdownMenuItem
            onClick={() =>
              props.onViewTimeline
                ? props.onViewTimeline()
                : navigate(`${record.workspaceHref || record.viewHref || "#"}?tab=timeline`)
            }
          >
            <Clock className="h-3.5 w-3.5 mr-2" /> View Timeline
          </DropdownMenuItem>
        )}
        {has("delete") && props.onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={props.onDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}