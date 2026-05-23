export type OrderStatus = "NEW" | "PENDING" | "ACCEPTED" | "REJECTED" | "STARTED" | "COMPLETED" | "CANCELLED";

export type PartnerOrder = {
  id: number;
  requestId?: number;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  serviceType?: string;
  serviceCategory?: string;
  subService?: string;
  distance?: number;
  etaMinutes?: number;
  payout?: number;
  bookingType?: "INSTANT" | "SCHEDULED";
  assignmentStatus?: string;
  promisedStartTime?: string;
  slaMinutes?: number;
  unavailableReason?: string;
  available?: boolean;
  amount?: number;
  status: OrderStatus;
  createdAt?: string;
  latitude?: number;
  longitude?: number;
};
