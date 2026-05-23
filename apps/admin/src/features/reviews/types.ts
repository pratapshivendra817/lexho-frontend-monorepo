export type AdminReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";

export type AdminReview = {
  id: string;
  customerName: string;
  partnerName: string;
  serviceName: string;
  rating: number;
  comment: string;
  images: string[];
  status: AdminReviewStatus;
  reportCount: number;
  reportReason?: string;
  createdAt?: string;
};

export type AdminReviewsQueryParams = {
  page: number;
  size: number;
  rating?: number;
  status?: AdminReviewStatus | "";
  partner?: string;
  service?: string;
  search?: string;
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


