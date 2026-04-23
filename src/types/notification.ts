// src/types/notification.ts
export type NotificationType = "SMS" | "EMAIL" | "PUSH";
export type NotificationStatus = "SENT" | "FAILED" | "PENDING";

export interface Notification {
  id: string;
  title: string;
  type: NotificationType;
  audience: string;
  status: NotificationStatus;
  date: string;
}