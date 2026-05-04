import { api, parseApiError } from "./client";
import { API_BASE_URL } from "../constants/env";

export type CustomerHomeBanner = {
  id: string;
  title?: string;
  subtitle?: string;
  imageUrl: string;
  redirectType?: string;
  redirectValue?: string | number;
  redirectUrl?: string;
  priority?: number;
  slotNumber?: number;
};

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function toAbsoluteUrl(url: string): string {
  const value = url.trim();
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  const base = String(API_BASE_URL ?? "").replace(/\/+$/, "");
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${base}${path}`;
}

function extractRows(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.payload?.content)) return data.payload.content;
  if (Array.isArray(data?.payload?.items)) return data.payload.items;
  return [];
}

type HomeBannerPlacement = "TOP" | "BOTTOM";

const matchesPlacement = (item: any, placement: HomeBannerPlacement) => {
  const slot = Number(item?.slotNumber ?? item?.slot ?? 0);
  const placementRaw = asString(item?.placement ?? item?.bannerPlacement ?? item?.section).toUpperCase();
  const isTopPlacement = placementRaw === "TOP" || placementRaw === "HOME_TOP";
  const isBottomPlacement = placementRaw === "BOTTOM" || placementRaw === "HOME_BOTTOM";
  const hasKnownPlacement = isTopPlacement || isBottomPlacement;

  if (placement === "TOP") {
    if (hasKnownPlacement) return isTopPlacement;
    return !Number.isFinite(slot) || slot <= 1;
  }
  if (hasKnownPlacement) return isBottomPlacement;
  return Number.isFinite(slot) && slot >= 2;
};

export async function getCustomerHomeBanners(placement: HomeBannerPlacement = "BOTTOM"): Promise<CustomerHomeBanner[]> {
  const mapRows = (rows: any[]) =>
    rows
      .map((item: any, index: number) => {
        const imageUrl = asString(item?.bannerImageUrl ?? item?.imageUrl ?? item?.thumbnailUrl);
        if (!imageUrl) return null;
        return {
          id: asString(item?.id ?? item?.bannerId ?? index),
          title: asString(item?.title) || undefined,
          subtitle: asString(item?.subtitle ?? item?.description) || undefined,
          imageUrl: toAbsoluteUrl(imageUrl),
          redirectType: asString(item?.redirectType) || undefined,
          redirectValue: item?.redirectValue ?? item?.redirectId ?? undefined,
          redirectUrl: asString(item?.redirectUrl) || undefined,
          priority: Number(item?.priority ?? 0),
          slotNumber: Number(item?.slotNumber ?? item?.slot ?? 0) || undefined,
        } as CustomerHomeBanner;
      })
      .filter((item): item is CustomerHomeBanner => Boolean(item))
      .slice(0, 5);

  const normalize = (rows: any[]) => {
    const placementMatched = mapRows(rows.filter((item: any) => matchesPlacement(item, placement)));
    if (placementMatched.length > 0) return placementMatched;
    // Fallback when backend omits/changes placement metadata so UI does not appear empty.
    return mapRows(rows);
  };

  try {
    // Primary endpoint for customer home banners.
    const primary = await api.get("/api/customer/home/banners", {
      params: { placement },
    });
    const primaryRows = extractRows(primary.data);
    const primaryMapped = normalize(primaryRows);
    if (primaryMapped.length > 0) return primaryMapped;
  } catch {}

  try {
    // Fallback to the same banner source used by admin `/banners` flow.
    const fallback = await api.get("/api/banners", { params: { page: 0, size: 50 } });
    const fallbackRows = extractRows(fallback.data);
    return normalize(fallbackRows);
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to load home banners"));
  }
}
