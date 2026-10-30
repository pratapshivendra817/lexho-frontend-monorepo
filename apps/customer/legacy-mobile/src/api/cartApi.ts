import { api, parseApiError } from "./client";
import { formatAddressLine } from "../utils/addressFormatter";
import { API_BASE_URL, DEV_IMAGE_HOST } from "../constants/env";
import { DEFAULT_CART_POLICY, normalizeCartPolicy, type CartPolicy } from "../constants/cartPolicy";
import type { AddCartRequest, CartItemDto, UpdateCartRequest } from "../types/contracts";
import type { SlotOption } from "../types/contracts";

type CartAddress = {
  id: number | string;
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
  categoryId?: string;
  categoryName?: string;
  serviceType?: string;
  price: number;
  quantity: number;
  totalPrice: number;
  familySizeId?: number;
  familySize?: string;
  familySizeLabel?: string;
  addons?: SelectedCartAddon[];
  serviceActive?: boolean;
  addonActive?: boolean;
  areaAvailable?: boolean;
};

export type CustomerCartResponse = {
  cartId: number | null;
  address: CartAddress | null;
  scheduledTime?: string | null;
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

export type SelectedCartAddon = {
  addonId: number;
  quantity: number;
};

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
  const clean = value.trim().replace(/\\/g, "/");
  if (!clean) return "";
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean.replace(
      /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?/i,
      (match, _host, port) => {
        const protocol = match.startsWith("https://") ? "https://" : "http://";
        return `${protocol}${DEV_IMAGE_HOST}${String(port ?? "")}`;
      },
    );
  }
  if (clean.startsWith("//")) return `http:${clean}`;
  const normalizedBase = API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = clean.startsWith("/") ? clean : `/${clean}`;
  return `${normalizedBase}${normalizedPath}`;
}

function toCartShape(payload: any): CustomerCartResponse {
  const root = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const hasScheduleKey =
    root && typeof root === "object" &&
    ("scheduledTime" in root || "scheduledAt" in root || "bookingTime" in root || "slotStartTime" in root);
  const resolvedSchedule = pickFirstNonEmptyString(
    root?.scheduledTime,
    root?.scheduledAt,
    root?.bookingTime,
    root?.slotStartTime,
  );
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
    const imageRaw = pickFirstNonEmptyString(
      row?.imageUrl,
      row?.service?.imageUrl,
      row?.serviceDetails?.imageUrl,
    );
    const imageUrl = imageRaw ? toAbsoluteUrl(imageRaw) : undefined;
    const category = row?.category && typeof row.category === "object" ? row.category : {};
    const serviceCategory = row?.service?.category && typeof row.service.category === "object" ? row.service.category : {};
    const serviceDetailsCategory = row?.serviceDetails?.category && typeof row.serviceDetails.category === "object" ? row.serviceDetails.category : {};
    const categoryId = pickFirstNonEmptyString(
      row?.categoryId != null ? String(row.categoryId) : "",
      row?.serviceCategoryId != null ? String(row.serviceCategoryId) : "",
      category?.id != null ? String(category.id) : "",
      category?.categoryId != null ? String(category.categoryId) : "",
      row?.service?.categoryId != null ? String(row.service.categoryId) : "",
      serviceCategory?.id != null ? String(serviceCategory.id) : "",
      serviceCategory?.categoryId != null ? String(serviceCategory.categoryId) : "",
      row?.serviceDetails?.categoryId != null ? String(row.serviceDetails.categoryId) : "",
      serviceDetailsCategory?.id != null ? String(serviceDetailsCategory.id) : "",
      serviceDetailsCategory?.categoryId != null ? String(serviceDetailsCategory.categoryId) : "",
    );
    const categoryName = pickFirstNonEmptyString(
      row?.categoryName,
      row?.category,
      row?.category_name,
      row?.serviceCategory,
      row?.serviceCategoryName,
      category?.name,
      category?.categoryName,
      row?.service?.categoryName,
      row?.service?.serviceCategory,
      row?.service?.serviceCategoryName,
      serviceCategory?.name,
      serviceCategory?.categoryName,
      row?.serviceDetails?.categoryName,
      row?.serviceDetails?.serviceCategory,
      row?.serviceDetails?.serviceCategoryName,
      serviceDetailsCategory?.name,
      serviceDetailsCategory?.categoryName,
    );
    return {
      itemId,
      serviceId,
      name,
      imageUrl,
      categoryId: categoryId || undefined,
      categoryName: categoryName || undefined,
      serviceType: row?.serviceType ? String(row.serviceType) : undefined,
      price: Number(row?.price ?? 0),
      quantity: Number(row?.quantity ?? 1),
      totalPrice: Number(row?.totalPrice ?? (Number(row?.price ?? 0) * Number(row?.quantity ?? 1))),
      familySizeId: row?.familySizeId != null ? Number(row.familySizeId) : row?.cookFamilySizeId != null ? Number(row.cookFamilySizeId) : undefined,
      familySize: pickFirstNonEmptyString(row?.familySize, row?.cookFamilySize, row?.familySizeCode),
      familySizeLabel: pickFirstNonEmptyString(row?.familySizeLabel, row?.cookFamilySizeLabel, row?.familySizeName),
      addons: asArray(row?.addons ?? row?.selectedAddons).map((addon: any) => ({
        addonId: Number(addon?.addonId ?? addon?.id ?? 0),
        quantity: Number(addon?.quantity ?? 1),
      })).filter((addon) => addon.addonId > 0),
      serviceActive: row?.serviceActive ?? row?.active ?? row?.service?.active,
      addonActive: row?.addonActive,
      areaAvailable: row?.areaAvailable ?? row?.serviceAvailableInArea,
    };
  });
  return {
    cartId: root?.cartId != null ? Number(root.cartId) : null,
    address: address
      ? {
          id: address.id ?? address.addressId ?? 0,
          fullAddress: address.fullAddress ? String(address.fullAddress) : undefined,
          city: address.city ? String(address.city) : undefined,
          pincode: address.pincode ? String(address.pincode) : undefined,
          latitude: Number(address.latitude ?? 0),
          longitude: Number(address.longitude ?? 0),
          default: Boolean(address.default),
        }
      : null,
    scheduledTime: hasScheduleKey ? (resolvedSchedule ? String(resolvedSchedule) : null) : undefined,
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

export async function getCartPolicy(): Promise<CartPolicy> {
  const endpoints = ["/api/customer/cart/config", "/api/customer/cart/policy", "/api/cart/config"];
  for (const endpoint of endpoints) {
    try {
      const { data } = await api.get(endpoint);
      return normalizeCartPolicy(data);
    } catch {
      // Fall through to the next known endpoint, then defaults.
    }
  }
  return DEFAULT_CART_POLICY;
}

export async function getCustomerCart(): Promise<CustomerCartResponse> {
  try {
    let data: any;
    try {
      const response = await api.get("/api/customer/cart");
      data = response.data;
    } catch (primaryError: any) {
      const status = Number(primaryError?.response?.status ?? 0);
      // Some backend deployments expose the legacy cart route but reject the
      // newer customer-scoped route with 403. Try the compatible legacy route
      // before surfacing the add-to-cart error to the customer.
      if (![403, 404, 405].includes(status)) throw primaryError;
      const response = await api.get("/api/cart");
      data = response.data;
    }
    return toCartShape(data);
  } catch (e) {
    throw new Error(parseApiError(e, "Get customer cart failed"));
  }
}

export async function addCustomerCartItem(payload: {
  serviceId: number;
  quantity: number;
  addons?: SelectedCartAddon[];
  familySizeId?: number;
  familySize?: string;
  familySizeLabel?: string;
}) {
  try {
    const addPayload = {
      serviceId: Number(payload.serviceId),
      quantity: Number(payload.quantity ?? 1),
      ...(payload.familySizeId ? { familySizeId: Number(payload.familySizeId) } : {}),
      ...(payload.familySize ? { familySize: String(payload.familySize) } : {}),
      ...(payload.familySizeLabel ? { familySizeLabel: String(payload.familySizeLabel) } : {}),
      ...(Array.isArray(payload.addons) && payload.addons.length > 0
        ? {
            addons: payload.addons.map((addon) => ({
              addonId: Number(addon.addonId),
              quantity: Number(addon.quantity ?? 1),
            })),
          }
        : {}),
    };
    let data: any;
    try {
      const response = await api.post("/api/customer/cart", addPayload);
      data = response.data;
    } catch (primaryError: any) {
      const status = Number(primaryError?.response?.status ?? 0);
      if (![403, 404, 405].includes(status)) throw primaryError;
      const response = await api.post("/api/cart/add", addPayload);
      data = response.data;
    }
    const root = data?.data && typeof data.data === "object" ? data.data : data;
    const itemFromAddResponse = (() => {
      if (!root || typeof root !== "object") return null;
      const hasSingleItemShape = "serviceId" in root || "itemId" in root || "name" in root;
      if (!hasSingleItemShape || Array.isArray(root.items)) return null;
      const serviceId = Number(root?.serviceId ?? root?.id ?? 0);
      if (!serviceId) return null;
      return {
        itemId: Number(root?.itemId ?? root?.id ?? 0),
        serviceId,
        name: pickFirstNonEmptyString(root?.name, root?.serviceName, root?.title, `Service #${serviceId}`),
        imageUrl: root?.imageUrl ? String(root.imageUrl) : undefined,
        price: Number(root?.price ?? 0),
        quantity: Number(root?.quantity ?? 1),
        totalPrice: Number(root?.totalPrice ?? (Number(root?.price ?? 0) * Number(root?.quantity ?? 1))),
        familySizeId: root?.familySizeId != null ? Number(root.familySizeId) : undefined,
        familySize: pickFirstNonEmptyString(root?.familySize, root?.cookFamilySize),
        familySizeLabel: pickFirstNonEmptyString(root?.familySizeLabel, root?.cookFamilySizeLabel),
        addons: Array.isArray(root?.addons) ? root.addons.map((addon: any) => ({
          addonId: Number(addon?.addonId ?? addon?.id ?? 0),
          quantity: Number(addon?.quantity ?? 1),
        })).filter((addon: { addonId: number; quantity: number }) => addon.addonId > 0) : [],
      };
    })();

    let cart: CustomerCartResponse = toCartShape({
      items: Array.isArray(root?.items) ? root.items : itemFromAddResponse ? [itemFromAddResponse] : [],
      grandTotal: root?.grandTotal ?? (itemFromAddResponse ? Number(itemFromAddResponse.totalPrice ?? 0) : 0),
      itemTotal: root?.itemTotal ?? root?.subtotal ?? (itemFromAddResponse ? Number(itemFromAddResponse.totalPrice ?? 0) : 0),
      gstAmount: root?.gstAmount ?? 0,
      serviceFee: root?.serviceFee ?? 0,
      taxAmount: root?.taxAmount ?? 0,
      toPay: root?.toPay ?? root?.grandTotal ?? (itemFromAddResponse ? Number(itemFromAddResponse.totalPrice ?? 0) : 0),
      totalSaved: root?.totalSaved ?? 0,
      currency: root?.currency ?? "INR",
      contactName: root?.contactName,
      contactPhone: root?.contactPhone,
      requestStatus: root?.requestStatus ?? "PENDING",
      matchedPartners: root?.matchedPartners ?? 0,
      assignmentMode: root?.assignmentMode,
    });

    try {
      const refreshedCart = await getCustomerCart();
      // A newly committed item can be briefly missing from a replica-backed read.
      // Do not replace a successful add with that transient empty response.
      if (refreshedCart.items.length > 0 || cart.items.length === 0) {
        cart = refreshedCart;
      }
    } catch {
      // The create call often succeeds even when the subsequent cart fetch is temporarily flaky.
      // Preserve the optimistic add result instead of surfacing a generic error to the UI.
    }

    return {
      ...cart,
      requestStatus: "PENDING",
      matchedPartners: Number(root?.matchedPartners ?? cart.matchedPartners ?? 0),
      assignmentMode: root?.assignmentMode ? String(root.assignmentMode) : cart.assignmentMode,
    };
  } catch (e) {
    throw new Error(parseApiError(e, "Add to customer cart failed"));
  }
}

function emptyCartFallback(): CustomerCartResponse {
  return {
    cartId: null,
    address: null,
    scheduledTime: null,
    items: [],
    grandTotal: 0,
    itemTotal: 0,
    gstAmount: 0,
    serviceFee: 0,
    taxAmount: 0,
    toPay: 0,
    totalSaved: 0,
    currency: "INR",
    contactName: undefined,
    contactPhone: undefined,
    requestStatus: "IDLE",
    matchedPartners: 0,
    assignmentMode: undefined,
  };
}

export async function updateCustomerCartItem(payload: { itemId: number; quantity?: number; familySizeId?: number; familySize?: string; familySizeLabel?: string }) {
  try {
    let mutationResponse: any = null;
    try {
      const response = await api.put("/api/customer/cart/item", payload);
      mutationResponse = response?.data;
    } catch (primaryError: any) {
      const status = Number(primaryError?.response?.status ?? 0);
      if (![403, 404, 405].includes(status)) throw primaryError;
      const response = await api.put("/api/cart/item", payload);
      mutationResponse = response?.data;
    }
    try {
      return await getCustomerCart();
    } catch {
      const optimistic = toCartShape(mutationResponse ?? {});
      if (optimistic.items.length > 0 || optimistic.grandTotal > 0 || optimistic.cartId != null) {
        return optimistic;
      }
      return emptyCartFallback();
    }
  } catch (e) {
    throw new Error(parseApiError(e, "Update cart item failed"));
  }
}

export async function removeCustomerCartItem(itemId: number) {
  try {
    const resolvedItemId = await (async () => {
      const candidateId = Number(itemId ?? 0);
      if (!Number.isFinite(candidateId) || candidateId <= 0) return 0;
      try {
        const cart = await getCustomerCart();
        const matched = cart.items.find((row) =>
          Number(row.itemId) === candidateId || Number(row.serviceId) === candidateId,
        );
        const resolved = Number(matched?.itemId ?? candidateId);
        return Number.isFinite(resolved) && resolved > 0 ? resolved : candidateId;
      } catch {
        return candidateId;
      }
    })();

    let mutationResponse: any = null;
    try {
      const response = await api.delete(`/api/customer/cart/item/${resolvedItemId}`);
      mutationResponse = response?.data;
    } catch (primaryError: any) {
      const status = Number(primaryError?.response?.status ?? 0);
      if (![403, 404, 405].includes(status)) throw primaryError;
      const response = await api.delete(`/api/cart/item/${resolvedItemId}`);
      mutationResponse = response?.data;
    }
    try {
      return await getCustomerCart();
    } catch {
      const optimistic = toCartShape(mutationResponse ?? {});
      if (optimistic.items.length > 0 || optimistic.grandTotal > 0 || optimistic.cartId != null) {
        return optimistic;
      }
      return emptyCartFallback();
    }
  } catch (e) {
    throw new Error(parseApiError(e, "Remove cart item failed"));
  }
}

export async function clearCustomerCart() {
  try {
    try {
      const { data } = await api.delete("/api/customer/cart/clear");
      const cart = toCartShape(data);
      if (cart.items.length > 0 || cart.grandTotal > 0 || cart.cartId != null) {
        return cart;
      }
      try {
        return await getCustomerCart();
      } catch {
        return cart;
      }
    } catch (primaryError: any) {
      const status = Number(primaryError?.response?.status ?? 0);
      if (![403, 404, 405].includes(status)) throw primaryError;
      const { data } = await api.delete("/api/cart/clear");
      const cart = toCartShape(data);
      if (cart.items.length > 0 || cart.grandTotal > 0 || cart.cartId != null) {
        return cart;
      }
      try {
        return await getCustomerCart();
      } catch {
        return cart;
      }
    }
  } catch (e) {
    throw new Error(parseApiError(e, "Clear cart failed"));
  }
}

export async function patchCustomerCartMeta(payload: { addressId: number | string; scheduledTime: string }) {
  try {
    try {
      const { data } = await api.patch("/api/customer/cart/meta", payload);
      return toCartShape(data);
    } catch (primaryError: any) {
      const status = Number(primaryError?.response?.status ?? 0);
      if (![403, 404, 405].includes(status)) throw primaryError;
      const { data } = await api.patch("/api/cart/meta", payload);
      return toCartShape(data);
    }
  } catch (e) {
    throw new Error(parseApiError(e, "Update cart meta failed"));
  }
}

export async function getAvailableTimeSlots(date: string): Promise<SlotOption[]> {
  try {
    const { data } = await api.get("/api/customer/cart/slots", { params: { date } });
    const root = data?.data && typeof data.data === "object" ? data.data : data;
    const normalizedDate = String(date || "").trim();
    const dateSlash = normalizedDate.replace(/-/g, "/");
    const dateCompact = normalizedDate.replace(/-/g, "");
    let rows = Array.isArray(root)
      ? root
      : Array.isArray(root?.slots)
        ? root.slots
        : Array.isArray(root?.items)
          ? root.items
          : Array.isArray(root?.content)
            ? root.content
            : Array.isArray(root?.data)
              ? root.data
              : Array.isArray(root?.[normalizedDate])
                ? root[normalizedDate]
                : Array.isArray(root?.[dateSlash])
                  ? root[dateSlash]
                  : Array.isArray(root?.[dateCompact])
                    ? root[dateCompact]
                    : Array.isArray(root?.slotsByDate?.[normalizedDate])
                      ? root.slotsByDate[normalizedDate]
                      : Array.isArray(root?.slotsByDate?.[dateSlash])
                        ? root.slotsByDate[dateSlash]
                        : [];
    if (Array.isArray(rows) && rows.length > 0 && rows.every((entry) => entry && typeof entry === "object" && ("date" in entry || "slotDate" in entry))) {
      const grouped = rows.find((entry: any) => {
        const d = String(entry?.date ?? entry?.slotDate ?? "").trim();
        return d === normalizedDate || d === dateSlash || d === dateCompact;
      });
      if (grouped) {
        rows = Array.isArray(grouped?.slots) ? grouped.slots : Array.isArray(grouped?.items) ? grouped.items : Array.isArray(grouped?.content) ? grouped.content : [];
      }
    }
    return rows.map((row: any) => {
      const slot = String(typeof row === "string" ? row : row?.slot ?? row?.label ??
        (row?.startTime && row?.endTime ? `${row.startTime}-${row.endTime}` : "")).trim();
      return {
        slot,
        available: typeof row === "string" ? true : row?.available === true,
        instantEligible: row?.instantEligible === true,
        etaMinutes: Number(row?.etaMinutes ?? 999),
      };
    }).filter((row: SlotOption) => /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(row.slot));
  } catch (error) {
    throw new Error(parseApiError(error, "Unable to load booking slots. Please retry."));
  }
}

export async function getCustomerAddresses() {
  try {
    const { data } = await api.get("/api/v1/customer/location/all", { params: { page: 0, size: 50 } });
    const root = data?.data && typeof data.data === "object" ? data.data : data;
    const rows = Array.isArray(root) ? root : Array.isArray(root?.items) ? root.items : Array.isArray(root?.content) ? root.content : [];
    return rows.map((row: any) => ({
      id: row?.id ?? row?.addressUuid ?? row?.addressId ?? "",
      fullAddress: formatAddressLine({ ...row, addressLine: row?.addressLine ?? row?.fullAddress ?? row?.line1 }),
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
    addons: payload.addons,
  });
}
export async function updateCart(payload: UpdateCartRequest) { return updateCustomerCartItem({ itemId: Number((payload as any).id ?? 0), quantity: Number(payload.quantity ?? 1) }); }
export async function removeFromCart(id: string) { return removeCustomerCartItem(Number(id)); }
export async function removeCartItem(id: string) { return removeCustomerCartItem(Number(id)); }
