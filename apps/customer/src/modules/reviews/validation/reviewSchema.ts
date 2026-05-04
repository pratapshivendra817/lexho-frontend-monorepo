import { z } from "zod";

export const customerReviewSchema = z.object({
  bookingId: z.string().min(1, "Booking selection is required"),
  rating: z.number().min(1, "Rating is required").max(5),
  comment: z.string().min(5, "Comment should be at least 5 characters"),
});

export type CustomerReviewFormValues = z.infer<typeof customerReviewSchema>;
