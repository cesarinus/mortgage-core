import {
  LayoutDashboard, Users, Contact, Kanban, Settings, LogOut, Building2, FileText, TrendingUp, Share2, Mail, MailPlus, Filter,
  ChevronRight, BookUser, Sparkles,
} from "lucide-react";
import { Fragment, useState } from "react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const navItems: { title: string; url: string; icon: any; adminOnly?: boolean }[] = [
  { title: "Ask", url: "/ask", icon: Sparkles },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Pipeline", url: "/pipeline", icon: Kanban },
  { title: "Blog Manager", url: "/blog-admin", icon: FileText, adminOnly: true },
  { title: "Social Media", url: "/admin/social-media", icon: Share2, adminOnly: true },
  { title: "Subscribers", url: "/email/subscribers", icon: Mail, adminOnly: true },
  { title: "Email Templates", url: "/email/templates", icon: MailPlus, adminOnly: true },
  { title: "Lock vs Float", url: "/rate-decision", icon: TrendingUp },
  { title: "Settings", url: "/settings", icon: Settings },
];

const contactsChildren = [
  { title: "People", url: "/contacts/people", icon: BookUser },
  { title: "Companies", url: "/contacts/companies", icon: Building2 },
];

export function AppSidebar() {
  const { signOut, user, role } = useAuth();
  const visibleItems = navItems.filter((i) => !i.adminOnly || role === "admin");
  const { pathname } = useLocation();
  const contactsActive = pathname.startsWith("/contacts");
  const [contactsOpen, setContactsOpen] = useState(contactsActive);

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">Mortgage CRM</span>
            <span className="text-xs capitalize text-sidebar-foreground/60">
              {role?.replace("_", " ") ?? "—"}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <Fragment key={item.title}>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                     <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {item.url === "/leads" && (
                <SidebarMenuItem>
                <Collapsible open={contactsOpen} onOpenChange={setContactsOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                      <Contact className="h-4 w-4" />
                      <span className="flex-1 text-left">Contacts</span>
                      <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", contactsOpen && "rotate-90")} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu className="ml-4 mt-1 border-l border-sidebar-border/60 pl-2">
                      {contactsChildren.map((child) => (
                        <SidebarMenuItem key={child.url}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={child.url}
                              className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                            >
                              <child.icon className="h-4 w-4" />
                              <span>{child.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </CollapsibleContent>
                </Collapsible>
                </SidebarMenuItem>
                )}
                </Fragment>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-xs font-medium">
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <span className="truncate text-xs text-sidebar-foreground">{user?.email}</span>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
