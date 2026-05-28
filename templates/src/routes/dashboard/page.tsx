import { useQuery } from "@tanstack/react-query";
import { SectionCards } from "./_components/section-cards";
import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { RecentCustomers } from "./_components/recent-customers";
import { api } from "@/mocks/api";

export default function DashboardPage() {
  const customers = useQuery({ queryKey: ["customers"], queryFn: api.listCustomers });

  const total = customers.data?.length ?? 0;
  const active = customers.data?.filter((c) => c.status === "active").length ?? 0;
  const inactive = total - active;

  return (
    <>
      <SectionCards total={total} active={active} inactive={inactive} />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <RecentCustomers />
    </>
  );
}
