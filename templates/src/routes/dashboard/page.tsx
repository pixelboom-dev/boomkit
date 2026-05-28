import { useQuery } from "@tanstack/react-query";
import { Activity, TrendingUp, Users, UserCheck, UserMinus } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { api } from "@/mocks/api";
import { t } from "@/lib/i18n";

const visitsChartConfig = {
  visits: {
    label: "Visits",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const statusChartConfig = {
  active: { label: t("customers.status.active"), color: "var(--chart-1)" },
  inactive: { label: t("customers.status.inactive"), color: "var(--chart-2)" },
} satisfies ChartConfig;

const visitsData = [
  { day: "Mon", visits: 186 },
  { day: "Tue", visits: 305 },
  { day: "Wed", visits: 237 },
  { day: "Thu", visits: 273 },
  { day: "Fri", visits: 209 },
  { day: "Sat", visits: 314 },
  { day: "Sun", visits: 290 },
];

export default function DashboardPage() {
  const customers = useQuery({ queryKey: ["customers"], queryFn: api.listCustomers });

  const stats = customers.data
    ? {
        total: customers.data.length,
        active: customers.data.filter((c) => c.status === "active").length,
        inactive: customers.data.filter((c) => c.status === "inactive").length,
      }
    : null;

  const statusData = stats
    ? [
        { name: "active", value: stats.active },
        { name: "inactive", value: stats.inactive },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label={t("dashboard.stats.customers")}
          value={stats?.total}
          loading={customers.isLoading}
        />
        <StatCard
          icon={UserCheck}
          label={t("dashboard.stats.active")}
          value={stats?.active}
          loading={customers.isLoading}
        />
        <StatCard
          icon={UserMinus}
          label={t("dashboard.stats.inactive")}
          value={stats?.inactive}
          loading={customers.isLoading}
        />
        <StatCard
          icon={TrendingUp}
          label={t("dashboard.stats.last7")}
          value={visitsData.reduce((acc, d) => acc + d.visits, 0)}
          loading={false}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("dashboard.chart.visits.title")}</CardTitle>
            <CardDescription>{t("dashboard.chart.visits.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={visitsChartConfig} className="h-64 w-full">
              <AreaChart data={visitsData} margin={{ left: 0, right: 0 }}>
                <defs>
                  <linearGradient id="fillVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-visits)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--color-visits)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <Area
                  dataKey="visits"
                  type="natural"
                  fill="url(#fillVisits)"
                  stroke="var(--color-visits)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.chart.status.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {customers.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ChartContainer config={statusChartConfig} className="h-64 w-full">
                <BarChart data={statusData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--color-active)" radius={6} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </section>

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
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof Users;
  label: string;
  value: number | string | undefined;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-semibold">{value ?? "—"}</p>}
      </CardContent>
    </Card>
  );
}
