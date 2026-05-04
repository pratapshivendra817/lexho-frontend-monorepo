import type { ActivityLog } from "@/types/activity";
import type { Banner } from "@/types/banner";
import type { BookingDetails, BookingListItem } from "@/types/booking";
import type { Notification, NotificationType } from "@/types/notification";
import type { Payout } from "@/types/payout";
import type { Provider, VerificationStatus } from "@/types/provider";
import type { Review } from "@/types/review";
import type { Service } from "@/types/service";
import type { Ticket, TicketStatus } from "@/types/ticket";
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
  const totalProviders = toNumber(root.totalProviders);

  return [
    { title: "Total Users", value: formatIndianNumber(totalUsers), growth: "Live" },
    { title: "Total Bookings", value: formatIndianNumber(totalBookings), growth: "Live" },
    { title: "Revenue", value: `INR ${formatIndianNumber(totalCompletedRevenue)}`, growth: "Live" },
    { title: "Active Providers", value: formatIndianNumber(totalProviders), growth: "Live" },
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

export async function fetchProviders(params?: { status?: string; search?: string }) {
  const { data } = await api.get("/api/admin/providers", { params });
  return pickArray<Provider>(data, ["data", "content", "providers", "items", "results"]);
}

export async function fetchProviderById(id: string) {
  const { data } = await api.get(`/api/admin/providers/${id}`);
  return pickObject<Provider>(data, ["data", "provider", "item", "result"]);
}

export async function updateProviderVerification(payload: {
  id: string;
  status: VerificationStatus;
  reason?: string;
}) {
  await api.patch(`/api/admin/providers/${payload.id}/verification`, {
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

export async function fetchActivityLogs() {
  const { data } = await api.get("/api/admin/activity-logs");
  return pickArray<ActivityLog>(data, ["data", "content", "logs", "items", "results"]);
}

export async function fetchSupportTickets() {
  const { data } = await api.get("/api/admin/support/tickets");
  return pickArray<Ticket>(data, ["data", "content", "tickets", "items", "results"]);
}

export async function updateSupportTicketStatus(id: string, status: TicketStatus) {
  await api.patch(`/api/admin/support/tickets/${id}/status`, { status });
}

export async function replySupportTicket(id: string, message: string) {
  await api.post(`/api/admin/support/tickets/${id}/reply`, { message });
}
