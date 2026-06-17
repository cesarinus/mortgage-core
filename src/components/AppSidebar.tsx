import {
  LayoutDashboard, Users, Building2, Contact as ContactIcon, Kanban, TrendingUp,
  FileText, Share2, Mail, MailOpen, Settings, LogOut, ChevronDown, UserRound,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLocation } from "react-router-dom";
import { useState } from "react";

type NavItem = {
  title: string;
  url: string;
  icon: any;
  adminOnly?: boolean;
  children?: { title: string; url: string; icon: any }[];
};

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: Users },
  {
    title: "Contacts",
    url: "/contacts",
    icon: ContactIcon,
    children: [
      { title: "People", url: "/contacts/people", icon: UserRound },
      { title: "Companies", url: "/contacts/companies", icon: Building2 },
    ],
  },
  { title: "Pipeline", url: "/pipeline", icon: Kanban },
  { title: "Blog Manager", url: "/blog-admin", icon: FileText, adminOnly: true },
  { title: "Social Media", url: "/admin/social-media", icon: Share2, adminOnly: true },
  { title: "Subscribers", url: "/email/subscribers", icon: Mail, adminOnly: true },
  { title: "Email Templates", url: "/email/templates", icon: MailOpen, adminOnly: true },
  { title: "Lock vs Float", url: "/rate-decision", icon: TrendingUp },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { signOut, user, role } = useAuth();
  const visibleItems = navItems.filter((i) => !i.adminOnly || role === "admin");
  const { pathname } = useLocation();

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-4 border-b border-sidebar-border/60">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-orange-dark text-primary-foreground shadow-orange">
            <span className="font-display text-base font-bold leading-none">NG</span>
            <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/15" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-sm font-bold tracking-wide text-sidebar-accent-foreground">
              NGCAPITAL
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
              Mortgage CRM
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-[0.18em] px-4 pt-3">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                item.children ? (
                  <ContactsGroup key={item.title} item={item} pathname={pathname} />
                ) : (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/85 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-full before:bg-primary"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                )
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/60 p-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-dark text-sm font-semibold text-primary-foreground">
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-medium text-sidebar-accent-foreground">
              {user?.email}
            </span>
            <span className="truncate text-[10px] capitalize text-sidebar-foreground/60">
              {role?.replace("_", " ") ?? "Member"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            onClick={signOut}
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function ContactsGroup({ item, pathname }: { item: NavItem; pathname: string }) {
  const isInGroup = pathname.startsWith(item.url);
  const [open, setOpen] = useState(isInGroup);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{item.title}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenu className="ml-6 mt-1 border-l border-sidebar-border/60 pl-2">
            {item.children!.map((child) => (
              <SidebarMenuItem key={child.title}>
                <SidebarMenuButton asChild>
                  <NavLink
                    to={child.url}
                    className="group relative flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm text-sidebar-foreground/75 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  >
                    <child.icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{child.title}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
