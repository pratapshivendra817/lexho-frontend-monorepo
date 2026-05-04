import axios from "axios";

import type { ProviderNotification, ProviderNotificationsPageResponse } from "../types";

type UnknownRecord = Record<string, unknown>;

const partnerApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8082",
});

partnerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("partner_access_token") ?? localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

const asBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
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

const toNotification = (row: UnknownRecord): ProviderNotification => ({
  id: asString(row.id ?? row.notificationId),
  title: asString(row.title),
  message: asString(row.message ?? row.body),
  type: asString(row.type ?? row.notificationType ?? "GENERAL"),
  createdAt: asString(row.createdAt ?? row.timestamp) || undefined,
  read: asBoolean(row.read ?? row.isRead),
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

export async function getProviderNotifications(page: number, size: number): Promise<ProviderNotificationsPageResponse> {
  const { data } = await partnerApi.get("/api/provider/notifications", { params: { page, size } });
  const content = readArray(data, ["content", "notifications", "items", "results"]).map(toNotification);
  const meta = readPagination(data, size, page);
  return { content, ...meta };
}

export async function getProviderUnreadNotificationCount(): Promise<number> {
  const { data } = await partnerApi.get("/api/provider/notifications/unread-count");
  const root = asRecord(data);
  const nested = asRecord(root.data);
  const source = Object.keys(nested).length > 0 ? nested : root;
  return asNumber(source.unreadCount ?? source.count ?? source.value, 0);
}

export async function markProviderNotificationAsRead(id: string) {
  await partnerApi.patch(`/api/provider/notifications/${id}/read`);
}
