import { useLocation } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "./theme-toggle";
import { t } from "@/lib/i18n";

const ROUTE_TITLES: Record<string, string> = {
  "/": t("nav.dashboard"),
  "/customers": t("nav.customers"),
  "/customers/new": t("customers.new.title"),
  "/settings": t("nav.settings"),
};

function titleFor(pathname: string) {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  if (pathname.startsWith("/customers/")) return t("nav.customers");
  return t("app.name");
}

export function SiteHeader() {
  const location = useLocation();
  return (
    <header className="group-has-[data-collapsible=icon]/sidebar-wrapper:h-(--header-height) flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <h1 className="text-base font-medium">{titleFor(location.pathname)}</h1>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
