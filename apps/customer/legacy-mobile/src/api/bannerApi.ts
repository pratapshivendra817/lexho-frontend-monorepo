import { api, parseApiError } from "./client";

export type CategoryBannerDto = {
  id?: string | number;
  bannerId?: string | number;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  bannerImageUrl?: string;
  redirectType?: string;
  redirectValue?: string | number;
  redirectUrl?: string;
};

export async function fetchCustomerBannersByCategory(categoryId: string | number): Promise<CategoryBannerDto[]> {
  try {
    const { data } = await api.get("/api/customer/banners", {
      params: { categoryId },
    });

    if (Array.isArray(data?.data)) return data.data as CategoryBannerDto[];
    if (Array.isArray(data?.content)) return data.content as CategoryBannerDto[];
    if (Array.isArray(data?.items)) return data.items as CategoryBannerDto[];
    if (Array.isArray(data)) return data as CategoryBannerDto[];
    return [];
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to fetch banners"));
  }
}

