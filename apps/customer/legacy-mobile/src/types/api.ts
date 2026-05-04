export type ServiceType = "HOME_COOK" | "HOME_CLEANING";

export type Banner = {
  id: string;
  title: string;
  imageUrl: string;
  redirectUrl?: string;
  promoCode?: string;
};

export type Category = {
  id: string;
  name: string;
  icon?: string;
  imageUrl?: string;
};

export type ServiceItem = {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes?: number;
  imageUrl?: string;
};

export type HomePayload = {
  greeting?: string;
  location?: string;
  featuredServices: ServiceItem[];
  recommendedServices: ServiceItem[];
  recentBookings: Order[];
};

export type AuthResponse = {
  token: string;
  user: {
    id: string;
    mobile: string;
    name?: string;
  };
};

export type CartItem = {
  id: string;
  serviceId: string;
  name: string;
  price: number;
  quantity: number;
};

export type Cart = {
  items: CartItem[];
  subtotal: number;
  tax?: number;
  total: number;
};

export type PlaceOrderInput = {
  address: string;
};

export type Order = {
  id: string;
  status: "PLACED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  amount: number;
  address: string;
  createdAt: string;
  items: CartItem[];
};

export type CustomerDashboard = {
  totalBookings: number;
  savedOffers: number;
  walletSummary: number;
  recentOrders: Order[];
};

export type CustomerNotification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type Review = {
  id: string;
  rating: number;
  comment: string;
  imageUrls?: string[];
  createdAt: string;
  serviceName?: string;
};

export type PagedResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
};

