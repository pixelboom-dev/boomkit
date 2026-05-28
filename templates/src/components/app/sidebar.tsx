import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const items = [
  { to: "/", label: t("nav.dashboard"), icon: LayoutDashboard, end: true },
  { to: "/customers", label: t("nav.customers"), icon: Users },
  { to: "/settings", label: t("nav.settings"), icon: Settings },
];

export function Sidebar() {
  return (
    <nav className="flex flex-col gap-1 p-3">
      <div className="px-2 py-3 text-sm font-semibold tracking-tight">
        {t("app.name")}
      </div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )
          }
        >
          <item.icon className="size-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
