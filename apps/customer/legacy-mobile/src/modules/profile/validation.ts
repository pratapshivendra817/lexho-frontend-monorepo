import { z } from "zod";

const nonWhitespace = (value: string) => value.trim().length > 0;

export const profileSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .refine(nonWhitespace, "First name cannot be empty"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .refine(nonWhitespace, "Last name cannot be empty"),
  mobile: z.string().min(8).max(16),
  email: z.string().email("Please enter a valid email"),
  gender: z.enum(["MALE", "FEMALE", "OTHER", ""]),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
});

export function validateImageSize(fileSizeBytes: number, maxMb = 5) {
  return fileSizeBytes > 0 && fileSizeBytes <= maxMb * 1024 * 1024;
}

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export function validateImageMime(type?: string) {
  const normalized = String(type ?? "").trim().toLowerCase();
  return ALLOWED_IMAGE_TYPES.has(normalized);
}


