// src/types/review.ts
export interface Review {
  id: string;
  user: string;
  provider: string;
  service: string;
  rating: number;
  comment: string;
}