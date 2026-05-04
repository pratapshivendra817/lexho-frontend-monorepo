import { Clock3, CheckCircle2, CalendarCheck2, CircleX } from "lucide-react";

import type { BookingStats } from "../types";

type BookingStatsCardsProps = {
  stats: BookingStats;
};

export function BookingStatsCards({ stats }: BookingStatsCardsProps) {
  const cards = [
    {
      key: "pending",
      label: "Pending",
      value: stats.pending,
      icon: Clock3,
      className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    },
    {
      key: "confirmed",
      label: "Confirmed",
      value: stats.confirmed,
      icon: CheckCircle2,
      className: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    },
    {
      key: "completed",
      label: "Completed",
      value: stats.completed,
      icon: CalendarCheck2,
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    },
    {
      key: "cancelled",
      label: "Cancelled",
      value: stats.cancelled,
      icon: CircleX,
      className: "border-red-500/30 bg-red-500/10 text-red-300",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.key} className={`rounded-xl border p-4 ${card.className}`}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">{card.label}</p>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-bold">{card.value.toLocaleString("en-IN")}</p>
          </article>
        );
      })}
    </div>
  );
}
