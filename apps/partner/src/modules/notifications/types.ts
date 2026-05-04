export type ProviderNotificationType = "JOB_ASSIGNMENT" | "PAYMENT" | "BOOKING_UPDATE" | "REVIEW" | "GENERAL";

export type ProviderNotification = {
  id: string;
  title: string;
  message: string;
  type: ProviderNotificationType | string;
  createdAt?: string;
  read: boolean;
};

export type ProviderNotificationsPageResponse = {
  content: ProviderNotification[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
};
