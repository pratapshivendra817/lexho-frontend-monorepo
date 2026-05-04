import type { AdminReviewStatus } from "../types";

type ReviewStatusBadgeProps = {
  status: AdminReviewStatus;
};

const statusClassMap: Record<AdminReviewStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-300",
  APPROVED: "bg-emerald-500/15 text-emerald-300",
  REJECTED: "bg-rose-500/15 text-rose-300",
  HIDDEN: "bg-zinc-500/20 text-zinc-300",
};

export function ReviewStatusBadge({ status }: ReviewStatusBadgeProps) {
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClassMap[status]}`}>{status}</span>;
}
