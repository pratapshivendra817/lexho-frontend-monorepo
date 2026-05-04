export type BannerStatus = "ACTIVE" | "INACTIVE" | "DRAFT";
export type BannerPromoType = "PROMO" | "OFFER" | "ENGAGE" | "";
export type BannerPlatformType = "WEB" | "ANDROID" | "IOS" | "ALL" | "";
export type BannerPlacementType = "TOP" | "BOTTOM";

export type AdminBanner = {
  id: string;
  title: string;
  description?: string;
  city?: string;
  promoType: BannerPromoType;
  platformType: BannerPlatformType;
  placement: BannerPlacementType;
  status: BannerStatus;
  bannerImageUrl?: string;
  startDate?: string;
  endDate?: string;
  slotNumber?: number;
  priority?: number;
  createdAt?: string;
};

export type BannerFormPayload = {
  title: string;
  description?: string;
  city?: string;
  promoType: Exclude<BannerPromoType, "">;
  platformType: Exclude<BannerPlatformType, "">;
  placement: BannerPlacementType;
  bannerImageUrl?: string;
  status: BannerStatus;
  slotNumber: number;
  priority: number;
  startDate?: string;
  endDate?: string;
};

export type BannersListResponse = {
  content: AdminBanner[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
};

export type BannersStats = {
  active: number;
  inactive: number;
  draft: number;
  total: number;
};

export type BannersQueryParams = {
  page: number;
  size: number;
  status?: BannerStatus | "";
  city?: string;
  promoType?: BannerPromoType;
  platformType?: BannerPlatformType;
  placement?: BannerPlacementType | "";
  search?: string;
};
