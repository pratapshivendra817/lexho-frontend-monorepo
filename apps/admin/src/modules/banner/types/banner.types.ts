export type BannerRedirectType = "CATEGORY" | "SERVICE" | "EXTERNAL";

export type BannerStatus = "ACTIVE" | "INACTIVE";

export type BannerItem = {
  id: string;
  title: string;
  categoryId: string | null;
  categoryName: string;
  imageUrl: string;
  redirectType: BannerRedirectType;
  redirectValue: string;
  status: BannerStatus;
  priority: number;
  active: boolean;
};

export type BannerListParams = {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  active?: boolean;
};

export type BannerListResponse = {
  items: BannerItem[];
  total: number;
};

export type BannerCategoryOption = {
  id: string;
  name: string;
};

export type BannerServiceOption = {
  id: string;
  name: string;
};

export type BannerFormValues = {
  title: string;
  categoryId: string;
  imageUrl: string;
  redirectType: BannerRedirectType;
  redirectValue: string;
  priority: number;
  active: boolean;
};
