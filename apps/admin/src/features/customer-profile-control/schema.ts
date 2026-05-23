import { z } from "zod";

export const customerProfileEditSchema = z.object({
  profileEditLocked: z.boolean(),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  profileImageApproved: z.boolean(),
  adminNotes: z.string().trim().max(500, "Notes can be up to 500 chars"),
});

export const profileContentSchema = z.object({
  aboutUs: z.string().trim().min(10, "About us should be descriptive"),
  termsOfService: z.string().trim().min(10, "Terms are required"),
  privacyPolicy: z.string().trim().min(10, "Privacy policy is required"),
});
