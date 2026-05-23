import type { ActivityLog } from "@/types/activity";
import type { Banner } from "@/types/banner";
import type { BookingDetails, BookingListItem } from "@/types/booking";
import type { Notification, NotificationType } from "@/types/notification";
import type { Payout } from "@/types/payout";
import type { Partner, VerificationStatus } from "@/types/partner";
import type { Review } from "@/types/review";
import type { Service } from "@/types/service";
import type { Ticket, TicketPriority, TicketStatus } from "@/types/ticket";
import type { User } from "@/types/user";

import { api } from "./axios";

type UnknownRecord = Record<string, unknown>;

export type DashboardStat = {
  title: string;
  value: string;
  growth: string;
  color?: string;
};

export type DashboardRevenuePoint = {
  name: string;
  bookings: number;
  revenue: number;
};

export type DashboardServicePoint = {
  name: string;
  value: number;
};

export type AdminBookingLiveEvent = {
  id: number;
  bookingId: number;
  eventType: string;
  eventPayload: string;
  createdAt: string;
};

export type AdminBookingLiveTracking = {
  bookingId: number;
  status: string;
  paymentStatus: string;
  scheduledAt: string;
  partnerId: number | null;
  partnerLocation: {
    partnerId: number;
    latitude: number;
    longitude: number;
    pincode?: string;
    source?: string;
    updatedAt?: string;
  } | null;
  events: AdminBookingLiveEvent[];
};

export type AdminPaymentReconciliation = {
  bookingId: number;
  amount: number;
  bookingStatus: string;
  paymentStatus: string;
  payout: {
    id: number;
    providerId: number;
    amount: number;
    status: string;
    createdAt?: string;
  } | null;
};

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatIndianNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

function pickArray<T>(payload: unknown, keys: string[]): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const source = payload as UnknownRecord;
  for (const key of keys) {
    const candidate = source[key];
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }
  }

  return [];
}

function pickObject<T>(payload: unknown, keys: string[]): T | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const source = payload as UnknownRecord;
  for (const key of keys) {
    const candidate = source[key];
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate as T;
    }
  }

  return payload as T;
}

export async function fetchDashboardStats() {
  const { data } = await api.get("/api/admin/dashboard/stats");
  const root = pickObject<UnknownRecord>(data, ["data", "stats", "result"]);

  if (!root) {
    return [];
  }

  const totalUsers = toNumber(root.totalUsers);
  const totalBookings = toNumber(root.totalBookings);
  const totalCompletedRevenue = toNumber(root.totalCompletedRevenue);
  const totalPartners = toNumber(root.totalPartners);

  return [
    { title: "Total Users", value: formatIndianNumber(totalUsers), growth: "Live" },
    { title: "Total Bookings", value: formatIndianNumber(totalBookings), growth: "Live" },
    { title: "Revenue", value: `INR ${formatIndianNumber(totalCompletedRevenue)}`, growth: "Live" },
    { title: "Active Partners", value: formatIndianNumber(totalPartners), growth: "Live" },
  ];
}

export async function fetchDashboardRevenue() {
  const { data } = await api.get("/api/admin/dashboard/revenue");
  const points = pickArray<UnknownRecord>(data, ["data", "revenue", "items", "results"]);

  return points.map((item) => {
    const month = item.month ?? item.name ?? item.label ?? "N/A";
    const revenue = toNumber(item.amount ?? item.revenue ?? item.value);
    const bookings = toNumber(item.bookings);

    return {
      name: typeof month === "string" || typeof month === "number" ? String(month) : "N/A",
      revenue,
      bookings,
    } satisfies DashboardRevenuePoint;
  });
}

export async function fetchDashboardServiceDistribution() {
  const { data } = await api.get("/api/admin/dashboard/services-distribution");
  const points = pickArray<UnknownRecord>(data, ["data", "distribution", "items", "results"]);

  return points.map((item) => ({
    name: typeof item.name === "string" ? item.name : "Other",
    value: toNumber(item.value),
  }));
}

export async function fetchUsers(params: {
  page: number;
  limit: number;
  role?: string;
  search?: string;
}) {
  const { data } = await api.get("/api/admin/users", { params });
  const users = pickArray<User>(data, ["data", "content", "users", "items", "results"]);
  const root = (data && typeof data === "object" ? (data as UnknownRecord) : {}) as UnknownRecord;
  const total =
    typeof root.total === "number"
      ? root.total
      : typeof root.totalElements === "number"
      ? root.totalElements
      : users.length;

  return { users, total };
}

export async function fetchUserById(id: string) {
  const { data } = await api.get(`/api/admin/users/${id}`);
  return pickObject<User>(data, ["data", "user", "item", "result"]);
}

export async function toggleUserStatus(id: string) {
  await api.post(`/api/admin/users/${id}/toggle`);
}

export async function fetchBookings(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) {
  const { data } = await api.get("/api/admin/bookings", { params });
  return pickArray<BookingListItem>(data, ["data", "content", "bookings", "items", "results"]);
}

export async function fetchBookingById(id: string) {
  const { data } = await api.get(`/api/admin/bookings/${id}`);
  return pickObject<BookingDetails>(data, ["data", "booking", "item", "result"]);
}

export async function fetchPartners(params?: { status?: string; search?: string }) {
  const { data } = await api.get("/api/admin/partners", { params });
  return pickArray<Partner>(data, ["data", "content", "partners", "items", "results"]);
}

export async function fetchPartnerById(id: string) {
  const { data } = await api.get(`/api/admin/partners/${id}`);
  return pickObject<Partner>(data, ["data", "partner", "item", "result"]);
}

export async function updatePartnerVerification(payload: {
  id: string;
  status: VerificationStatus;
  reason?: string;
}) {
  await api.patch(`/api/admin/partners/${payload.id}/verification`, {
    status: payload.status,
    reason: payload.reason,
  });
}

export async function fetchServices() {
  const { data } = await api.get("/api/admin/services");
  return pickArray<Service>(data, ["data", "content", "services", "items", "results"]);
}

export async function fetchBanners() {
  const { data } = await api.get("/api/admin/banners");
  return pickArray<Banner>(data, ["data", "content", "banners", "items", "results"]);
}

export async function fetchReviews(params?: { rating?: number; service?: string }) {
  const { data } = await api.get("/api/admin/reviews", { params });
  return pickArray<Review>(data, ["data", "content", "reviews", "items", "results"]);
}

export async function deleteReview(id: string) {
  await api.delete(`/api/admin/reviews/${id}`);
}

export async function flagReview(id: string) {
  await api.post(`/api/admin/reviews/${id}/flag`);
}

export async function fetchNotifications(params?: { search?: string; type?: string }) {
  const { data } = await api.get("/api/admin/notifications", { params });
  return pickArray<Notification>(data, [
    "data",
    "content",
    "notifications",
    "items",
    "results",
  ]);
}

export async function createNotification(payload: {
  userId: number;
  title: string;
  message: string;
  type: NotificationType;
  referenceId?: number;
}) {
  await api.post("/api/admin/notifications", payload);
}

export async function fetchPayouts() {
  const { data } = await api.get("/api/admin/payouts");
  return pickArray<Payout>(data, ["data", "content", "payouts", "items", "results"]);
}

export async function fetchBookingLiveTracking(bookingId: string | number) {
  const { data } = await api.get(`/api/v1/admin/bookings/${bookingId}/tracking/live`);
  const item = pickObject<AdminBookingLiveTracking>(data, ["data", "item", "result"]);
  return item;
}

export async function updateBookingPartnerLocation(
  bookingId: string | number,
  payload: { latitude: number; longitude: number; pincode?: string },
) {
  await api.patch(`/api/v1/admin/bookings/${bookingId}/tracking/partner-location`, payload);
}

export async function fetchPaymentReconciliation(bookingId: string | number) {
  const { data } = await api.get(`/api/v1/admin/bookings/${bookingId}/payment/reconciliation`);
  return pickObject<AdminPaymentReconciliation>(data, ["data", "item", "result"]);
}

export async function updatePaymentStatus(bookingId: string | number, paymentStatus: string) {
  await api.patch(`/api/v1/admin/bookings/${bookingId}/payment/status`, { paymentStatus });
}

export async function upsertBookingPayout(
  bookingId: string | number,
  payload: { providerId: number; amount: number; status: string },
) {
  await api.put(`/api/v1/admin/bookings/${bookingId}/payment/payout`, payload);
}

export async function fetchActivityLogs() {
  const { data } = await api.get("/api/admin/activity-logs");
  return pickArray<ActivityLog>(data, ["data", "content", "logs", "items", "results"]);
}

export async function fetchSupportTickets() {
  const { data } = await api.get("/api/admin/support/tickets");
  return pickArray<Ticket>(data, ["data", "content", "tickets", "items", "results"]);
}

export async function fetchSupportTicketsWithFilters(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: TicketStatus | "";
  categoryId?: string;
  priority?: TicketPriority | "";
}) {
  const { data } = await api.get("/api/admin/support/tickets", { params });
  const tickets = pickArray<Ticket>(data, ["data", "content", "tickets", "items", "results"]);
  const root = (data && typeof data === "object" ? (data as UnknownRecord) : {}) as UnknownRecord;
  const total = typeof root.total === "number" ? root.total : tickets.length;
  return { tickets, total };
}

export async function fetchSupportTicketById(id: string | number) {
  const { data } = await api.get(`/api/admin/support/tickets/${id}`);
  return pickObject<Ticket>(data, ["data", "ticket", "item", "result"]);
}

export async function updateSupportTicketStatus(id: string | number, status: TicketStatus) {
  await api.patch(`/api/admin/support/tickets/${id}/status`, { status });
}

export async function replySupportTicket(id: string | number, message: string) {
  await api.post(`/api/admin/support/tickets/${id}/reply`, { message });
}

export type SupportFaqCategoryPayload = {
  id: string;
  label: string;
  displayOrder?: number;
  active?: boolean;
};

export type SupportFaqItemPayload = {
  id: string;
  question: string;
  answer: string;
  displayOrder?: number;
  active?: boolean;
};

export async function fetchSupportFaqCategories() {
  const { data } = await api.get("/api/admin/support/faq-categories");
  return pickArray<SupportFaqCategoryPayload>(data, ["data", "content", "items", "results"]);
}

export async function createSupportFaqCategory(payload: SupportFaqCategoryPayload) {
  await api.post("/api/admin/support/faq-categories", payload);
}

export async function updateSupportFaqCategory(categoryId: string, payload: SupportFaqCategoryPayload) {
  await api.put(`/api/admin/support/faq-categories/${categoryId}`, payload);
}

export async function deleteSupportFaqCategory(categoryId: string) {
  await api.delete(`/api/admin/support/faq-categories/${categoryId}`);
}

export async function fetchSupportFaqItems(categoryId: string) {
  const { data } = await api.get(`/api/admin/support/faq-categories/${categoryId}/faqs`);
  return pickArray<SupportFaqItemPayload>(data, ["data", "content", "items", "results"]);
}

export async function createSupportFaqItem(categoryId: string, payload: SupportFaqItemPayload) {
  await api.post(`/api/admin/support/faq-categories/${categoryId}/faqs`, payload);
}

export async function updateSupportFaqItem(categoryId: string, faqId: string, payload: SupportFaqItemPayload) {
  await api.put(`/api/admin/support/faq-categories/${categoryId}/faqs/${faqId}`, payload);
}

export async function deleteSupportFaqItem(categoryId: string, faqId: string) {
  await api.delete(`/api/admin/support/faq-categories/${categoryId}/faqs/${faqId}`);
}


