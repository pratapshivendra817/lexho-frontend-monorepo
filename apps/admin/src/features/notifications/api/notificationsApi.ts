import { api } from "@/api/axios";

import type {
  AdminNotification,
  AdminNotificationListResponse,
  AdminNotificationQueryParams,
  AdminNotificationStats,
  SendAdminNotificationPayload,
} from "../types";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const asString = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const readArray = (payload: unknown, keys: string[]): UnknownRecord[] => {
  if (Array.isArray(payload)) return payload as UnknownRecord[];
  const root = asRecord(payload);
  for (const key of keys) {
    const candidate = root[key];
    if (Array.isArray(candidate)) return candidate as UnknownRecord[];
  }
  const nested = asRecord(root.data);
  for (const key of keys) {
    const candidate = nested[key];
    if (Array.isArray(candidate)) return candidate as UnknownRecord[];
  }
  return [];
};

const toNotification = (row: UnknownRecord): AdminNotification => ({
  id: asString(row.id ?? row.notificationId),
  title: asString(row.title),
  message: asString(row.message ?? row.body),
  userType: asString(row.userType ?? row.audience),
  notificationType: asString(row.notificationType ?? row.type),
  channelType: asString(row.channelType ?? row.channel),
  status: asString(row.status || "PENDING"),
  city: asString(row.city) || undefined,
  service: asString(row.service ?? row.serviceType) || undefined,
  createdAt: asString(row.createdAt) || undefined,
  scheduledAt: asString(row.scheduleTime ?? row.scheduledAt) || undefined,
  readCount: asNumber(row.readCount, 0),
  clickCount: asNumber(row.clickCount, 0),
});

const readPagination = (payload: unknown, size: number, page: number) => {
  const root = asRecord(payload);
  const nested = asRecord(root.data);
  const source = Object.keys(nested).length > 0 ? nested : root;
  const totalElements = asNumber(source.totalElements ?? source.total, 0);
  const totalPages = asNumber(source.totalPages, Math.max(1, Math.ceil(totalElements / size || 1)));
  const pageNumber = asNumber(source.pageNumber ?? source.page, page);
  return { totalElements, totalPages, pageNumber };
};

export async function getAdminNotifications(
  params: AdminNotificationQueryParams,
): Promise<AdminNotificationListResponse> {
  const { data } = await api.get("/api/admin/notifications", { params });
  const content = readArray(data, ["content", "items", "results", "notifications"]).map(toNotification);
  const meta = readPagination(data, params.size, params.page);
  return { content, ...meta };
}

export async function getAdminNotificationById(id: string): Promise<AdminNotification | null> {
  const { data } = await api.get(`/api/admin/notifications/${id}`);
  const root = asRecord(data);
  const nested = asRecord(root.data);
  const source = Object.keys(nested).length > 0 ? nested : root;
  if (Object.keys(source).length === 0) {
    return null;
  }
  return toNotification(source);
}

export async function sendAdminNotification(payload: SendAdminNotificationPayload) {
  await api.post("/api/admin/notifications/send", payload);
}

export async function retryAdminNotification(id: string) {
  await api.post(`/api/admin/notifications/${id}/retry`);
}

export async function getAdminNotificationStats(): Promise<AdminNotificationStats> {
  const { data } = await api.get("/api/admin/notifications/stats");
  const root = asRecord(data);
  const nested = asRecord(root.data);
  const source = Object.keys(nested).length > 0 ? nested : root;

  const channelWiseStats = readArray(source.channelWiseStats, [
    "channelWiseStats",
    "channelStats",
    "channels",
  ]).map((row) => ({
    name: asString(row.name ?? row.channel ?? row.label),
    value: asNumber(row.value ?? row.count),
  }));

  const trend = readArray(source.trend, ["trend", "dailyStats", "timeline"]).map((row) => ({
    label: asString(row.label ?? row.date ?? row.day),
    sent: asNumber(row.sent),
    failed: asNumber(row.failed),
    read: asNumber(row.read),
  }));

  return {
    totalSent: asNumber(source.totalSent),
    totalFailed: asNumber(source.totalFailed),
    totalRead: asNumber(source.totalRead),
    totalPending: asNumber(source.totalPending),
    totalClicked: asNumber(source.totalClicked),
    channelWiseStats,
    trend,
  };
}
