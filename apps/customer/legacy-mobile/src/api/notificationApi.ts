import { api, parseApiError } from "./client";
import type { NotificationDto } from "../types/contracts";

function extractNotificationRows(data: any): NotificationDto[] {
  if (Array.isArray(data?.data?.data?.content)) return data.data.data.content as NotificationDto[];
  if (Array.isArray(data?.data?.data?.items)) return data.data.data.items as NotificationDto[];
  if (Array.isArray(data?.data?.data?.rows)) return data.data.data.rows as NotificationDto[];
  if (Array.isArray(data?.data?.data?.notifications)) return data.data.data.notifications as NotificationDto[];
  if (Array.isArray(data?.data?.data)) return data.data.data as NotificationDto[];
  if (Array.isArray(data?.data?.content)) return data.data.content as NotificationDto[];
  if (Array.isArray(data?.data?.items)) return data.data.items as NotificationDto[];
  if (Array.isArray(data?.data?.rows)) return data.data.rows as NotificationDto[];
  if (Array.isArray(data?.data?.notifications)) return data.data.notifications as NotificationDto[];
  if (Array.isArray(data?.payload?.content)) return data.payload.content as NotificationDto[];
  if (Array.isArray(data?.payload?.items)) return data.payload.items as NotificationDto[];
  if (Array.isArray(data?.payload?.rows)) return data.payload.rows as NotificationDto[];
  if (Array.isArray(data?.data)) return data.data as NotificationDto[];
  if (Array.isArray(data?.content)) return data.content as NotificationDto[];
  if (Array.isArray(data?.items)) return data.items as NotificationDto[];
  if (Array.isArray(data?.rows)) return data.rows as NotificationDto[];
  if (Array.isArray(data?.notifications)) return data.notifications as NotificationDto[];
  if (Array.isArray(data)) return data as NotificationDto[];
  return [];
}

export async function getNotifications(params?: { userId?: number; page?: number; size?: number }): Promise<NotificationDto[]> {
  const userId = Number(params?.userId ?? 0);
  const page = Number.isFinite(Number(params?.page)) ? Number(params?.page) : 0;
  const size = Number.isFinite(Number(params?.size)) ? Number(params?.size) : 50;
  const queryParams: Record<string, unknown> =
    userId > 0
      ? { page, size, userId, customerId: userId, targetUserType: "CUSTOMER", appType: "CUSTOMER" }
      : { page, size };
  const endpoints = ["/api/notifications"];
  for (const endpoint of endpoints) {
    try {
      const { data } = await api.get(endpoint, { params: queryParams });
      const rows = extractNotificationRows(data);
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log("[notifications:list:probe]", {
          endpoint,
          rows: rows.length,
          hasData: Boolean(data),
          topKeys: data && typeof data === "object" ? Object.keys(data).slice(0, 10) : [],
          dataKeys: data?.data && typeof data.data === "object" ? Object.keys(data.data).slice(0, 10) : [],
        });
      }
      if (rows.length > 0) return rows;
    } catch {
      // try next endpoint
    }
  }
  try {
    const { data } = await api.get("/api/notifications", { params: queryParams });
    const rows = extractNotificationRows(data);
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[notifications:list:fallback]", {
        endpoint: "/api/notifications",
        rows: rows.length,
        hasData: Boolean(data),
        topKeys: data && typeof data === "object" ? Object.keys(data).slice(0, 10) : [],
        dataKeys: data?.data && typeof data.data === "object" ? Object.keys(data.data).slice(0, 10) : [],
      });
    }
    return rows;
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to load notifications"));
  }
}
export async function markNotificationRead(id: string) { try { const { data } = await api.put("/api/notifications/read", { id }); return data; } catch (error) { throw new Error(parseApiError(error, "Failed to mark read")); } }

export async function getUnreadNotificationCount() {
  try {
    const { data } = await api.get("/api/customer/notifications/unread-count");
    return Number(data?.count ?? data?.data?.count ?? 0);
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to load unread count"));
  }
}

export async function deleteNotification(id?: string) {
  try {
    const { data } = await api.delete("/api/notifications/read", { data: { id } });
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to delete notification"));
  }
}

export async function sendTestNotification(payload: {
  userId: number;
  title?: string;
  message?: string;
  data?: Record<string, string>;
}) {
  try {
    const { data } = await api.post("/api/notifications/send", {
      userId: payload.userId,
      title: payload.title ?? "Test Notification",
      message: payload.message ?? "Push working from backend",
      data: payload.data ?? { redirectType: "NOTIFICATIONS", bookingId: "BKG123" },
    });
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to send test notification"));
  }
}
