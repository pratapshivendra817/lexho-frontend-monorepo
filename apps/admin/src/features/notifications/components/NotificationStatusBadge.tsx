import type { AdminNotificationStatus } from "../types";

const badgeClass: Record<string, string> = {
  SENT: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  FAILED: "border-rose-500/40 bg-rose-500/15 text-rose-300",
  PENDING: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  SCHEDULED: "border-sky-500/40 bg-sky-500/15 text-sky-300",
  READ: "border-blue-500/40 bg-blue-500/15 text-blue-300",
  CLICKED: "border-violet-500/40 bg-violet-500/15 text-violet-300",
};

export function NotificationStatusBadge({ status }: { status: AdminNotificationStatus | string }) {
  const upper = status.toUpperCase();
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass[upper] ?? "border-[var(--color-border)] text-[var(--color-muted)]"}`}>
      {upper}
    </span>
  );
}
