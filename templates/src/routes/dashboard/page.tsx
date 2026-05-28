import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { api } from "@/mocks/api";
import { t } from "@/lib/i18n";

export default function DashboardPage() {
  const customers = useQuery({ queryKey: ["customers"], queryFn: api.listCustomers });

  const stats = customers.data
    ? {
        total: customers.data.length,
        active: customers.data.filter((c) => c.status === "active").length,
        inactive: customers.data.filter((c) => c.status === "inactive").length,
      }
    : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("dashboard.title")}</h1>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("dashboard.stats.customers")} value={stats?.total} loading={customers.isLoading} />
        <StatCard label={t("dashboard.stats.active")} value={stats?.active} loading={customers.isLoading} />
        <StatCard label={t("dashboard.stats.inactive")} value={stats?.inactive} loading={customers.isLoading} />
        <StatCard label={t("dashboard.stats.last7")} value={stats ? "—" : undefined} loading={customers.isLoading} />
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.activity.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {customers.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-2/3" />
              </div>
            ) : customers.isError ? (
              <Alert variant="destructive">
                <AlertDescription className="flex items-center justify-between gap-2">
                  {t("common.loadError")}
                  <Button size="sm" variant="outline" onClick={() => customers.refetch()}>
                    {t("common.retry")}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : !customers.data?.length ? (
              <EmptyState
                icon={Activity}
                title={t("dashboard.activity.empty.title")}
                description={t("dashboard.activity.empty.description")}
              />
            ) : (
              <ul className="divide-y">
                {customers.data.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{c.name}</span>
                    <span className="text-muted-foreground">{c.createdAt}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({ label, value, loading }: { label: string; value: number | string | undefined; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-semibold">{value ?? "—"}</p>}
      </CardContent>
    </Card>
  );
}
