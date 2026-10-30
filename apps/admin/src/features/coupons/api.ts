import { api } from "@/api/axios";
import type { Coupon, CouponPayload } from "./types";

export async function getCoupons(page: number): Promise<Coupon[]> {
  const { data } = await api.get("/api/admin/coupons", { params: { page, size: 20 } });
  const root = data?.data ?? data;
  return Array.isArray(root) ? root : root?.content ?? root?.items ?? [];
}

export async function saveCoupon(payload: CouponPayload, id?: number) {
  if (id != null) await api.put(`/api/admin/coupons/${id}`, payload);
  else await api.post("/api/admin/coupons", payload);
}
