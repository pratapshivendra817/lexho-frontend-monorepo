export type CustomerReview = {
  id: string;
  bookingId: string;
  bookingLabel?: string;
  rating: number;
  comment: string;
  images: string[];
  createdAt?: string;
  reportCount?: number;
};

export type CustomerReviewPayload = {
  bookingId: string;
  rating: number;
  comment: string;
  images: File[];
};
