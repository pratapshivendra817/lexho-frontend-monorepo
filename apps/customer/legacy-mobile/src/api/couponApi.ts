import { api, extractList, parseApiError, unwrapPayload } from "./client";
import type { ApplyCouponRequest, CouponDto, CouponValidationData } from "../types/contracts";

export async function applyCoupon(payload: ApplyCouponRequest): Promise<CouponValidationData> {
  try {
    const { data } = await api.post("/api/coupons/validate", payload);
    const root = unwrapPayload<any>(data, data);
    const hasDiscount = root?.discountAmount != null && root?.finalAmount != null
      && Number.isFinite(Number(root.discountAmount)) && Number(root.discountAmount) >= 0
      && Number.isFinite(Number(root.finalAmount)) && Number(root.finalAmount) >= 0;
    return {
      valid: root?.valid == null ? hasDiscount : root.valid === true,
      couponCode: root?.couponCode ?? payload.code,
      originalAmount: root?.originalAmount != null ? Number(root.originalAmount) : undefined,
      discountAmount: root?.discountAmount != null ? Number(root.discountAmount) : undefined,
      finalAmount: root?.finalAmount != null ? Number(root.finalAmount) : undefined,
      currency: String(root?.currency ?? "INR"),
      message: String(data?.message ?? root?.message ?? "Coupon validated"),
    };
  } catch (e) {
    throw new Error(parseApiError(e, "Coupon apply failed"));
  }
}

export async function getCartCoupons(): Promise<CouponDto[]> {
  try {
    const { data } = await api.get("/api/coupon/list", { params: { page: 0, size: 20 } });
    let root = data;
    // Accept list/page envelopes without treating an unknown response as no offers.
    for (let depth = 0; depth < 5; depth += 1) {
      if (root?.success === false) throw new Error("Coupon list request failed");
      if (Array.isArray(root)) return root;
      if (Array.isArray(root?.content)) return root.content;
      if (Array.isArray(root?.items)) return root.items;
      if (Array.isArray(root?.coupons)) return root.coupons;
      if (root?.data == null) break;
      root = root.data;
    }
    throw new Error("Unexpected coupon list response");
  } catch (e) {
    throw new Error(parseApiError(e, "Unable to load available coupons"));
  }
}

export async function getCoupons(page = 0, size = 20): Promise<CouponDto[]> {
  try {
    const { data } = await api.get("/api/coupons/my-rewards", { params: { page, size } });
    return extractList<CouponDto>(unwrapPayload<any>(data, data));
  } catch (e) {
    throw new Error(parseApiError(e, "Coupon list failed"));
  }
}
