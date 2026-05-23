import { z } from "zod";

import type { UserStatus } from "./types";

const userRoleSchema = z.enum(["CUSTOMER", "PARTNER", "ADMIN"]);
const userStatusSchema = z.enum(["ACTIVE", "BLOCKED", "INACTIVE"] satisfies [
  Exclude<UserStatus, "DELETED">,
  ...Exclude<UserStatus, "DELETED">[],
]);

export const userFormSchema = z.object({
  name: z.string().trim().min(2, "Name should be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(8, "Phone should be at least 8 digits"),
  role: userRoleSchema,
  city: z.string().trim().min(2, "City is required"),
  status: userStatusSchema,
});

export type UserFormValues = z.infer<typeof userFormSchema>;



