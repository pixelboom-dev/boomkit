import type { Customer } from "@/mocks/db";

export const customers: Customer[] = [
  { id: "1", name: "Acme Inc.", status: "active", createdAt: "2026-01-12" },
  { id: "2", name: "Globex", status: "inactive", createdAt: "2026-02-03" },
  { id: "3", name: "Initech", status: "active", createdAt: "2026-02-19" },
  { id: "4", name: "Umbrella", status: "active", createdAt: "2026-03-08" },
  { id: "5", name: "Hooli", status: "inactive", createdAt: "2026-04-21" },
];
