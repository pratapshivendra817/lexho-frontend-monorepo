import { StatusBadge } from "./StatusBadge";

export type TimelineItem = {
  id: string;
  title: string;
  status: string;
  at?: string;
  description?: string;
};

export function TransactionTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--color-muted)]">No transaction history found.</p>;
  }

  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="grid gap-3 rounded border border-[var(--color-border)] p-3 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="font-medium text-[var(--color-text)]">{item.title}</p>
            <p className="text-xs text-[var(--color-muted)]">
              {item.at ? new Date(item.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Time unavailable"}
            </p>
            {item.description ? <p className="mt-1 text-sm text-[var(--color-muted)]">{item.description}</p> : null}
          </div>
          <StatusBadge status={item.status} />
        </li>
      ))}
    </ol>
  );
}
