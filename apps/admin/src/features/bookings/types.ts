export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export type SortDirection = "asc" | "desc";

export type ServiceType = "COOK" | "CLEANING" | "OTHER";

export type BookingStats = {
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
};

export type BookingCustomer = {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
};

export type BookingProvider = {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  rating?: number;
};

export type BookingPayment = {
  amount: number;
  method?: string;
  status?: string;
  transactionId?: string;
  currency?: string;
};

export type BookingTimelineItem = {
  label: string;
  at?: string;
  actor?: string;
  notes?: string;
};

export type BookingListItem = {
  id: string;
  customerName: string;
  service: string;
  serviceType: ServiceType;
  providerName: string;
  bookingDate: string;
  amount: number;
  status: BookingStatus;
  createdAt?: string;
};

export type BookingDetails = {
  id: string;
  status: BookingStatus;
  service: string;
  serviceType: ServiceType;
  bookingDate: string;
  bookingTime?: string;
  notes?: string;
  customer: BookingCustomer;
  provider: BookingProvider;
  payment: BookingPayment;
  timeline: BookingTimelineItem[];
};

export type BookingListResponse = {
  content: BookingListItem[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
};

export type BookingListParams = {
  page: number;
  size: number;
  sortBy: string;
  sortDir: SortDirection;
  status?: BookingStatus | "";
  serviceType?: ServiceType | "";
  search?: string;
  startDate?: string;
  endDate?: string;
};

export type UpdateBookingPayload = {
  bookingDate: string;
  bookingTime: string;
  providerId: number;
  amount: number;
  notes?: string;
};
