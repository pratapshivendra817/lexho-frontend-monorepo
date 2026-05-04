export type ProviderStatus = "PENDING" | "APPROVED" | "REJECTED" | "BLOCKED";
export type ProviderServiceType = "COOK" | "CLEANING" | "";

export type ProviderStats = {
  pending: number;
  approved: number;
  rejected: number;
  blocked: number;
};

export type ProviderDocument = {
  id: string;
  name: string;
  documentType: string;
  contentType: string;
  previewUrl?: string;
  uploadedAt?: string;
};

export type ProviderStatusHistory = {
  status: ProviderStatus;
  reason?: string;
  changedAt?: string;
  changedBy?: string;
};

export type ProviderListItem = {
  id: string;
  name: string;
  phone: string;
  serviceType: string;
  city: string;
  appliedDate: string;
  status: ProviderStatus;
};

export type ProviderDetails = ProviderListItem & {
  email?: string;
  gender?: string;
  dob?: string;
  state?: string;
  address?: string;
  experience?: string;
  availabilityType?: string;
  serviceAreas?: string[];
  workingDays?: string[];
  startTime?: string;
  endTime?: string;
  accountNumber?: string;
  ifscCode?: string;
  documents: ProviderDocument[];
  statusHistory: ProviderStatusHistory[];
};

export type ProvidersListResponse = {
  content: ProviderListItem[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
};

export type ProvidersQueryParams = {
  page: number;
  size: number;
  status?: ProviderStatus | "";
  serviceType?: ProviderServiceType;
  city?: string;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};
