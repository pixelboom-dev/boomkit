import type { ComponentProps } from "react";
import { NavLink } from "react-router-dom";
import {
  Boxes,
  HelpCircle,
  LayoutDashboard,
  Search,
  Settings,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavMain, type NavItem } from "./nav-main";
import { NavSecondary, type NavSecondaryItem } from "./nav-secondary";
import { NavUser } from "./nav-user";
import { t } from "@/lib/i18n";

const navMain: NavItem[] = [
  { title: t("nav.dashboard"), to: "/", icon: LayoutDashboard, end: true },
  { title: t("nav.customers"), to: "/customers", icon: Users },
];

const navSecondary: NavSecondaryItem[] = [
  { title: t("nav.settings"), to: "/settings", icon: Settings },
  { title: t("nav.help"), to: "/settings", icon: HelpCircle },
  { title: t("nav.search"), to: "/settings", icon: Search },
];

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <NavLink to="/">
                <Boxes className="!size-5" />
                <span className="text-base font-semibold">{t("app.name")}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
