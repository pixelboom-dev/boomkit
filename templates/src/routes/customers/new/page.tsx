import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { api } from "@/mocks/api";
import type { Customer } from "@/mocks/db";
import { t } from "@/lib/i18n";

export default function CustomerNewPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Customer["status"]>("active");

  const create = useMutation({
    mutationFn: api.createCustomer,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success(t("customers.toast.created"));
      navigate(`/customers/${created.id}`, { replace: true });
    },
    onError: () => toast.error(t("common.saveError")),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate({ name, status });
  }

  return (
    <Card className="max-w-xl">
      <form onSubmit={onSubmit}>
        <CardHeader>
          <CardTitle>{t("customers.new.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("customers.column.name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">{t("customers.column.status")}</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as Customer["status"])}
            >
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
        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate("/customers")}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {t("common.save")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
