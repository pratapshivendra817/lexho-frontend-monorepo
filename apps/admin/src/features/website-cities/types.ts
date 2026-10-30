export type WebsiteCity = {
  id: number;
  name: string;
  slug: string;
  displayOrder: number;
  active: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type WebsiteArea = {
  id: number;
  cityId: number;
  name: string;
  slug: string;
  displayOrder: number;
  active: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type WebsiteLocationPayload = {
  name: string;
  slug: string;
  displayOrder: number;
  active: boolean;
};
