import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { api } from "@/mocks/api";
import { t } from "@/lib/i18n";

export function RecentCustomers() {
  const navigate = useNavigate();
  const customers = useQuery({ queryKey: ["customers"], queryFn: api.listCustomers });

  return (
    <Card className="@container/card mx-4 lg:mx-6">
      <CardHeader>
        <CardTitle>{t("dashboard.recent.title")}</CardTitle>
        <CardDescription>{t("dashboard.recent.description")}</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={() => navigate("/customers")}>
            {t("dashboard.recent.viewAll")}
          </Button>
        </CardAction>
      </CardHeader>
      <div className="px-6 pb-6">
        {customers.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
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
            icon={Users}
            title={t("customers.empty.title")}
            action={{
              label: t("customers.empty.cta"),
              onClick: () => navigate("/customers/new"),
            }}
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("customers.column.name")}</TableHead>
                  <TableHead>{t("customers.column.status")}</TableHead>
                  <TableHead className="text-right">{t("customers.column.createdAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.data.slice(0, 5).map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/customers/${c.id}`)}
                  >
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "default" : "secondary"}>
                        {t(`customers.status.${c.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{c.createdAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Card>
  );
}
