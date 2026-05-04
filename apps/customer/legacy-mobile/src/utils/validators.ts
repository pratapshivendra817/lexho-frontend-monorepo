import { z } from "zod";

export const mobileSchema = z.object({
  mobile: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Enter a valid 10-digit mobile number"),
});

export const otpSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{4,6}$/, "Enter a valid OTP"),
});

export const addressSchema = z.object({
  address: z.string().trim().min(10, "Please enter full address"),
});

export const reviewSchema = z.object({
  rating: z.number().min(1, "Rating is required").max(5),
  comment: z.string().trim().min(3, "Please add a short review"),
  imageUrl: z.string().url("Invalid image URL").optional().or(z.literal("")),
});

export type MobileFormValues = z.infer<typeof mobileSchema>;
export type OtpFormValues = z.infer<typeof otpSchema>;
export type AddressFormValues = z.infer<typeof addressSchema>;
export type ReviewFormValues = z.infer<typeof reviewSchema>;

