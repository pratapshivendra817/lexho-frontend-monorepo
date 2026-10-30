const STATUS_CLASS: Record<string, string> = {
  UP: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  DEGRADED: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  DOWN: "border-red-400/40 bg-red-500/10 text-red-200",
  WARNING: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  PENDING: "border-yellow-400/40 bg-yellow-500/10 text-yellow-200",
  PENDING_ADMIN_REVIEW: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  UNDER_REVIEW: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  PENDING_PARTNER_ASSIGNMENT: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  PENDING_PARTNER_ACCEPTANCE: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  CONFIRMED: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  CREATED: "border-sky-400/40 bg-sky-500/10 text-sky-200",
  SUCCESS: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  PAID: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  APPROVED: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  COMPLETED: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  PAUSED: "border-violet-400/40 bg-violet-500/10 text-violet-200",
  FAILED: "border-red-400/40 bg-red-500/10 text-red-200",
  REJECTED: "border-red-400/40 bg-red-500/10 text-red-200",
  REFUNDED: "border-violet-400/40 bg-violet-500/10 text-violet-200",
};

export function StatusBadge({ status }: { status?: string }) {
  const value = String(status || "UNKNOWN").toUpperCase();
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${STATUS_CLASS[value] ?? "border-slate-400/40 bg-slate-500/10 text-slate-200"}`}>
      {value}
    </span>
  );
}
