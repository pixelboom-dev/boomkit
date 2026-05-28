import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void } | ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center">
      {Icon ? <Icon className="size-8 text-muted-foreground" /> : null}
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action && typeof action === "object" && "label" in (action as object) ? (
        <Button onClick={(action as { onClick: () => void }).onClick}>
          {(action as { label: string }).label}
        </Button>
      ) : (
        action
      )}
    </div>
  );
}
