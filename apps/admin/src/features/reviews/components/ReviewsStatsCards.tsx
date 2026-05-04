import { StatCard } from "@/components/admin";

import type { AdminReviewsStats } from "../types";

type ReviewsStatsCardsProps = {
  stats: AdminReviewsStats;
};

export function ReviewsStatsCards({ stats }: ReviewsStatsCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Total Reviews" value={String(stats.totalReviews)} />
      <StatCard title="Average Rating" value={stats.averageRating.toFixed(1)} />
      <StatCard title="Hidden Reviews" value={String(stats.hiddenReviews)} />
      <StatCard title="Reported Reviews" value={String(stats.reportedReviews)} />
    </div>
  );
}
