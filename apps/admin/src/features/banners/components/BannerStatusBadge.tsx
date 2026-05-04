import type { BannerStatus } from "../types";

type BannerStatusBadgeProps = {
  status: BannerStatus;
};

const statusClassMap: Record<BannerStatus, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-300",
  INACTIVE: "bg-zinc-500/20 text-zinc-300",
  DRAFT: "bg-amber-500/15 text-amber-300",
};

export function BannerStatusBadge({ status }: BannerStatusBadgeProps) {
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClassMap[status]}`}>{status}</span>;
}
