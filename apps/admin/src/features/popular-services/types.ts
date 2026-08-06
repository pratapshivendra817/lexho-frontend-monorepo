export type CategoryOption = {
  id: string;
  name: string;
};

export type ServiceItem = {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  rating: number;
  categoryId: string;
  categoryName: string;
};

export type PopularServiceItem = {
  id: string;
  serviceId: string;
  serviceName: string;
  categoryId: string;
  priority: number;
  deletedAt?: string;
};

export type CreatePopularServicePayload = {
  serviceId: number;
  categoryId: number;
  priority: number;
};
