import type { BannerPlacementType, BannerPlatformType, BannerPromoType, BannerStatus } from "../types";

type BannersFiltersBarProps = {
  search: string;
  status: BannerStatus | "";
  city: string;
  promoType: BannerPromoType;
  platformType: BannerPlatformType;
  placement: BannerPlacementType | "";
  onSearchChange: (value: string) => void;
  onStatusChange: (value: BannerStatus | "") => void;
  onCityChange: (value: string) => void;
  onPromoTypeChange: (value: BannerPromoType) => void;
  onPlatformTypeChange: (value: BannerPlatformType) => void;
  onPlacementChange: (value: BannerPlacementType | "") => void;
  onReset: () => void;
};

export function BannersFiltersBar({
  search,
  status,
  city,
  promoType,
  platformType,
  placement,
  onSearchChange,
  onStatusChange,
  onCityChange,
  onPromoTypeChange,
  onPlatformTypeChange,
  onPlacementChange,
  onReset,
}: BannersFiltersBarProps) {
  return (
    <div className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:grid-cols-7">
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search banners"
        className="md:col-span-2 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      />

      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value as BannerStatus | "")}
        className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      >
        <option value="">All Status</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
        <option value="DRAFT">Draft</option>
      </select>

      <input
        value={city}
        onChange={(event) => onCityChange(event.target.value)}
        placeholder="City"
        className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      />

      <select
        value={promoType}
        onChange={(event) => onPromoTypeChange(event.target.value as BannerPromoType)}
        className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      >
        <option value="">All Promo Types</option>
        <option value="PROMO">Promo</option>
        <option value="OFFER">Offer</option>
        <option value="ENGAGE">Engage</option>
      </select>

      <select
        value={placement}
        onChange={(event) => onPlacementChange(event.target.value as BannerPlacementType | "")}
        className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
      >
        <option value="">All Placements</option>
        <option value="TOP">Top Banner</option>
        <option value="BOTTOM">Bottom Banner</option>
      </select>

      <div className="flex gap-2">
        <select
          value={platformType}
          onChange={(event) => onPlatformTypeChange(event.target.value as BannerPlatformType)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
        >
          <option value="">All Platforms</option>
          <option value="WEB">Web</option>
          <option value="ANDROID">Android</option>
          <option value="IOS">iOS</option>
          <option value="ALL">All</option>
        </select>
        <button type="button" onClick={onReset} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
          Reset
        </button>
      </div>
    </div>
  );
}
