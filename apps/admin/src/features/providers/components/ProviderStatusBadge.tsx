import type { ProviderStatus } from "../types";

type ProviderStatusBadgeProps = {
  status: ProviderStatus;
};

const statusClassMap: Record<ProviderStatus, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-300",
  APPROVED: "bg-emerald-500/15 text-emerald-300",
  REJECTED: "bg-rose-500/15 text-rose-300",
  BLOCKED: "bg-red-500/20 text-red-300",
};

export function ProviderStatusBadge({ status }: ProviderStatusBadgeProps) {
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClassMap[status]}`}>{status}</span>;
}
