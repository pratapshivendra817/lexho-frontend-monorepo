export type DashboardServiceSummary = {
  totalServices: number;
  activeServices: number;
  inactiveServices: number;
  totalBookings: number;
  totalRevenue: number;
};

export type TopService = {
  serviceId: string;
  serviceName: string;
  bookings: number;
  revenue: number;
};

export type ServiceAnalyticsPoint = {
  label: string;
  bookings: number;
  revenue: number;
};

export type CategoryItem = {
  id: string;
  name: string;
  iconUrl: string;
  active: boolean;
};

export type CategoryPayload = {
  name: string;
  iconUrl: string;
  active: boolean;
};

export type ServiceItem = {
  id: string;
  serviceType: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
  details: ServiceDetailItem[];
};

export type ServicePayload = {
  name: string;
  description: string;
  price: number;
  service_type: string;
};

export type ServiceDetailType = "INCLUDED" | "EXCLUDED" | "FAQ" | "INSTRUCTION";

export type ServiceDetailItem = {
  id: string;
  type: ServiceDetailType;
  itemName: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
};
