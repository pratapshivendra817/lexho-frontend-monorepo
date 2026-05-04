import { StatCard } from "@/components/admin";

import type { BannersStats } from "../types";

type BannersStatsCardsProps = {
  stats: BannersStats;
};

export function BannersStatsCards({ stats }: BannersStatsCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Total" value={String(stats.total)} />
      <StatCard title="Active" value={String(stats.active)} />
      <StatCard title="Inactive" value={String(stats.inactive)} />
      <StatCard title="Draft" value={String(stats.draft)} />
    </div>
  );
}
