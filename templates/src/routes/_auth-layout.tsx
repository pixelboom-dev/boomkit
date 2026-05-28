import { Navigate, Outlet } from "react-router-dom";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { useSession } from "@/hooks/use-session";
import { t } from "@/lib/i18n";

export function AuthLayout() {
  const user = useSession((s) => s.user);
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <p className="text-lg font-semibold tracking-tight">{t("app.name")}</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
