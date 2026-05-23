export type PartnerStatus = "PENDING" | "APPROVED" | "REJECTED" | "BLOCKED";
export type PartnerServiceType = "COOK" | "CLEANING" | "";

export type PartnerStats = {
  pending: number;
  approved: number;
  rejected: number;
  blocked: number;
};

export type PartnerDocument = {
  id: string;
  name: string;
  documentType: string;
  contentType: string;
  previewUrl?: string;
  uploadedAt?: string;
};

export type PartnerStatusHistory = {
  status: PartnerStatus;
  reason?: string;
  changedAt?: string;
  changedBy?: string;
};

export type PartnerListItem = {
  id: string;
  name: string;
  phone: string;
  serviceType: string;
  city: string;
  appliedDate: string;
  status: PartnerStatus;
};

export type PartnerDetails = PartnerListItem & {
  email?: string;
  gender?: string;
  dob?: string;
  state?: string;
  address?: string;
  experience?: string;
  availabilityType?: string;
  online?: boolean;
  serviceAreas?: string[];
  workingDays?: string[];
  startTime?: string;
  endTime?: string;
  accountNumber?: string;
  accountNumberMasked?: string;
  ifscCode?: string;
  documents: PartnerDocument[];
  statusHistory: PartnerStatusHistory[];
};

export type PartnerDashboardStats = {
  todayEarnings: number;
  totalCompletedOrders: number;
  pendingOrders: number;
};

export type PartnerSettlementStatus = "PENDING" | "PROCESSING" | "SETTLED" | "FAILED" | "REVERSED";

export type PartnerSettlementItem = {
  id: string;
  providerId: string;
  amount: number;
  status: PartnerSettlementStatus;
  referenceBookingId?: string;
  remarks?: string;
  processedAt?: string | null;
  createdAt?: string;
};

export type PartnerSettlementsResponse = {
  items: PartnerSettlementItem[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};

export type PartnersListResponse = {
  content: PartnerListItem[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
};

export type PartnersQueryParams = {
  page: number;
  size: number;
  status?: PartnerStatus | "";
  serviceType?: PartnerServiceType;
  city?: string;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

export type ProviderStatus = PartnerStatus;
export type ProviderServiceType = PartnerServiceType;
export type ProviderStats = PartnerStats;
export type ProviderDocument = PartnerDocument;
export type ProviderStatusHistory = PartnerStatusHistory;
export type ProviderListItem = PartnerListItem;
export type ProviderDetails = PartnerDetails;
export type ProvidersListResponse = PartnersListResponse;
export type ProvidersQueryParams = PartnersQueryParams;

