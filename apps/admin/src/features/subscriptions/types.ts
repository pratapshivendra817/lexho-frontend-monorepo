export type AdminSubscriptionStatus =
  | "PENDING"
  | "PENDING_ADMIN_REVIEW"
  | "UNDER_REVIEW"
  | "PENDING_PARTNER_ASSIGNMENT"
  | "PENDING_PARTNER_ACCEPTANCE"
  | "CONFIRMED"
  | "ACTIVE"
  | "PAUSED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";
export type AdminSubscriptionVisitStatus = "SCHEDULED" | "COMPLETED" | "SKIPPED" | "CANCELLED";

export type AdminEligiblePartner = {
  partnerId: number;
  partnerName: string;
};

export type AdminSubscriptionListItem = {
  id: number;
  customerId?: number;
  customerName?: string;
  serviceId?: number;
  serviceName?: string;
  status: AdminSubscriptionStatus | string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  visits?: number;
  durationHours?: number;
  timeSlot?: string;
  finalAmount?: number;
  partnerName?: string;
  createdAt?: string;
};

export type AdminSubscriptionVisit = {
  id: number;
  visitDate?: string;
  date?: string;
  timeSlot?: string;
  status: AdminSubscriptionVisitStatus | string;
  partnerId?: number;
  partnerName?: string;
};

export type AdminSubscriptionDetail = AdminSubscriptionListItem & {
  address?: string;
  paymentOption?: string;
  samePartnerPreferred?: boolean;
  replacementPartnerAllowed?: boolean;
  autoRenewal?: boolean;
  trialVisit?: boolean;
  instructions?: string;
  addOns?: string[];
  visitsList?: AdminSubscriptionVisit[];
  paymentStatus?: string;
  paymentBookingId?: number;
  assignmentStatus?: string;
  partnerName?: string;
};

export type AdminSubscriptionAssignment = {
  subscriptionId: number;
  partnerId?: number | null;
  partnerName?: string | null;
  status?: string;
  replacementPartnerId?: number | null;
  replacementPartnerName?: string | null;
  replacementReason?: string | null;
  assignedAt?: string | null;
  replacedAt?: string | null;
  visitAssignments?: Array<{
    id?: number;
    visitId?: number;
    partnerId?: number;
    partnerName?: string;
    status?: string;
    reason?: string;
    assignedAt?: string;
  }>;
};

export type AdminProfessionalChangeRequestStatus =
  | "PENDING_ADMIN_REVIEW"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "PENDING_PARTNER_ASSIGNMENT"
  | "PENDING_PARTNER_ACCEPTANCE"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export type AdminProfessionalChangeRequest = {
  id: number;
  subscriptionId?: number;
  customerId?: number;
  reasonCategory?: string;
  description?: string;
  status?: AdminProfessionalChangeRequestStatus | string;
  adminReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminSubscriptionsResponse = {
  content: AdminSubscriptionListItem[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
};
