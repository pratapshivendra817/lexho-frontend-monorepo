export type SortDir = "asc" | "desc";

export type ServiceableAreaStatus = "ACTIVE" | "INACTIVE";

export type ServiceableAreaItem = {
  id: string;
  name: string;
  pincode: string;
  city: string;
  state: string;
  country: string;
  cityId?: number | null;
  zoneId?: number | null;
  polygonJson?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ServiceableAreaQueryParams = {
  page: number;
  size: number;
  sortBy: string;
  sortDir: SortDir;
  query?: string;
  status?: ServiceableAreaStatus | "ALL";
};

export type ServiceableAreaListResponse = {
  items: ServiceableAreaItem[];
  total: number;
  page: number;
  size: number;
};

export type CreateServiceableAreaPayload = {
  name: string;
  pincode: string;
  city: string;
  state: string;
  cityId?: number | null;
  zoneId?: number | null;
  polygonJson?: string | null;
  active: boolean;
};

export type UpdateServiceableAreaPayload = CreateServiceableAreaPayload;
