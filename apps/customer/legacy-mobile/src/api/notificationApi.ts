import { api, parseApiError } from "./client";
import type { NotificationDto } from "../types/contracts";

export async function getNotifications(_page?: number, _size?: number): Promise<NotificationDto[]> { try { const { data } = await api.get("/api/notifications"); return (Array.isArray(data?.data) ? data.data : Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : []) as NotificationDto[]; } catch (error) { throw new Error(parseApiError(error, "Failed to load notifications")); } }
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
