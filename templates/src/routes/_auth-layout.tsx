import { Boxes } from "lucide-react";
import { Link, Navigate, Outlet } from "react-router-dom";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { useSession } from "@/hooks/use-session";
import { t } from "@/lib/i18n";

export function AuthLayout() {
  const user = useSession((s) => s.user);
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link to="/signin" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <Boxes className="size-4" />
          </div>
          {t("app.name")}
        </Link>
        <Outlet />
      </div>
    </div>
  );
}
