export type PartnerProfile = {
  id?: string;
  name?: string;
  email?: string;
  mobile?: string;
  city?: string;
  address?: string;
  serviceCategory?: string;
  profileImageUrl?: string;
  kycStatus?: string;
};

export type PartnerDashboardStats = {
  todayEarnings: number;
  totalCompletedOrders: number;
  pendingOrders: number;
  cancelledOrders?: number;
  totalOnlineHours?: number;
  activeDeliveries?: number;
  weeklyEarnings?: number;
};
