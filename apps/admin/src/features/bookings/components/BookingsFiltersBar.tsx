import { Download, Search, SlidersHorizontal } from "lucide-react";

import type { BookingStatus, ServiceType, SortDirection } from "../types";

type BookingsFiltersBarProps = {
  search: string;
  status: BookingStatus | "";
  serviceType: ServiceType | "";
  startDate: string;
  endDate: string;
  sortBy: string;
  sortDir: SortDirection;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: BookingStatus | "") => void;
  onServiceTypeChange: (value: ServiceType | "") => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onSortDirChange: (value: SortDirection) => void;
  onExport: () => void;
  onReset: () => void;
};

export function BookingsFiltersBar({
  search,
  status,
  serviceType,
  startDate,
  endDate,
  sortBy,
  sortDir,
  onSearchChange,
  onStatusChange,
  onServiceTypeChange,
  onStartDateChange,
  onEndDateChange,
  onSortByChange,
  onSortDirChange,
  onExport,
  onReset,
}: BookingsFiltersBarProps) {
  return (
    <section className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:grid-cols-12">
      <label className="col-span-12 flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm md:col-span-3">
        <Search size={16} className="text-[var(--color-muted)]" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search booking/customer"
          className="w-full bg-transparent outline-none"
        />
      </label>

      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value as BookingStatus | "")}
        className="col-span-6 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm md:col-span-2"
      >
        <option value="">All status</option>
        <option value="PENDING">Pending</option>
        <option value="CONFIRMED">Confirmed</option>
        <option value="COMPLETED">Completed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>

      <select
        value={serviceType}
        onChange={(event) => onServiceTypeChange(event.target.value as ServiceType | "")}
        className="col-span-6 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm md:col-span-2"
      >
        <option value="">All services</option>
        <option value="COOK">Cook</option>
        <option value="CLEANING">Cleaning</option>
      </select>

      <input
        type="date"
        value={startDate}
        onChange={(event) => onStartDateChange(event.target.value)}
        className="col-span-6 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm md:col-span-2"
      />

      <input
        type="date"
        value={endDate}
        onChange={(event) => onEndDateChange(event.target.value)}
        className="col-span-6 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm md:col-span-2"
      />

      <select
        value={sortBy}
        onChange={(event) => onSortByChange(event.target.value)}
        className="col-span-6 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm md:col-span-2"
      >
        <option value="createdAt">Sort by Created</option>
        <option value="bookingDate">Sort by Booking Date</option>
        <option value="amount">Sort by Amount</option>
      </select>

      <select
        value={sortDir}
        onChange={(event) => onSortDirChange(event.target.value as SortDirection)}
        className="col-span-6 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm md:col-span-2"
      >
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
      </select>

      <button
        type="button"
        onClick={onReset}
        className="col-span-6 inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm md:col-span-2"
      >
        <SlidersHorizontal size={16} /> Reset
      </button>

      <button
        type="button"
        onClick={onExport}
        className="col-span-6 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white md:col-span-2"
      >
        <Download size={16} /> Export CSV
      </button>
    </section>
  );
}
