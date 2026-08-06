import { api, extractList, parseApiError, unwrapPayload } from "./client";

export type SubscriptionDurationPrice = {
  id: number;
  serviceId: number | null;
  durationHours: number;
  perVisitPrice: number;
  active: boolean;
};

export type SubscriptionPriceQuote = {
  serviceId: number;
  durationHours: number;
  perVisitPrice: number;
  visits: number;
  totalPrice: number;
};

export type CookFamilySize = "SMALL" | "MEDIUM" | "LARGE" | "XLARGE";

export type CookSubscriptionPriceQuote = {
  serviceId: number;
  familySize: CookFamilySize | string;
  visits: number;
  pricePerVisit: number;
  totalPrice: number;
};

const COOK_FAMILY_SIZE_CODES: Record<CookFamilySize, string> = {
  SMALL: "1_2",
  MEDIUM: "3_4",
  LARGE: "5_6",
  XLARGE: "6_8",
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["true", "1", "active", "yes"].includes(value.trim().toLowerCase());
  return fallback;
}

function toDurationPrice(row: any): SubscriptionDurationPrice | null {
  const durationHours = toNumber(row?.durationHours, 0);
  const perVisitPrice = toNumber(row?.perVisitPrice, 0);
  if (durationHours <= 0) return null;
  return {
    id: toNumber(row?.id, 0),
    serviceId: row?.serviceId == null ? null : toNumber(row.serviceId, 0),
    durationHours,
    perVisitPrice,
    active: toBoolean(row?.active, true),
  };
}

function normalizeCookQuote(row: any, params: { serviceId?: number | null; familySize: CookFamilySize; visits: number }): CookSubscriptionPriceQuote {
  const pricePerVisit = toNumber(row?.pricePerVisit ?? row?.perVisitPrice, 0);
  const visits = toNumber(row?.visits, params.visits);
  return {
    serviceId: toNumber(row?.serviceId ?? params.serviceId, 0),
    familySize: String(row?.familySize ?? params.familySize),
    visits,
    pricePerVisit,
    totalPrice: toNumber(row?.totalPrice ?? row?.price, pricePerVisit > 0 ? pricePerVisit * visits : 0),
  };
}

function pickCookPricingRow(data: any, params: { serviceId?: number | null; familySize: CookFamilySize; visits: number }) {
  const rows = extractList<any>(unwrapPayload(data, []));
  const familyCode = COOK_FAMILY_SIZE_CODES[params.familySize];
  const serviceId = toNumber(params.serviceId, 0);
  const matchesFamily = (row: any) => {
    const value = String(row?.familySize ?? "").trim().toUpperCase();
    return value === params.familySize || value === familyCode.toUpperCase();
  };
  const activeRows = rows.filter((row) => toBoolean(row?.active, true) && matchesFamily(row));
  const serviceRow = serviceId > 0
    ? activeRows.find((row) => toNumber(row?.serviceId, 0) === serviceId)
    : null;
  return serviceRow ?? activeRows.find((row) => row?.serviceId == null) ?? activeRows[0] ?? null;
}

export async function getSubscriptionPricing(serviceId?: number | null): Promise<SubscriptionDurationPrice[]> {
  try {
    const params = serviceId ? { serviceId } : undefined;
    const { data } = await api.get("/api/subscription/pricing", { params });
    return extractList<any>(unwrapPayload(data, []))
      .map(toDurationPrice)
      .filter((item: SubscriptionDurationPrice | null): item is SubscriptionDurationPrice => Boolean(item))
      .filter((item) => item.active)
      .sort((first, second) => first.durationHours - second.durationHours);
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to fetch subscription pricing"));
  }
}

export async function getSubscriptionPriceQuote(params: {
  serviceId?: number | null;
  durationHours: number;
  visits: number;
}): Promise<SubscriptionPriceQuote> {
  try {
    const { data } = await api.get("/api/subscription/price-quote", {
      params: {
        serviceId: params.serviceId || undefined,
        durationHours: params.durationHours,
        visits: params.visits,
      },
    });
    const row = unwrapPayload<any>(data, {});
    return {
      serviceId: toNumber(row?.serviceId ?? params.serviceId, 0),
      durationHours: toNumber(row?.durationHours, params.durationHours),
      perVisitPrice: toNumber(row?.perVisitPrice, 0),
      visits: toNumber(row?.visits, params.visits),
      totalPrice: toNumber(row?.totalPrice, 0),
    };
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to calculate subscription price"));
  }
}

export async function getCookSubscriptionPriceQuote(params: {
  serviceId?: number | null;
  familySize: CookFamilySize;
  frequency?: string;
  visits: number;
  startDate?: string;
  endDate?: string;
}): Promise<CookSubscriptionPriceQuote> {
  let lastError: unknown = null;
  try {
    const { data } = await api.get("/api/subscription/cook-pricing", {
      params: {
        serviceId: params.serviceId || undefined,
        familySize: params.familySize,
        familySizeCode: COOK_FAMILY_SIZE_CODES[params.familySize],
      },
    });
    const directRow = Array.isArray(unwrapPayload(data, []))
      ? pickCookPricingRow(data, params)
      : unwrapPayload<any>(data, {});
    if (directRow) {
      const quote = normalizeCookQuote({ ...directRow, visits: params.visits }, params);
      if (quote.pricePerVisit > 0 || quote.totalPrice > 0) return quote;
    }
  } catch (error) {
    lastError = error;
  }

  const familyValues = [params.familySize, COOK_FAMILY_SIZE_CODES[params.familySize]];
  const endpointAttempts = [
    "/api/subscription/price-quote",
    "/api/subscription/price-quote/cook",
    "/api/subscription/cook/price-quote",
  ];

  for (const familySize of familyValues) {
    for (const endpoint of endpointAttempts) {
      for (const includeServiceId of [true, false]) {
        try {
          const { data } = await api.get(endpoint, {
            params: {
              serviceId: includeServiceId ? params.serviceId || undefined : undefined,
              familySize,
              familySizeCode: COOK_FAMILY_SIZE_CODES[params.familySize],
              frequency: params.frequency || undefined,
              visits: params.visits,
              startDate: params.startDate || undefined,
              endDate: params.endDate || undefined,
            },
          });
          const row = unwrapPayload<any>(data, {});
          const quote = normalizeCookQuote(row, params);
          if (quote.pricePerVisit > 0 || quote.totalPrice > 0) return quote;
        } catch (error) {
          lastError = error;
        }
      }
    }
  }

  throw new Error(parseApiError(lastError, "Failed to calculate cook subscription price"));
}
