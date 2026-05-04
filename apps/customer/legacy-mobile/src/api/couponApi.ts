import { api, parseApiError } from "./client";
import type { ApplyCouponRequest, CouponDto } from "../types/contracts";

export async function applyCoupon(payload: ApplyCouponRequest) { try { const { data } = await api.post('/api/coupon/apply', payload); return data; } catch (e) { throw new Error(parseApiError(e, 'Coupon apply failed')); } }
export async function getCoupons(): Promise<CouponDto[]> { try { const { data } = await api.get('/api/coupon/list'); return (Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []) as CouponDto[]; } catch (e) { throw new Error(parseApiError(e, 'Coupon list failed')); } }
