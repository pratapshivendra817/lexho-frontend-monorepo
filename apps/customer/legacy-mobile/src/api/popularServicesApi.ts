import { api, parseApiError } from "./client";

export type PopularServiceDto = {
  id?: number | string;
  serviceId?: number | string;
  name?: string;
  serviceName?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  rating?: number | string;
  price?: number | string;
  discountedPrice?: number | string;
  categoryId?: number | string;
};

export type PopularServiceCategory = "cook" | "cleaning";

function extractRows(payload: any): PopularServiceDto[] {
  if (Array.isArray(payload)) return payload as PopularServiceDto[];
  if (Array.isArray(payload?.data)) return payload.data as PopularServiceDto[];
  if (Array.isArray(payload?.content)) return payload.content as PopularServiceDto[];
  if (Array.isArray(payload?.items)) return payload.items as PopularServiceDto[];
  return [];
}

export async function getPopularServicesByCategory(category: PopularServiceCategory): Promise<PopularServiceDto[]> {
  try {
    const { data } = await api.get(`/api/customer/services/popular/${category}`);
    const rows = extractRows(data);
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[popularServicesApi:${category}]`, {
        endpoint: `/api/customer/services/popular/${category}`,
        count: rows.length,
        topLevelKeys: data && typeof data === "object" ? Object.keys(data) : [],
      });
    }
    return rows;
  } catch (error) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[popularServicesApi:${category}:error]`, parseApiError(error, `Failed to fetch popular ${category} services`));
    }
    throw new Error(parseApiError(error, `Failed to fetch popular ${category} services`));
  }
}

export async function getPopularCookServices(): Promise<PopularServiceDto[]> {
  return getPopularServicesByCategory("cook");
}

export async function getPopularCleaningServices(): Promise<PopularServiceDto[]> {
  return getPopularServicesByCategory("cleaning");
}
