export type OrderStatus =
  | "NEW"
  | "CREATED"
  | "ASSIGNED"
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "STARTED"
  | "COMPLETED"
  | "CANCELLED";

export type OrderTimelineEvent = {
  id: string;
  orderId?: number;
  fromStatus?: string;
  toStatus: string;
  remarks?: string;
  actorType?: string;
  actorId?: string;
  timestamp?: string;
};

export type PartnerOrder = {
  id: number;
  orderId?: number;
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
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  rejectedAt?: string;
  expiresAt?: string;
  expiresInSeconds?: number;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT" | string;
  latitude?: number;
  longitude?: number;
  timeline?: OrderTimelineEvent[];
};
