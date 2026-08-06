export type AddonStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
export type AddonType = "OPTIONAL" | "REQUIRED";

export type AddonCategoryOption = {
  id: string;
  name: string;
};

export type AddonServiceOption = {
  id: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
};

export type RecommendedAddon = {
  id: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
  quantityAllowed: boolean;
  minQuantity: number;
  maxQuantity: number;
  required: boolean;
  categories: AddonCategoryOption[];
  services: AddonServiceOption[];
  servicesCount: number;
  createdAt: string;
};

export type RecommendedAddonPayload = {
  name: string;
  description?: string;
  price: number;
  active: boolean;
  categoryIds: number[];
  serviceIds: number[];
  quantityAllowed: boolean;
  minQuantity: number;
  maxQuantity: number;
  required: boolean;
};
