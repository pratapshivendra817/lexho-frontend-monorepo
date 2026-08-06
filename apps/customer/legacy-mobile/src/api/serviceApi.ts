import { api, parseApiError } from "./client";
import { DEV_BYPASS_API_TOKEN, DEV_LOGIN_BYPASS } from "../constants/env";
import { API_BASE_URL, DEV_IMAGE_HOST } from "../constants/env";
import { getToken } from "../utils/storage";
import { store } from "../redux/store";
import { Platform } from "react-native";
import { cacheManager } from "../services/cacheManager";

export type CustomerServiceDto = {
  id: number;
  categoryId?: string | number;
  serviceId?: number;
  name?: string;
  serviceName?: string;
  title?: string;
  description?: string;
  shortDescription?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  serviceImageUrl?: string;
  isNew?: boolean;
  rating?: number | string;
  reviewsCount?: number | string;
  totalReviews?: number | string;
  discountedPrice?: number;
  originalPrice?: number;
  price?: number;
  basePrice?: number;
  bookingMode?: string;
  bookingModes?: string[];
  supportedBookingModes?: string[];
  hourlyRate?: number | string | null;
  ratePerHour?: number | string | null;
  pricePerHour?: number | string | null;
  minHours?: number | string | null;
  minimumHours?: number | string | null;
  maxHours?: number | string | null;
  maximumHours?: number | string | null;
  hourStep?: number | string | null;
  service?: Partial<CustomerServiceDto>;
};

export type ServiceAddonDto = {
  addonId: number;
  name: string;
  shortDescription: string;
  price: number;
  required: boolean;
  quantityAllowed: boolean;
  minQuantity: number;
  maxQuantity: number;
};

export type CustomerServiceDetailsDto = {
  serviceId: number;
  serviceName: string;
  imageUrl?: string;
  price?: number;
  addons: ServiceAddonDto[];
  included: string[];
  excluded: string[];
  faqs: string[];
  instructions: string[];
};

export type CustomerCatalogQuery = {
  page?: number;
  size?: number;
  search?: string;
};

type ApiShape = { response?: { data?: { message?: unknown } }; message?: unknown };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "y", "1", "active", "required"].includes(normalized)) return true;
    if (["false", "no", "n", "0", "inactive", "disabled"].includes(normalized)) return false;
  }
  return fallback;
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (typeof row === "string") return asString(row, "");
      const rec = asRecord(row);
      return asString(rec.itemName ?? rec.name ?? rec.value, "");
    })
    .filter(Boolean);
}

function toServiceAddon(row: unknown): ServiceAddonDto | null {
  const source = asRecord(row);
  const nested = asRecord(source.addon ?? source.extra ?? source.serviceAddon);
  const addonId = asNumber(source.addonId ?? source.id ?? source.extraId ?? nested.addonId ?? nested.id, 0);
  const name = asString(source.name ?? source.addonName ?? source.title ?? nested.name ?? nested.addonName, "");
  const active = asBoolean(source.active ?? source.activeStatus ?? source.enabled ?? nested.active ?? nested.activeStatus, true);
  const unavailable = asBoolean(source.unavailable ?? nested.unavailable, false) || source.available === false || nested.available === false;
  if (!addonId || !name || !active || unavailable) return null;
  const minQuantity = Math.max(1, asNumber(source.minQuantity ?? source.minQty ?? nested.minQuantity ?? nested.minQty, 1));
  const rawMax = asNumber(source.maxQuantity ?? source.maxQty ?? nested.maxQuantity ?? nested.maxQty, minQuantity);
  return {
    addonId,
    name,
    shortDescription: asString(source.shortDescription ?? source.description ?? nested.shortDescription ?? nested.description, ""),
    price: Math.max(0, asNumber(source.price ?? source.amount ?? source.addonPrice ?? nested.price ?? nested.amount, 0)),
    required: asBoolean(source.required ?? source.isRequired ?? nested.required ?? nested.isRequired, false),
    quantityAllowed: asBoolean(source.quantityAllowed ?? source.allowQuantity ?? source.quantityEnabled ?? nested.quantityAllowed, false),
    minQuantity,
    maxQuantity: Math.max(minQuantity, rawMax),
  };
}

function normalizeError(error: unknown, fallback: string): Error {
  const e = error as ApiShape;
  const message = asString(e?.response?.data?.message, "") || asString(e?.message, "") || fallback;
  return new Error(message);
}

function toAbsoluteUrl(url?: string): string | undefined {
  if (!url) return undefined;

  const replaceLocalhostHost = (input: string) => {
    const overrideHost = DEV_IMAGE_HOST || "";
    if (/^https?:\/\/localhost/i.test(input) || /^https?:\/\/127\.0\.0\.1/i.test(input)) {
      if (overrideHost) {
        return input.replace("://localhost", `://${overrideHost}`).replace("://127.0.0.1", `://${overrideHost}`);
      }
      if (Platform.OS === "android") {
        return input.replace("://localhost", "://10.0.2.2").replace("://127.0.0.1", "://10.0.2.2");
      }
    }
    return input;
  };

  const normalized = String(url).trim();
  if (!normalized) return undefined;
  if (/^https?:\/\//i.test(normalized)) return replaceLocalhostHost(normalized);
  const base = replaceLocalhostHost(API_BASE_URL).replace(/\/+$/, "");
  const path = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return `${base}${path}`;
}

function mapServiceImages<T extends CustomerServiceDto>(rows: T[]): T[] {
  return rows.map((row) => {
    const normalizedPrice = asNumber((row as any)?.price ?? (row as any)?.basePrice ?? (row as any)?.service?.price, 0);
    const normalizedDiscountedPrice = asNumber(
      (row as any)?.discountedPrice ?? (row as any)?.finalPrice ?? (row as any)?.service?.discountedPrice,
      0,
    );
    const normalizedOriginalPrice = asNumber(
      (row as any)?.originalPrice ?? (row as any)?.mrp ?? (row as any)?.basePrice ?? (row as any)?.service?.basePrice,
      0,
    );
    const normalizedImage =
      toAbsoluteUrl(asString((row as any)?.imageUrl, "")) ??
      toAbsoluteUrl(asString((row as any)?.thumbnailUrl, "")) ??
      toAbsoluteUrl(asString((row as any)?.serviceImageUrl, "")) ??
      toAbsoluteUrl(asString((row as any)?.iconUrl, ""));
    const normalizedThumb =
      toAbsoluteUrl(asString((row as any)?.thumbnailUrl, "")) ??
      toAbsoluteUrl(asString((row as any)?.imageUrl, ""));
    return {
      ...row,
      price: normalizedPrice > 0 ? normalizedPrice : row.price,
      basePrice: asNumber((row as any)?.basePrice, 0) > 0 ? asNumber((row as any)?.basePrice, 0) : row.basePrice,
      discountedPrice: normalizedDiscountedPrice > 0 ? normalizedDiscountedPrice : row.discountedPrice,
      originalPrice: normalizedOriginalPrice > 0 ? normalizedOriginalPrice : row.originalPrice,
      imageUrl: normalizedImage ?? row.imageUrl,
      thumbnailUrl: normalizedThumb ?? row.thumbnailUrl,
    };
  });
}

function getGeoParams() {
  const state = store.getState() as any;
  const location = state?.location ?? {};
  const current = location?.currentAddress ?? {};
  const selected = location?.selectedAddress ?? {};
  const latitude = Number(selected?.latitude ?? selected?.lat ?? current?.latitude ?? current?.lat ?? 0);
  const longitude = Number(selected?.longitude ?? selected?.lng ?? current?.longitude ?? current?.lng ?? 0);
  const pincode = String(selected?.pincode ?? current?.pincode ?? "").trim();
  return {
    ...(Number.isFinite(latitude) && latitude !== 0 ? { latitude } : {}),
    ...(Number.isFinite(longitude) && longitude !== 0 ? { longitude } : {}),
    ...(pincode ? { pincode } : {}),
  };
}

export async function fetchCustomerServicesByCategory(params: {
  categoryId: string | number;
  page?: number;
  size?: number;
}): Promise<CustomerServiceDto[]> {
  const { categoryId, page = 0, size = 20 } = params;
  const cacheKey = `service-providers-${String(categoryId)}-${page}-${size}`;

  const extractList = (data: any): CustomerServiceDto[] => {
    if (Array.isArray(data?.data)) return mapServiceImages(data.data as CustomerServiceDto[]);
    if (Array.isArray(data?.content)) return mapServiceImages(data.content as CustomerServiceDto[]);
    if (Array.isArray(data?.items)) return mapServiceImages(data.items as CustomerServiceDto[]);
    if (Array.isArray(data)) return mapServiceImages(data as CustomerServiceDto[]);
    return [];
  };

  const authHeaders = async () => {
    if (DEV_LOGIN_BYPASS && __DEV__) {
      return DEV_BYPASS_API_TOKEN ? { Authorization: `Bearer ${DEV_BYPASS_API_TOKEN}` } : {};
    }
    const storageToken = await getToken();
    const stateToken = store.getState()?.auth?.token ?? null;
    const token = storageToken || stateToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const tryFetch = async (path: string, includeHeaders: boolean) => {
    const headers = includeHeaders ? await authHeaders() : undefined;
    const { data } = await api.get(path, {
      headers,
      params: { categoryId, page, size, ...getGeoParams() },
    });
    return extractList(data);
  };

  try {
    const withAuth = await tryFetch("/api/customer/services", true);
    if (withAuth.length > 0) {
      await cacheManager.set(cacheKey, withAuth);
      return withAuth;
    }
  } catch (error: any) {
    const status = error?.response?.status;
    const message = String(error?.response?.data?.message ?? error?.message ?? "").toLowerCase();
    const unauthorized = status === 401 || status === 403 || message.includes("authorization token is required");

    if (!unauthorized) {
      throw normalizeError(error, parseApiError(error, "Failed to fetch services"));
    }
  }

  try {
    const publicServices = await tryFetch("/api/services", false);
    if (publicServices.length > 0) {
      await cacheManager.set(cacheKey, publicServices);
      return publicServices;
    }
  } catch {
    // Ignore and try category specific fallback endpoint.
  }

  try {
    const { data } = await api.get(`/api/services/category/${categoryId}`, {
      params: { page, size },
    });
    const byCategoryPath = extractList(data);
    if (byCategoryPath.length > 0) {
      await cacheManager.set(cacheKey, byCategoryPath);
      return byCategoryPath;
    }
  } catch {
    // Ignore and return empty list below.
  }

  const cached = await cacheManager.get<CustomerServiceDto[]>(cacheKey, 30 * 60 * 1000);
  if (cached) {
    return cached;
  }
  return [];
}

export async function fetchServiceDetails(serviceId: string | number): Promise<CustomerServiceDetailsDto> {
  const targetServiceId = asNumber(serviceId, 0);

  const mapDetailsPayload = (payload: unknown): CustomerServiceDetailsDto => {
    const root = asRecord(payload);
    const wrapped = root?.data && typeof root.data === "object" ? asRecord(root.data) : root;
    const included = toStringList(wrapped.included ?? wrapped.includedItems);
    const excluded = toStringList(wrapped.excluded ?? wrapped.excludedItems);
    const detailRows = asArray(wrapped.details);
    const faqList = toStringList(wrapped.faqs ?? wrapped.faq ?? wrapped.faqItems);
    const instructionList = toStringList(wrapped.instructions ?? wrapped.instruction ?? wrapped.instructionItems);
    const addons = asArray(wrapped.addons ?? wrapped.recommendedAddons ?? wrapped.serviceAddons ?? wrapped.extras)
      .map(toServiceAddon)
      .filter((item): item is ServiceAddonDto => Boolean(item));

    const detailsIncluded = detailRows
      .filter((row) => asString(asRecord(row).type, "").toUpperCase() === "INCLUDED")
      .map((row) => asString(asRecord(row).itemName ?? asRecord(row).name ?? asRecord(row).value, ""))
      .filter(Boolean);

    const detailsExcluded = detailRows
      .filter((row) => asString(asRecord(row).type, "").toUpperCase() === "EXCLUDED")
      .map((row) => asString(asRecord(row).itemName ?? asRecord(row).name ?? asRecord(row).value, ""))
      .filter(Boolean);

    const detailsFaqs = detailRows
      .filter((row) => asString(asRecord(row).type, "").toUpperCase() === "FAQ")
      .map((row) => asString(asRecord(row).itemName ?? asRecord(row).name ?? asRecord(row).value, ""))
      .filter(Boolean);

    const detailsInstructions = detailRows
      .filter((row) => {
        const t = asString(asRecord(row).type, "").toUpperCase();
        return t === "INSTRUCTION" || t === "INSTRUCTIONS";
      })
      .map((row) => asString(asRecord(row).itemName ?? asRecord(row).name ?? asRecord(row).value, ""))
      .filter(Boolean);

    return {
      serviceId: asNumber(
        wrapped.serviceId ?? wrapped.id ?? wrapped.serviceID ?? asRecord(wrapped.service).id,
        targetServiceId,
      ),
      serviceName: asString(wrapped.serviceName ?? wrapped.name, "Service Details"),
      price: asNumber(
        wrapped.discountedPrice ??
          wrapped.price ??
          wrapped.basePrice ??
          wrapped.amount ??
          asRecord(wrapped.service).price ??
          asRecord(wrapped.service).basePrice,
        0,
      ),
      imageUrl:
        toAbsoluteUrl(
          asString(
            wrapped.imageUrl ??
              wrapped.thumbnailUrl ??
              wrapped.serviceImageUrl ??
              wrapped.bannerImageUrl ??
              wrapped.coverImageUrl ??
              asRecord(wrapped.service).imageUrl ??
              asRecord(wrapped.service).thumbnailUrl ??
              asRecord(wrapped.service).serviceImageUrl,
            "",
          ),
        ) ?? undefined,
      included: included.length > 0 ? included : detailsIncluded,
      excluded: excluded.length > 0 ? excluded : detailsExcluded,
      faqs: faqList.length > 0 ? faqList : detailsFaqs,
      instructions: instructionList.length > 0 ? instructionList : detailsInstructions,
      addons,
    };
  };

  try {
    const attempts = [
      `/api/customer/services/${serviceId}`,
      `/api/services/${serviceId}`,
      `/api/customer/services/catalog?page=0&size=100`,
      `/api/customer/services/${serviceId}/details`,
      `/api/services/${serviceId}/details`,
    ];

    for (const path of attempts) {
      try {
        const { data } = await api.get(path);
        if (path.includes("/catalog")) {
          const root = asRecord(data);
          const rows = asArray(root.data).length
            ? asArray(root.data)
            : asArray(root.content).length
              ? asArray(root.content)
              : asArray(root.items).length
                ? asArray(root.items)
                : asArray(root.results);
          const list = rows.map((row) => asRecord(row));
          const matched = list.find((row) =>
            asNumber(row.id ?? row.serviceId ?? row.serviceID ?? asRecord(row.service).id, 0) === targetServiceId,
          );
          if (matched) return mapDetailsPayload(matched);
          continue;
        }
        const mapped = mapDetailsPayload(data);
        if (mapped.serviceId > 0) {
          return mapped;
        }
      } catch {
        // Try next fallback endpoint.
      }
    }

    throw new Error("Service details not found");
  } catch (error) {
    throw normalizeError(error, parseApiError(error, "Failed to fetch service details"));
  }
}

export async function fetchCustomerServicesCatalog(query: CustomerCatalogQuery = {}): Promise<CustomerServiceDto[]> {
  const page = Number.isFinite(Number(query.page)) ? Number(query.page) : 0;
  const size = Number.isFinite(Number(query.size)) ? Number(query.size) : 20;
  const search = asString(query.search, "");

  const extractList = (data: any): CustomerServiceDto[] => {
    if (Array.isArray(data?.data)) return mapServiceImages(data.data as CustomerServiceDto[]);
    if (Array.isArray(data?.content)) return mapServiceImages(data.content as CustomerServiceDto[]);
    if (Array.isArray(data?.items)) return mapServiceImages(data.items as CustomerServiceDto[]);
    if (Array.isArray(data)) return mapServiceImages(data as CustomerServiceDto[]);
    return [];
  };

  try {
    const { data } = await api.get("/api/customer/services/catalog", {
      params: { page, size, search: search || undefined, ...getGeoParams() },
    });
    return extractList(data);
  } catch (error) {
    throw normalizeError(error, parseApiError(error, "Failed to search services"));
  }
}
