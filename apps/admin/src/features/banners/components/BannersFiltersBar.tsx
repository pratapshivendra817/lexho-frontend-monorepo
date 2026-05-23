import type { BannerAudience } from "../types";

type BannersFiltersBarProps = {
  search: string;
  audience: BannerAudience | "";
  onSearchChange: (value: string) => void;
  onAudienceChange: (value: BannerAudience | "") => void;
  onReset: () => void;
};

export function BannersFiltersBar({
  search,
  audience,
  onSearchChange,
  onAudienceChange,
  onReset,
}: BannersFiltersBarProps) {
  const chips: Array<{ label: string; value: BannerAudience | "" }> = [
    { label: "All", value: "" },
    { label: "Customer", value: "CUSTOMER" },
    { label: "Partner", value: "PARTNER" },
    { label: "Both", value: "BOTH" },
  ];

  return (
    <div className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:grid-cols-4">
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search banners"
        className="md:col-span-2 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      />

      <select
        value={audience}
        onChange={(event) => onAudienceChange(event.target.value as BannerAudience | "")}
        className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      >
        <option value="">All Audience</option>
        <option value="CUSTOMER">CUSTOMER</option>
        <option value="PARTNER">PARTNER</option>
        <option value="BOTH">BOTH</option>
      </select>

      <button type="button" onClick={onReset} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
        Reset
      </button>

      <div className="md:col-span-4 flex flex-wrap gap-2">
        {chips.map((chip) => {
          const active = chip.value === audience;
          return (
            <button
              key={chip.label}
              type="button"
              onClick={() => onAudienceChange(chip.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                active
                  ? "bg-blue-600 text-white"
                  : "border border-[var(--color-border)] text-[var(--color-muted)]"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
