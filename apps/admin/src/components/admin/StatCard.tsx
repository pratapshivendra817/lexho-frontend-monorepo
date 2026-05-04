type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
};

export function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-[var(--color-muted)]">{subtitle}</p> : null}
    </div>
  );
}
