export type UserRole = "CUSTOMER" | "PROVIDER" | "ADMIN";

export type UserStatus = "ACTIVE" | "BLOCKED" | "INACTIVE" | "DELETED";

export type UsersQueryParams = {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole | "";
  status?: UserStatus | "";
  city?: string;
};

export type UserUpsertPayload = {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  city: string;
  status: Exclude<UserStatus, "DELETED">;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  city: string;
  blocked: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type UsersListResponse = {
  content: AdminUser[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
};

