export type AdminReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
export type AdminReviewReportStatus = "OPEN" | "DISMISSED" | "ACTION_TAKEN";
export type AdminReviewSortDir = "asc" | "desc";

export type AdminReview = {
  id: string;
  bookingId?: string;
  customerId?: string;
  partnerId?: string;
  providerId?: string;
  serviceId?: string;
  customerName: string;
  partnerName: string;
  serviceName: string;
  rating: number;
  comment: string;
  reviewText?: string;
  images: string[];
  status: AdminReviewStatus;
  reportCount: number;
  reportReason?: string;
  moderationReason?: string;
  requestId?: string;
  correlationId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminReviewReport = {
  id: string;
  reviewId?: string;
  status: AdminReviewReportStatus;
  reason?: string;
  reportedByCustomerId?: string;
  reportedByCustomerName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminReviewModerationEntry = {
  id: string;
  action: string;
  reason?: string;
  actorName?: string;
  actorId?: string;
  createdAt?: string;
};

export type AdminReviewDetail = {
  review: AdminReview | null;
  booking: Record<string, unknown> | null;
  customer: Record<string, unknown> | null;
  partner: Record<string, unknown> | null;
  service: Record<string, unknown> | null;
  reports: AdminReviewReport[];
  moderationHistory: AdminReviewModerationEntry[];
};

export type AdminReviewsQueryParams = {
  page: number;
  size: number;
  sortBy?: string;
  sortDir?: AdminReviewSortDir;
  rating?: number;
  status?: AdminReviewStatus | "";
  providerId?: string;
  serviceId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  reported?: boolean | "";
};

export type AdminReportedReviewsQueryParams = {
  page: number;
  size: number;
  status?: AdminReviewReportStatus | "";
};

export type AdminReviewsListResponse = {
  content: AdminReview[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
};

export type AdminReportedReviewRow = {
  reportId: string;
  reportStatus: AdminReviewReportStatus;
  review: AdminReview;
  reportReason?: string;
  reportedByCustomerName?: string;
  createdAt?: string;
};

export type AdminReportedReviewsListResponse = {
  content: AdminReportedReviewRow[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
};

export type AdminReviewsStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  hidden: number;
  reported: number;
  averageRating: number;
  ratingDistribution: Array<{ rating: number; count: number }>;
};

export type AdminReviewSettingsServiceRow = {
  serviceId: number;
  reviewEnabled: boolean;
};

export type AdminReviewSettings = {
  reviewsEnabled: boolean;
  ratingEnabled: boolean;
  writtenReviewsEnabled: boolean;
  autoApproveReviews: boolean;
  services: AdminReviewSettingsServiceRow[];
};
