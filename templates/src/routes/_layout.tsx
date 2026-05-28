import { Navigate, Outlet } from "react-router-dom";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { useSession } from "@/hooks/use-session";

export function AppLayout() {
  const user = useSession((s) => s.user);
  if (!user) return <Navigate to="/signin" replace />;

  return (
    <div className="grid min-h-screen md:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r md:block">
        <Sidebar />
      </aside>
      <div className="flex min-w-0 flex-col">
        <Topbar />
        <main className="flex-1 overflow-x-hidden p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
