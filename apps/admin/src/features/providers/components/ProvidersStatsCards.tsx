import { StatCard } from "@/components/admin";

import type { ProviderStats } from "../types";

type ProvidersStatsCardsProps = {
  stats: ProviderStats;
};

export function ProvidersStatsCards({ stats }: ProvidersStatsCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Pending" value={String(stats.pending)} />
      <StatCard title="Approved" value={String(stats.approved)} />
      <StatCard title="Rejected" value={String(stats.rejected)} />
      <StatCard title="Blocked" value={String(stats.blocked)} />
    </div>
  );
}
