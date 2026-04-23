// src/data/reviews.ts
import type { Review } from "../types/review";

export const reviewsData: Review[] = [
  {
    id: "1",
    user: "Rahul Sharma",
    provider: "Amit Electrician",
    service: "AC Repair",
    rating: 5,
    comment: "Excellent service!",
  },
  {
    id: "2",
    user: "Priya Singh",
    provider: "Ravi Cleaner",
    service: "Home Cleaning",
    rating: 3,
    comment: "Average experience",
  },
  {
    id: "3",
    user: "Ankit Verma",
    provider: "Suresh Plumber",
    service: "Plumbing",
    rating: 4,
    comment: "Good work",
  },
];