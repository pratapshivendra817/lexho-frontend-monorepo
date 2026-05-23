import { z } from "zod";

export const updateBookingSchema = z.object({
  bookingDate: z.string().min(1, "Booking date is required"),
  bookingTime: z.string().min(1, "Booking time is required"),
  partnerId: z.number().int().positive("Partner id should be positive"),
  amount: z.number().positive("Amount should be positive"),
  notes: z.string().max(500, "Notes should be within 500 characters").optional(),
});

export type UpdateBookingFormValues = z.infer<typeof updateBookingSchema>;


