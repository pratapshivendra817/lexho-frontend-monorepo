export type CustomerNotificationType = "BOOKING" | "PAYMENT" | "OFFER" | "REVIEW" | "GENERAL";

export type CustomerNotification = {
  id: string;
  title: string;
  message: string;
  type: CustomerNotificationType | string;
  createdAt?: string;
  read: boolean;
};

export type CustomerNotificationsPageResponse = {
  content: CustomerNotification[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
};
