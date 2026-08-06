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
  displayOrder?: number;
};

export type CategoryPayload = {
  name: string;
  iconUrl: string;
  active: boolean;
  displayOrder?: number;
};

export type ServiceItem = {
  id: string;
  serviceType: string;
  name: string;
  description: string;
  price: number;
  rating?: number;
  categoryId?: string;
  categoryName?: string;
  imageUrl?: string;
  active: boolean;
  details: ServiceDetailItem[];
};

export type ServicePayload = {
  name: string;
  description: string;
  price: number;
  rating?: number;
  service_type: string;
  categoryId?: number;
  category_id?: number;
  imageUrl?: string;
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
