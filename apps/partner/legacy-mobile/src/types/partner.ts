export type PartnerDashboardStats = {
  todayEarnings: number;
  totalCompletedOrders: number;
  pendingOrders: number;
  cancelledOrders?: number;
  totalOnlineHours?: number;
  activeDeliveries?: number;
  weeklyEarnings?: number;
};

export type PartnerDispatchConfig = {
  foregroundTrackingIntervalSeconds: number;
  backgroundTrackingIntervalSeconds: number;
  minDistanceMeters: number;
  requestExpiryWarningSeconds: number;
};

export type PartnerPerformanceSummary = {
  acceptanceRate: number;
  completionRate: number;
  cancellationRate: number;
  rating: number;
  onTimeArrivalRate: number;
};

export type PartnerRatingSummary = {
  averageRating: number;
  totalReviews: number;
  feedback: Array<{ id: string; rating: number; comment: string; customerName?: string; createdAt?: string }>;
};

export type PartnerLeaveItem = {
  id: string;
  fromDate: string;
  toDate: string;
  reason?: string;
  status: string;
};

export type PartnerServiceArea = {
  id: string;
  name: string;
  pincode: string;
  city: string;
  selected: boolean;
};

export type PartnerWarningItem = {
  id: string;
  type: "WARNING" | "SUSPENSION" | string;
  reason: string;
  guidance?: string;
  createdAt?: string;
  status?: string;
  active?: boolean;
  notificationTitle?: string;
  notificationMessage?: string;
};

export type PartnerScreeningCentre = {
  name: string;
  address: string;
  landmark?: string;
  entranceInfo?: string;
  latitude: number;
  longitude: number;
  phone?: string;
};
