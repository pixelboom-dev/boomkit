import { TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { t } from "@/lib/i18n";

type StatProps = {
  label: string;
  value: string;
  trend: number;
  highlight: string;
  caption: string;
};

function StatCard({ label, value, trend, highlight, caption }: StatProps) {
  const up = trend >= 0;
  const TrendIcon = up ? TrendingUp : TrendingDown;
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            <TrendIcon className="size-3" />
            {up ? "+" : ""}{trend}%
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {highlight} <TrendIcon className="size-4" />
        </div>
        <div className="text-muted-foreground">{caption}</div>
      </CardFooter>
    </Card>
  );
}

export function SectionCards({
  total,
  active,
  inactive,
}: {
  total: number;
  active: number;
  inactive: number;
}) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <StatCard
        label={t("dashboard.stats.revenue")}
        value="$1,250.00"
        trend={12.5}
        highlight={t("dashboard.stats.revenue.highlight")}
        caption={t("dashboard.stats.revenue.caption")}
      />
      <StatCard
        label={t("dashboard.stats.customers")}
        value={String(total)}
        trend={-20}
        highlight={t("dashboard.stats.customers.highlight")}
        caption={t("dashboard.stats.customers.caption")}
      />
      <StatCard
        label={t("dashboard.stats.active")}
        value={String(active)}
        trend={12.5}
        highlight={t("dashboard.stats.active.highlight")}
        caption={t("dashboard.stats.active.caption")}
      />
      <StatCard
        label={t("dashboard.stats.churn")}
        value={`${inactive ? ((inactive / Math.max(total, 1)) * 100).toFixed(1) : "0.0"}%`}
        trend={4.5}
        highlight={t("dashboard.stats.churn.highlight")}
        caption={t("dashboard.stats.churn.caption")}
      />
    </div>
  );
}
