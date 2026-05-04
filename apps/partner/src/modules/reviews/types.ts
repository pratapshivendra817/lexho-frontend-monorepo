export type ProviderReview = {
  id: string;
  customerName: string;
  serviceName: string;
  rating: number;
  comment: string;
  createdAt?: string;
};

export type ProviderReviewsResponse = {
  content: ProviderReview[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
};
