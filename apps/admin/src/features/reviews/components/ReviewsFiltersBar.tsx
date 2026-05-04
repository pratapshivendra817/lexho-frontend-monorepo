import type { AdminReviewStatus } from "../types";

type ReviewsFiltersBarProps = {
  search: string;
  status: AdminReviewStatus | "";
  rating: number | "";
  provider: string;
  service: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: AdminReviewStatus | "") => void;
  onRatingChange: (value: number | "") => void;
  onProviderChange: (value: string) => void;
  onServiceChange: (value: string) => void;
  onReset: () => void;
};

export function ReviewsFiltersBar({
  search,
  status,
  rating,
  provider,
  service,
  onSearchChange,
  onStatusChange,
  onRatingChange,
  onProviderChange,
  onServiceChange,
  onReset,
}: ReviewsFiltersBarProps) {
  return (
    <div className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:grid-cols-6">
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search reviews"
        className="md:col-span-2 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      />

      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value as AdminReviewStatus | "")}
        className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      >
        <option value="">All Status</option>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
        <option value="HIDDEN">Hidden</option>
      </select>

      <select
        value={rating}
        onChange={(event) => onRatingChange(event.target.value ? Number(event.target.value) : "")}
        className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      >
        <option value="">All Ratings</option>
        <option value="5">5</option>
        <option value="4">4</option>
        <option value="3">3</option>
        <option value="2">2</option>
        <option value="1">1</option>
      </select>

      <input
        value={provider}
        onChange={(event) => onProviderChange(event.target.value)}
        placeholder="Provider"
        className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      />

      <div className="flex gap-2">
        <input
          value={service}
          onChange={(event) => onServiceChange(event.target.value)}
          placeholder="Service"
          className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
        />
        <button type="button" onClick={onReset} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
          Reset
        </button>
      </div>
    </div>
  );
}
