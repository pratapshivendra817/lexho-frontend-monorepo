export type AdminNotificationChannel = "PUSH" | "EMAIL" | "SMS" | "IN_APP";
export type AdminNotificationUserType =
  | "ALL_USERS"
  | "CUSTOMERS"
  | "PARTNERS"
  | "ADMINS"
  | "ADMIN"
  | "CITY_USERS"
  | "PREMIUM_USERS"
  | "INACTIVE_USERS";
export type AdminNotificationType =
  | "BOOKING"
  | "PAYMENT"
  | "OFFER"
  | "REVIEW"
  | "PROMOTION"
  | "SYSTEM";
export type AdminNotificationStatus =
  | "SENT"
  | "FAILED"
  | "PENDING"
  | "SCHEDULED"
  | "READ"
  | "CLICKED";

export type AdminNotification = {
  id: string;
  title: string;
  message: string;
  userType: AdminNotificationUserType | string;
  notificationType: AdminNotificationType | string;
  channelType: AdminNotificationChannel | string;
  status: AdminNotificationStatus | string;
  city?: string;
  service?: string;
  createdAt?: string;
  scheduledAt?: string;
  readCount?: number;
  clickCount?: number;
};

export type AdminNotificationListResponse = {
  content: AdminNotification[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
};

export type AdminNotificationQueryParams = {
  page: number;
  size: number;
  search?: string;
  userType?: string;
  notificationType?: string;
  channelType?: string;
  status?: string;
};

export type AdminNotificationStats = {
  totalSent: number;
  totalFailed: number;
  totalRead: number;
  totalPending: number;
  totalClicked: number;
  channelWiseStats: Array<{ name: string; value: number }>;
  trend: Array<{ label: string; sent: number; failed: number; read: number }>;
};

export type SendAdminNotificationPayload = {
  title: string;
  message: string;
  notificationType: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | string;
  channels: string[];
  targetUserType: string;
  city?: string;
  scheduledTime?: string;
};


