import type { BookingStatus } from "../types";

type BookingStatusBadgeProps = {
  status: BookingStatus;
};

const statusClasses: Record<BookingStatus, string> = {
  PENDING: "bg-amber-500/20 text-amber-300",
  CONFIRMED: "bg-blue-500/20 text-blue-300",
  COMPLETED: "bg-emerald-500/20 text-emerald-300",
  CANCELLED: "bg-red-500/20 text-red-300",
};

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClasses[status]}`}>{status}</span>;
}
