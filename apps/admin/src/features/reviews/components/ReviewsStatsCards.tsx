import { StatCard } from "@/components/admin";

import type { AdminReviewsStats } from "../types";

type ReviewsStatsCardsProps = {
  stats: AdminReviewsStats;
};

export function ReviewsStatsCards({ stats }: ReviewsStatsCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
      <StatCard title="Total Reviews" value={String(stats.total)} />
      <StatCard title="Average Rating" value={stats.averageRating.toFixed(1)} />
      <StatCard title="Pending" value={String(stats.pending)} />
      <StatCard title="Approved" value={String(stats.approved)} />
      <StatCard title="Rejected" value={String(stats.rejected)} />
      <StatCard title="Hidden" value={String(stats.hidden)} />
      <StatCard title="Reported" value={String(stats.reported)} />
    </div>
  );
}
