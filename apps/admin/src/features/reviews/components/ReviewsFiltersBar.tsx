import type { AdminReviewSortDir, AdminReviewStatus } from "../types";

type ReviewsFiltersBarProps = {
  search: string;
  status: AdminReviewStatus | "";
  rating: number | "";
  providerId: string;
  serviceId: string;
  sortBy: string;
  sortDir: AdminReviewSortDir;
  reported: boolean | "";
  startDate: string;
  endDate: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: AdminReviewStatus | "") => void;
  onRatingChange: (value: number | "") => void;
  onProviderIdChange: (value: string) => void;
  onServiceIdChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onSortDirChange: (value: AdminReviewSortDir) => void;
  onReportedChange: (value: boolean | "") => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onReset: () => void;
};

export function ReviewsFiltersBar({
  search,
  status,
  rating,
  providerId,
  serviceId,
  sortBy,
  sortDir,
  reported,
  startDate,
  endDate,
  onSearchChange,
  onStatusChange,
  onRatingChange,
  onProviderIdChange,
  onServiceIdChange,
  onSortByChange,
  onSortDirChange,
  onReportedChange,
  onStartDateChange,
  onEndDateChange,
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
        value={providerId}
        onChange={(event) => onProviderIdChange(event.target.value.replace(/\D/g, ""))}
        placeholder="Provider ID"
        className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      />

      <input
        value={serviceId}
        onChange={(event) => onServiceIdChange(event.target.value.replace(/\D/g, ""))}
        placeholder="Service ID"
        className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      />

      <select value={sortBy} onChange={(event) => onSortByChange(event.target.value)} className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm">
        <option value="createdAt">Sort: Created</option>
        <option value="rating">Sort: Rating</option>
        <option value="status">Sort: Status</option>
      </select>

      <select value={sortDir} onChange={(event) => onSortDirChange(event.target.value as AdminReviewSortDir)} className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm">
        <option value="desc">Newest first</option>
        <option value="asc">Oldest first</option>
      </select>

      <select
        value={reported === "" ? "" : reported ? "true" : "false"}
        onChange={(event) => {
          const value = event.target.value;
          onReportedChange(value === "" ? "" : value === "true");
        }}
        className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      >
        <option value="">All report states</option>
        <option value="true">Reported only</option>
        <option value="false">Non-reported only</option>
      </select>

      <input
        type="date"
        value={startDate}
        onChange={(event) => onStartDateChange(event.target.value)}
        className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      />

      <div className="flex gap-2 md:col-span-2">
        <input
          type="date"
          value={endDate}
          onChange={(event) => onEndDateChange(event.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
        />
        <button type="button" onClick={onReset} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
          Reset
        </button>
      </div>
    </div>
  );
}
