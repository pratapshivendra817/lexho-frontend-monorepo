export type DocumentPayload = {
  title?: string;
  content?: string;
  body?: string;
  markdown?: string;
  updatedAt?: string;
  publishedAt?: string;
};

export type Faq = { category: string; question: string; answer: string };
export type SocialMediaLink = { platform: string; url: string; label: string; icon?: string; displayOrder: number };
export type WebsiteCategory = { id: number; name: string; slug: string };
export type WebsiteService = { id: number; name: string; slug: string };
export type WebsiteCity = { id: number; name: string; slug: string };
export type WebsiteArea = { id: number; name: string; slug: string };
export type WebsiteServiceDetail = {
  serviceId: number;
  serviceSlug: string;
  serviceName: string;
  description: string;
  price?: number;
  bookingMode?: string;
  imageUrl?: string;
  included: string[];
  excluded: string[];
  faqs: string[];
  instructions: string[];
};

const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "";
const responseCache = new Map<string, Promise<unknown>>();

function apiUrl(path: string) {
  const normalizedPath = `/${path.replace(/^\/+/, "")}`;
  return `${baseUrl.replace(/\/+$/, "")}${normalizedPath}`;
}

export function __resetApiCacheForTests() {
  responseCache.clear();
}

function unwrap(value: unknown): Record<string, unknown> {
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

function asBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "active", "enabled", "visible"].includes(normalized)) return true;
    if (["false", "0", "no", "inactive", "disabled", "hidden"].includes(normalized)) return false;
  }
  return fallback;
}

function slugToName(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toStringList(value: unknown) {
  return asArray(value)
    .map((row) => {
      if (typeof row === "string") return asString(row, "");
      const item = unwrap(row);
      return asString(item.itemName ?? item.name ?? item.value ?? item.question ?? item.answer, "");
    })
    .filter(Boolean);
}

function isWebsiteVisible(item: Record<string, unknown>) {
  return (
    asBoolean(item.active ?? item.isActive ?? item.status ?? item.enabled, true) &&
    asBoolean(item.websiteVisible ?? item.visibleOnWebsite ?? item.showOnWebsite ?? item.publicVisible, true)
  );
}

async function getJson(path: string, init?: RequestInit) {
  const response = await fetch(apiUrl(path), init);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return (await response.json()) as unknown;
}

function withCache<T>(key: string, load: () => Promise<T>) {
  const cached = responseCache.get(key) as Promise<T> | undefined;
  if (cached) return cached;

  const pending = load().catch((error) => {
    responseCache.delete(key);
    throw error;
  });

  responseCache.set(key, pending);
  return pending;
}

function mapSimpleList<T extends WebsiteCategory | WebsiteService | WebsiteCity | WebsiteArea>(rows: unknown[]): T[] {
  return rows
    .flatMap((row) => {
      const item = unwrap(row);
      if (!isWebsiteVisible(item)) return [];
      const id = asNumber(item.id ?? item.categoryId ?? item.serviceId ?? item.cityId ?? item.areaId, 0);
      const name = asString(item.name ?? item.title, "");
      const slug = asString(item.slug ?? item.code, "");
      if (!id || !name || !slug) return [];
      return [{ id, name, slug }] as T[];
    });
}

function normalizeWebsiteService(row: unknown): WebsiteService | null {
  const item = unwrap(row);
  if (!isWebsiteVisible(item)) return null;
  const nested = unwrap(item.service);
  const id = asNumber(item.id ?? item.serviceId ?? nested.id, 0);
  const name = asString(item.name ?? item.serviceName ?? item.title ?? nested.name, "");
  const slug = asString(item.slug ?? item.serviceSlug ?? nested.slug, "");
  if (!id || !name || !slug) return null;
  return { id, name, slug };
}

export async function getLegalDocument(slug: string): Promise<DocumentPayload | null> {
  try {
    const raw = unwrap(await getJson(`/api/v1/legal/${slug}`, { cache: "no-store" }));
    const nested = unwrap(raw.data);
    const document = unwrap(nested.document ?? nested.legalDocument ?? raw.document ?? raw.legalDocument ?? nested);
    const content = String(document.content ?? document.body ?? document.markdown ?? raw.content ?? raw.body ?? raw.markdown ?? "").trim();
    return content
      ? {
          title: String(document.title ?? ""),
          content,
          updatedAt: String(document.updatedAt ?? document.publishedAt ?? document.effectiveFrom ?? ""),
        }
      : null;
  } catch {
    return null;
  }
}

export async function getFaqs(): Promise<Faq[]> {
  try {
    const root = unwrap(await getJson("/api/public/support/faqs"));
    const rows = (Array.isArray(root.data) ? root.data : Array.isArray(root.content) ? root.content : Array.isArray(root) ? root : []) as unknown[];
    return rows.flatMap((row) => {
      const item = unwrap(row);
      const category = String(item.label ?? item.name ?? item.title ?? "General");
      const entries = Array.isArray(item.faqs) ? item.faqs : Array.isArray(item.items) ? item.items : [];
      return entries
        .map((entry) => {
          const faq = unwrap(entry);
          return {
            category,
            question: String(faq.question ?? faq.title ?? "").trim(),
            answer: String(faq.answer ?? faq.description ?? "").trim(),
          };
        })
        .filter((faq) => faq.question && faq.answer);
    });
  } catch {
    // The page displays its local FAQ fallback when the public service is unavailable.
    return [];
  }
}

export async function getSocialMediaLinks(): Promise<SocialMediaLink[]> {
  try {
    const root = unwrap(await getJson("/api/public/social-media", { cache: "no-store" }));
    const rows = Array.isArray(root.data) ? root.data : [];
    return rows
      .flatMap((row) => {
        const item = unwrap(row);
        const platform = String(item.platform ?? "").trim().toUpperCase();
        const url = String(item.url ?? "").trim();
        if (!platform || !url) return [];
        return [
          {
            platform,
            url,
            label: String(item.label ?? platform).trim() || platform,
            icon: String(item.icon ?? "").trim(),
            displayOrder: Number(item.displayOrder ?? 0),
          },
        ];
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  } catch {
    return [];
  }
}

export function getWebsiteCategories(): Promise<WebsiteCategory[]> {
  return withCache("website-categories", async () => {
    const root = unwrap(await getJson("/api/public/website/services/categories"));
    const rows = Array.isArray(root.data) ? root.data : Array.isArray(root) ? root : [];
    return mapSimpleList<WebsiteCategory>(rows);
  });
}

export function getCategoryServices(categorySlug: string): Promise<WebsiteService[]> {
  return withCache(`category-services:${categorySlug}`, async () => {
    const root = unwrap(await getJson(`/api/public/website/services/categories/${categorySlug}/services`));
    const rows = Array.isArray(root.data) ? root.data : Array.isArray(root) ? root : [];
    return rows.map(normalizeWebsiteService).filter((item): item is WebsiteService => Boolean(item));
  });
}

export function getWebsiteCities(): Promise<WebsiteCity[]> {
  return withCache("website-cities", async () => {
    const root = unwrap(await getJson("/api/public/website/cities"));
    const rows = Array.isArray(root.data) ? root.data : Array.isArray(root) ? root : [];
    return mapSimpleList<WebsiteCity>(rows);
  });
}

export function getCityAreas(citySlug: string): Promise<WebsiteArea[]> {
  return withCache(`city-areas:${citySlug}`, async () => {
    const root = unwrap(await getJson(`/api/public/website/cities/${citySlug}/areas`));
    const rows = Array.isArray(root.data) ? root.data : Array.isArray(root) ? root : [];
    return mapSimpleList<WebsiteArea>(rows);
  });
}

async function findServiceBySlug(serviceSlug: string): Promise<WebsiteService | null> {
  const categories = await getWebsiteCategories();
  for (const category of categories) {
    const services = await getCategoryServices(category.slug);
    const match = services.find((service) => service.slug === serviceSlug);
    if (match) return match;
  }
  return null;
}

function normalizeServiceDetail(payload: unknown, fallbackSlug: string, fallbackId?: number): WebsiteServiceDetail {
  const root = unwrap(payload);
  const wrapped = root.data && typeof root.data === "object" ? unwrap(root.data) : root;
  const service = unwrap(wrapped.service);
  const detailRows = asArray(wrapped.details);
  const included = toStringList(wrapped.included ?? wrapped.includedItems);
  const excluded = toStringList(wrapped.excluded ?? wrapped.excludedItems);
  const faqs = toStringList(wrapped.faqs ?? wrapped.faq ?? wrapped.faqItems);
  const instructions = toStringList(wrapped.instructions ?? wrapped.instruction ?? wrapped.instructionItems);

  const detailIncluded = detailRows
    .filter((row) => asString(unwrap(row).type, "").toUpperCase() === "INCLUDED")
    .map((row) => asString(unwrap(row).itemName ?? unwrap(row).name ?? unwrap(row).value, ""))
    .filter(Boolean);
  const detailExcluded = detailRows
    .filter((row) => asString(unwrap(row).type, "").toUpperCase() === "EXCLUDED")
    .map((row) => asString(unwrap(row).itemName ?? unwrap(row).name ?? unwrap(row).value, ""))
    .filter(Boolean);
  const detailFaqs = detailRows
    .filter((row) => asString(unwrap(row).type, "").toUpperCase() === "FAQ")
    .map((row) => asString(unwrap(row).itemName ?? unwrap(row).name ?? unwrap(row).value, ""))
    .filter(Boolean);
  const detailInstructions = detailRows
    .filter((row) => {
      const type = asString(unwrap(row).type, "").toUpperCase();
      return type === "INSTRUCTION" || type === "INSTRUCTIONS";
    })
    .map((row) => asString(unwrap(row).itemName ?? unwrap(row).name ?? unwrap(row).value, ""))
    .filter(Boolean);

  return {
    serviceId: asNumber(wrapped.serviceId ?? wrapped.id ?? service.id, fallbackId ?? 0),
    serviceSlug: asString(wrapped.slug ?? wrapped.serviceSlug ?? service.slug, fallbackSlug),
    serviceName: asString(wrapped.serviceName ?? wrapped.name ?? service.name, slugToName(fallbackSlug)),
    description: asString(
      wrapped.description ??
        wrapped.shortDescription ??
        wrapped.summary ??
        wrapped.overview ??
        service.description ??
        service.shortDescription,
      "",
    ),
    price: (() => {
      const value = asNumber(wrapped.discountedPrice ?? wrapped.price ?? wrapped.basePrice ?? service.price, 0);
      return value > 0 ? value : undefined;
    })(),
    bookingMode: asString(
      wrapped.bookingMode ??
        (Array.isArray(wrapped.bookingModes) ? wrapped.bookingModes.join(", ") : "") ??
        service.bookingMode,
      "",
    ),
    imageUrl: asString(
      wrapped.imageUrl ??
        wrapped.thumbnailUrl ??
        wrapped.serviceImageUrl ??
        wrapped.bannerImageUrl ??
        service.imageUrl ??
        service.thumbnailUrl,
      "",
    ),
    included: included.length ? included : detailIncluded,
    excluded: excluded.length ? excluded : detailExcluded,
    faqs: faqs.length ? faqs : detailFaqs,
    instructions: instructions.length ? instructions : detailInstructions,
  };
}

async function fetchServiceDetailById(serviceId: number, serviceSlug: string) {
  const attempts = [
    `/api/customer/services/${serviceId}`,
    `/api/services/${serviceId}`,
    `/api/customer/services/${serviceId}/details`,
    `/api/services/${serviceId}/details`,
    `/api/customer/services/${serviceSlug}`,
    `/api/services/${serviceSlug}`,
  ];

  for (const path of attempts) {
    try {
      const payload = await getJson(path);
      const detail = normalizeServiceDetail(payload, serviceSlug, serviceId);
      if (detail.serviceId || detail.serviceName) return detail;
    } catch {
      // Try the next fallback endpoint.
    }
  }

  throw new Error("Unable to load service details.");
}

export async function getServiceDetails(serviceSlug: string, serviceId?: number): Promise<WebsiteServiceDetail> {
  const key = `service-detail:${serviceSlug}:${serviceId ?? "lookup"}`;
  return withCache(key, async () => {
    const resolved = serviceId ? { id: serviceId, slug: serviceSlug, name: slugToName(serviceSlug) } : await findServiceBySlug(serviceSlug);
    if (!resolved) throw new Error("Unable to load service details.");
    return fetchServiceDetailById(resolved.id, resolved.slug);
  });
}

export async function submitSupportTicket(payload: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  bookingId?: string;
}) {
  const response = await fetch(apiUrl("/api/public/support/tickets"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("We could not send your request right now.");
}
