export type UserRole = "PARTNER" | "ADMIN" | "CUSTOMER";

export interface AuthSession {
  token: string;
  userId: string | null;
  role: UserRole;
  user: Record<string, unknown> | null;
}
