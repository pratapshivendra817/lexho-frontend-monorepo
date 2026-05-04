import type { ProviderServiceType, ProviderStatus } from "../types";

type ProvidersFiltersBarProps = {
  search: string;
  status: ProviderStatus | "";
  serviceType: ProviderServiceType;
  city: string;
  sortBy: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ProviderStatus | "") => void;
  onServiceTypeChange: (value: ProviderServiceType) => void;
  onCityChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onReset: () => void;
};

export function ProvidersFiltersBar({
  search,
  status,
  serviceType,
  city,
  sortBy,
  onSearchChange,
  onStatusChange,
  onServiceTypeChange,
  onCityChange,
  onSortByChange,
  onReset,
}: ProvidersFiltersBarProps) {
  return (
    <div className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:grid-cols-6">
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search by name/phone"
        className="md:col-span-2 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      />

      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value as ProviderStatus | "")}
        className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      >
        <option value="">All Status</option>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
        <option value="BLOCKED">Blocked</option>
      </select>

      <select
        value={serviceType}
        onChange={(event) => onServiceTypeChange(event.target.value as ProviderServiceType)}
        className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      >
        <option value="">All Services</option>
        <option value="COOK">Cook</option>
        <option value="CLEANING">Cleaning</option>
      </select>

      <input
        value={city}
        onChange={(event) => onCityChange(event.target.value)}
        placeholder="City"
        className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      />

      <select
        value={sortBy}
        onChange={(event) => onSortByChange(event.target.value)}
        className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      >
        <option value="createdAt">Applied Date</option>
        <option value="name">Name</option>
        <option value="city">City</option>
      </select>

      <button type="button" onClick={onReset} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
        Reset
      </button>
    </div>
  );
}
