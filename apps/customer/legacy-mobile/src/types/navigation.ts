export type AuthStackParamList = {
  Login: undefined;
  OTP: { mobile: string };
};

export type AppTabParamList = {
  Home: undefined;
  Orders: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type RecurringCartPayload = {
  serviceName?: string;
  serviceId?: number;
  subscriptionServiceType?: "CLEANING" | "COOK";
  frequencyDays?: string[];
  frequencyLabel?: string;
  startDate?: string;
  endDate?: string;
  visits?: number;
  durationHours?: number;
  durationLabel?: string;
  familySize?: string;
  familySizeLabel?: string;
  timeSlot?: string;
  perVisitPrice?: number;
  price?: number;
};

export type AppStackParamList = {
  Tabs: undefined;
  Categories: undefined;
  ServiceList: { categoryId: string; categoryName: string };
  ServiceDetails: { serviceId: string; serviceName?: string; servicePriceLabel?: string; serviceImageUrl?: string };
  ServiceDetail: {
    serviceId: string;
    serviceName?: string;
    servicePriceLabel?: string;
    serviceImageUrl?: string;
    source?: string;
    bookingMode?: string;
    scheduleMode?: string;
    categoryId?: string;
    categoryName?: string;
    cookFamilySizeId?: number;
    cookFamilySize?: string;
    cookFamilySizeLabel?: string;
    requiresCookFamilySize?: boolean;
    showCookCoverage?: boolean;
    showCleaningCoverage?: boolean;
    durationHours?: number;
    durationLabel?: string;
  };
  Cart:
    | {
        bookingMode?: "SCHEDULED" | "SUBSCRIPTION";
        scheduleMode?: "FIXED" | "HOURLY";
        serviceId?: number;
        categoryName?: string;
        durationHours?: number;
        durationLabel?: string;
        recurringBooking?: RecurringCartPayload;
        cookFamilySizeId?: number;
        cookFamilySize?: string;
        cookFamilySizeLabel?: string;
      }
    | undefined;
  RecurringBooking: { serviceId?: number; hourlyRate?: number; pricePerHour?: number; price?: number } | undefined;
  Checkout: undefined;
  OrderSuccess: { orderId: string };
  OrderDetails: { orderId: string };
  Reviews: undefined;
  Dashboard: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  App: undefined;
};
