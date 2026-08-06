export type AdminSubscriptionPricing = {
  id: number;
  serviceId: number | null;
  durationHours: number;
  perVisitPrice: number;
  active: boolean;
};

export type AdminSubscriptionPricingPayload = {
  serviceId: number | null;
  durationHours: number;
  perVisitPrice: number;
  active: boolean;
};

export type CookFamilySize = "SMALL" | "MEDIUM" | "LARGE" | "XLARGE";

export type AdminCookSubscriptionPricing = {
  id: number;
  serviceId: number | null;
  familySize: CookFamilySize;
  familySizeLabel: string;
  pricePerVisit: number;
  active: boolean;
};

export type AdminCookSubscriptionPricingPayload = {
  serviceId: number | null;
  familySize: CookFamilySize;
  pricePerVisit: number;
  active: boolean;
};
