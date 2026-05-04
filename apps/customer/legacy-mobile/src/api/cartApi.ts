import { api, parseApiError } from "./client";
import { API_BASE_URL } from "../constants/env";
import type { AddCartRequest, CartItemDto, UpdateCartRequest } from "../types/contracts";

type CartAddress = {
  id: number;
  fullAddress?: string;
  city?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  default?: boolean;
};

export type CustomerCartItem = {
  itemId: number;
  serviceId: number;
  name: string;
  imageUrl?: string;
  serviceType?: string;
  price: number;
  quantity: number;
  totalPrice: number;
};

export type CustomerCartResponse = {
  cartId: number | null;
  address: CartAddress | null;
  scheduledTime: string | null;
  items: CustomerCartItem[];
  grandTotal: number;
  itemTotal?: number;
  gstAmount?: number;
  serviceFee?: number;
  taxAmount?: number;
  toPay?: number;
  totalSaved?: number;
  currency?: string;
  contactName?: string;
  contactPhone?: string;
  requestStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | "IDLE";
  matchedPartners?: number;
  assignmentMode?: string;
};

function isNotFoundError(error: any) {
  return Number(error?.response?.status ?? 0) === 404;
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function pickFirstNonEmptyString(...values: any[]) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const clean = value.trim();
    if (clean.length > 0) return clean;
  }
  return "";
}

function toAbsoluteUrl(value: string) {
  const clean = value.trim();
  if (!clean) return "";
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
  if (clean.startsWith("//")) return `http:${clean}`;
  const normalizedBase = API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = clean.startsWith("/") ? clean : `/${clean}`;
  return `${normalizedBase}${normalizedPath}`;
}

function pickImageUrl(row: any) {
  const nestedService = row?.service ?? {};
  const nestedDetails = row?.serviceDetails ?? {};

  const mediaCandidates = [
    row?.media?.[0]?.url,
    row?.media?.[0]?.imageUrl,
    nestedService?.media?.[0]?.url,
    nestedService?.media?.[0]?.imageUrl,
    nestedDetails?.media?.[0]?.url,
    nestedDetails?.media?.[0]?.imageUrl,
    row?.images?.[0]?.url,
    row?.images?.[0]?.imageUrl,
    nestedService?.images?.[0]?.url,
    nestedService?.images?.[0]?.imageUrl,
    nestedDetails?.images?.[0]?.url,
    nestedDetails?.images?.[0]?.imageUrl,
  ];

  const raw = pickFirstNonEmptyString(
    row?.imageUrl,
    row?.image,
    row?.serviceImage,
    row?.serviceImageUrl,
    row?.thumbnail,
    row?.thumbnailUrl,
    row?.icon,
    row?.iconUrl,
    nestedService?.imageUrl,
    nestedService?.image,
    nestedService?.serviceImage,
    nestedService?.serviceImageUrl,
    nestedService?.thumbnail,
    nestedService?.thumbnailUrl,
    nestedService?.icon,
    nestedService?.iconUrl,
    nestedDetails?.imageUrl,
    nestedDetails?.image,
    nestedDetails?.serviceImage,
    nestedDetails?.serviceImageUrl,
    nestedDetails?.thumbnail,
    nestedDetails?.thumbnailUrl,
    nestedDetails?.icon,
    nestedDetails?.iconUrl,
    ...mediaCandidates,
  );

  return raw ? toAbsoluteUrl(raw) : undefined;
}

function toServiceLookupShape(payload: any): Array<{ serviceId: number; imageUrl?: string; name?: string }> {
  const root = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const rows = Array.isArray(root) ? root : Array.isArray(root?.items) ? root.items : Array.isArray(root?.data) ? root.data : [];
  return rows.map((row: any) => {
    const serviceId = Number(row?.id ?? row?.serviceId ?? 0);
    const imageUrl = pickImageUrl(row);
    const name = pickFirstNonEmptyString(row?.name, row?.serviceName, row?.title);
    return {
      serviceId,
      imageUrl,
      name: name || undefined,
    };
  });
}

async function enrichCartWithCatalog(cart: CustomerCartResponse): Promise<CustomerCartResponse> {
  if (!Array.isArray(cart.items) || cart.items.length === 0) return cart;
  const missingImage = cart.items.some((item) => !item.imageUrl);
  if (!missingImage) return cart;

  try {
    const { data } = await api.get("/api/customer/services/catalog", { params: { page: 0, size: 200 } });
    const catalog = toServiceLookupShape(data);
    const imageByServiceId = new Map<number, { imageUrl?: string; name?: string }>();
    catalog.forEach((row) => {
      if (row.serviceId > 0) imageByServiceId.set(row.serviceId, { imageUrl: row.imageUrl, name: row.name });
    });

    return {
      ...cart,
      items: cart.items.map((item) => {
        if (item.imageUrl) return item;
        const fallback = imageByServiceId.get(Number(item.serviceId));
        if (!fallback) return item;
        return {
          ...item,
          imageUrl: fallback.imageUrl ?? item.imageUrl,
          name: item.name?.startsWith("Service #") && fallback.name ? fallback.name : item.name,
        };
      }),
    };
  } catch {
    return cart;
  }
}

function toCartShape(payload: any): CustomerCartResponse {
  const root = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const address = root?.address && typeof root.address === "object" ? root.address : null;
  const items = asArray(root?.items).map((row: any) => {
    const itemId = Number(row?.itemId ?? row?.id ?? 0);
    const serviceId = Number(row?.serviceId ?? row?.service?.id ?? 0);
    const name = pickFirstNonEmptyString(
      row?.name,
      row?.serviceName,
      row?.serviceTitle,
      row?.title,
      row?.service?.name,
      row?.service?.serviceName,
      row?.service?.title,
      row?.serviceDetails?.name,
      row?.serviceDetails?.serviceName,
      row?.serviceDetails?.title,
    ) || `Service #${serviceId || itemId || ""}`;
    const imageUrl = pickImageUrl(row);
    return {
      itemId,
      serviceId,
      name,
      imageUrl,
      serviceType: row?.serviceType ? String(row.serviceType) : undefined,
      price: Number(row?.price ?? 0),
      quantity: Number(row?.quantity ?? 1),
      totalPrice: Number(row?.totalPrice ?? (Number(row?.price ?? 0) * Number(row?.quantity ?? 1))),
    };
  });

  return {
    cartId: root?.cartId != null ? Number(root.cartId) : null,
    address: address
      ? {
          id: Number(address.id ?? 0),
          fullAddress: address.fullAddress ? String(address.fullAddress) : undefined,
          city: address.city ? String(address.city) : undefined,
          pincode: address.pincode ? String(address.pincode) : undefined,
          latitude: Number(address.latitude ?? 0),
          longitude: Number(address.longitude ?? 0),
          default: Boolean(address.default),
        }
      : null,
    scheduledTime: root?.scheduledTime ? String(root.scheduledTime) : null,
    items,
    grandTotal: Number(root?.grandTotal ?? items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)),
    itemTotal: Number(
      root?.itemTotal ??
      root?.subTotal ??
      root?.subtotal ??
      root?.cartTotal ??
      items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0),
    ),
    gstAmount: Number(root?.gstAmount ?? root?.gst ?? 0),
    serviceFee: Number(root?.serviceFee ?? root?.serviceFees ?? 0),
    taxAmount: Number(root?.taxAmount ?? root?.tax ?? 0),
    toPay: Number(root?.toPay ?? root?.payableAmount ?? root?.grandTotal ?? 0),
    totalSaved: Number(root?.totalSaved ?? root?.savedAmount ?? root?.discountAmount ?? 0),
    currency: pickFirstNonEmptyString(root?.currency, root?.currencyCode) || "INR",
    contactName: pickFirstNonEmptyString(root?.contactName, root?.customerName, root?.userName) || undefined,
    contactPhone: pickFirstNonEmptyString(root?.contactPhone, root?.phone, root?.mobile, root?.customerPhone) || undefined,
    requestStatus: String(root?.requestStatus ?? root?.status ?? "IDLE").toUpperCase() as any,
    matchedPartners: root?.matchedPartners != null ? Number(root.matchedPartners) : undefined,
    assignmentMode: root?.assignmentMode ? String(root.assignmentMode) : undefined,
  };
}

export async function getCustomerCart(): Promise<CustomerCartResponse> {
  try {
    try {
      const { data } = await api.get("/api/customer/cart");
      const cart = toCartShape(data);
      return await enrichCartWithCatalog(cart);
    } catch (e) {
      if (!isNotFoundError(e)) throw e;
      const { data } = await api.get("/api/cart");
      const cart = toCartShape(data);
      return await enrichCartWithCatalog(cart);
    }
  } catch (e) {
    throw new Error(parseApiError(e, "Get customer cart failed"));
  }
}

export async function addCustomerCartItem(payload: { serviceId: number; quantity: number }) {
  try {
    const addPayload = {
      serviceId: Number(payload.serviceId),
      quantity: Number(payload.quantity ?? 1),
    };
    const { data } = await api.post("/api/customer/cart/add", addPayload);
    const root = data?.data && typeof data.data === "object" ? data.data : data;
    const cart = await getCustomerCart();
    return {
      ...cart,
      requestStatus: "PENDING",
      matchedPartners: Number(root?.matchedPartners ?? 0),
      assignmentMode: root?.assignmentMode ? String(root.assignmentMode) : undefined,
    };
  } catch (e) {
    throw new Error(parseApiError(e, "Add to customer cart failed"));
  }
}

export async function updateCustomerCartItem(payload: { itemId: number; quantity: number }) {
  try {
    try {
      const { data } = await api.put("/api/customer/cart/item", payload);
      return await enrichCartWithCatalog(toCartShape(data));
    } catch (e) {
      if (!isNotFoundError(e)) throw e;
      const { data } = await api.put("/api/cart/item", payload);
      return await enrichCartWithCatalog(toCartShape(data));
    }
  } catch (e) {
    throw new Error(parseApiError(e, "Update cart item failed"));
  }
}

export async function removeCustomerCartItem(itemId: number) {
  try {
    try {
      const { data } = await api.delete(`/api/customer/cart/item/${itemId}`);
      return await enrichCartWithCatalog(toCartShape(data));
    } catch (e) {
      if (!isNotFoundError(e)) throw e;
      const { data } = await api.delete(`/api/cart/item/${itemId}`);
      return await enrichCartWithCatalog(toCartShape(data));
    }
  } catch (e) {
    throw new Error(parseApiError(e, "Remove cart item failed"));
  }
}

export async function clearCustomerCart() {
  try {
    try {
      const { data } = await api.delete("/api/customer/cart/clear");
      return await enrichCartWithCatalog(toCartShape(data));
    } catch (e) {
      if (!isNotFoundError(e)) throw e;
      const { data } = await api.delete("/api/cart/clear");
      return await enrichCartWithCatalog(toCartShape(data));
    }
  } catch (e) {
    throw new Error(parseApiError(e, "Clear cart failed"));
  }
}

export async function patchCustomerCartMeta(payload: { addressId: number; scheduledTime: string }) {
  try {
    try {
      const { data } = await api.patch("/api/customer/cart/meta", payload);
      return await enrichCartWithCatalog(toCartShape(data));
    } catch (e) {
      if (!isNotFoundError(e)) throw e;
      const { data } = await api.patch("/api/cart/meta", payload);
      return await enrichCartWithCatalog(toCartShape(data));
    }
  } catch (e) {
    throw new Error(parseApiError(e, "Update cart meta failed"));
  }
}

export async function getAvailableTimeSlots(date: string): Promise<string[]> {
  try {
    const { data } = await api.get("/api/customer/cart/slots", { params: { date } });
    const root = data?.data && typeof data.data === "object" ? data.data : data;
    const rows = Array.isArray(root) ? root : Array.isArray(root?.slots) ? root.slots : Array.isArray(root?.items) ? root.items : [];
    const slots = rows
      .map((row: any) => String(row?.label ?? row?.time ?? row?.slot ?? row?.startTime ?? row ?? "").trim())
      .filter(Boolean);
    return slots;
  } catch {
    return [];
  }
}

export async function getCustomerAddresses() {
  try {
    const { data } = await api.get("/api/customer/addresses");
    const root = data?.data && typeof data.data === "object" ? data.data : data;
    const rows = Array.isArray(root) ? root : Array.isArray(root?.items) ? root.items : Array.isArray(root?.content) ? root.content : [];
    return rows.map((row: any) => ({
      id: Number(row?.id ?? 0),
      fullAddress: String(row?.fullAddress ?? row?.line1 ?? ""),
      city: row?.city ? String(row.city) : "",
      pincode: row?.pincode ? String(row.pincode) : "",
      latitude: Number(row?.latitude ?? 0),
      longitude: Number(row?.longitude ?? 0),
      default: Boolean(row?.default ?? row?.isDefault),
    }));
  } catch (e) {
    throw new Error(parseApiError(e, "Fetch addresses failed"));
  }
}

// Legacy exports retained to avoid breaking imports elsewhere.
export async function getCart(): Promise<CartItemDto[]> {
  const cart = await getCustomerCart();
  return cart.items as unknown as CartItemDto[];
}
export async function addToCart(payload: AddCartRequest) {
  return addCustomerCartItem({
    serviceId: Number(payload.serviceId),
    quantity: Number(payload.quantity ?? 1),
  });
}
export async function updateCart(payload: UpdateCartRequest) { return updateCustomerCartItem({ itemId: Number((payload as any).id ?? 0), quantity: Number(payload.quantity ?? 1) }); }
export async function removeFromCart(id: string) { return removeCustomerCartItem(Number(id)); }
export async function removeCartItem(id: string) { return removeCustomerCartItem(Number(id)); }
