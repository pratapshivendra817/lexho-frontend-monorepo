export type AdminReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";

export type AdminReview = {
  id: string;
  bookingId?: string;
  customerId?: string;
  partnerId?: string;
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
};

export type AdminReviewsQueryParams = {
  page: number;
  size: number;
  rating?: number;
  status?: AdminReviewStatus | "";
  partner?: string;
  customer?: string;
  service?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
};

export type AdminReviewsListResponse = {
  content: AdminReview[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
};

export type AdminReviewsStats = {
  totalReviews: number;
  averageRating: number;
  hiddenReviews: number;
  reportedReviews: number;
  partnerWiseRatings: Array<{ name: string; value: number }>;
  serviceWiseRatings: Array<{ name: string; value: number }>;
};


