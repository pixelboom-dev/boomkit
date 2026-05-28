import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api } from "@/mocks/api";
import type { Customer } from "@/mocks/db";
import { t } from "@/lib/i18n";

export default function CustomerDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const customer = useQuery({
    queryKey: ["customers", id],
    queryFn: () => api.getCustomer(id),
  });

  const [name, setName] = useState("");
  const [status, setStatus] = useState<Customer["status"]>("active");

  useEffect(() => {
    if (customer.data) {
      setName(customer.data.name);
      setStatus(customer.data.status);
    }
  }, [customer.data]);

  const update = useMutation({
    mutationFn: () => api.updateCustomer(id, { name, status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customers", id] });
      toast.success(t("customers.toast.updated"));
    },
    onError: () => toast.error(t("common.saveError")),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteCustomer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success(t("customers.toast.deleted"));
      navigate("/customers", { replace: true });
    },
    onError: () => toast.error(t("common.saveError")),
  });

  if (customer.isLoading) {
    return (
      <div className="max-w-xl space-y-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (customer.isError) {
    return (
      <Alert variant="destructive" className="max-w-xl">
        <AlertDescription className="flex items-center justify-between gap-2">
          {t("common.loadError")}
          <Button size="sm" variant="outline" onClick={() => customer.refetch()}>
            {t("common.retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{customer.data?.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t("customers.column.name")}</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">{t("customers.column.status")}</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as Customer["status"])}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t("customers.status.active")}</SelectItem>
              <SelectItem value="inactive">{t("customers.status.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost">{t("customers.detail.delete")}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("customers.detail.deleteConfirm.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("customers.detail.deleteConfirm.description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => remove.mutate()}>
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button onClick={() => update.mutate()} disabled={update.isPending}>
          {t("common.save")}
        </Button>
      </CardFooter>
    </Card>
  );
}
