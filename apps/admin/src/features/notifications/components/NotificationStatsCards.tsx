import type { AdminNotificationStats } from "../types";

type NotificationStatsCardsProps = {
  stats: AdminNotificationStats;
};

export function NotificationStatsCards({ stats }: NotificationStatsCardsProps) {
  const cards = [
    { label: "Total Sent", value: stats.totalSent, tone: "text-emerald-300" },
    { label: "Total Failed", value: stats.totalFailed, tone: "text-rose-300" },
    { label: "Total Read", value: stats.totalRead, tone: "text-sky-300" },
    { label: "Total Pending", value: stats.totalPending, tone: "text-amber-300" },
    { label: "Total Clicked", value: stats.totalClicked, tone: "text-violet-300" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
        >
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{card.label}</p>
          <p className={`mt-2 text-2xl font-semibold ${card.tone}`}>{card.value}</p>
        </article>
      ))}
    </div>
  );
}
