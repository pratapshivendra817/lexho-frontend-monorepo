export type BannerAudience = "CUSTOMER" | "PARTNER" | "BOTH";
export type BannerRedirectType = "NONE" | "EXTERNAL";
export type BannerType = "PROMO" | "INCENTIVE" | "SEASONAL" | "INFO";

export type AdminBanner = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  redirectType: BannerRedirectType;
  redirectId?: string | null;
  priority: number;
  active: boolean;
  bannerType: BannerType;
  audience: BannerAudience;
  createdAt?: string;
};

export type BannerFormPayload = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  redirectType: BannerRedirectType;
  redirectId?: string | null;
  priority: number;
  active: boolean;
  bannerType: BannerType;
  audience: BannerAudience;
};

export type BannersListResponse = {
  content: AdminBanner[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
};

export type BannersStats = {
  customer: number;
  partner: number;
  both: number;
  active: number;
  inactive: number;
  total: number;
};

export type BannersQueryParams = {
  page?: number;
  size?: number;
  audience?: BannerAudience | "";
  search?: string;
};

export type BannerReorderPayload = {
  items: Array<{ id: string; priority: number }>;
};
