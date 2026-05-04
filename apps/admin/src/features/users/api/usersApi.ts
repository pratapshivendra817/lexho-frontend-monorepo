import { api } from "@/api/axios";

import type {
  AdminUser,
  UserUpsertPayload,
  UsersListResponse,
  UsersQueryParams,
  UserRole,
  UserStatus,
} from "../types";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const asString = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const normalizeRole = (value: unknown): UserRole => {
  const role = asString(value).toUpperCase();
  if (role === "ADMIN") return "ADMIN";
  if (role === "PROVIDER") return "PROVIDER";
  return "CUSTOMER";
};

const normalizeStatus = (value: unknown, blocked: boolean): UserStatus => {
  const status = asString(value).toUpperCase();
  if (status === "DELETED") return "DELETED";
  if (status === "INACTIVE") return "INACTIVE";
  if (status === "BLOCKED" || blocked) return "BLOCKED";
  return "ACTIVE";
};

const readArray = (payload: unknown): UnknownRecord[] => {
  if (Array.isArray(payload)) {
    return payload as UnknownRecord[];
  }

  const root = asRecord(payload);
  const keys = ["content", "data", "items", "users", "results"];
  for (const key of keys) {
    const value = root[key];
    if (Array.isArray(value)) {
      return value as UnknownRecord[];
    }
  }

  const nested = asRecord(root.data);
  if (Array.isArray(nested.content)) {
    return nested.content as UnknownRecord[];
  }

  return [];
};

const readPaginationMeta = (payload: unknown, itemCount: number, pageFallback: number) => {
  const root = asRecord(payload);
  const nested = asRecord(root.data);

  const totalElements = asNumber(
    root.totalElements ?? nested.totalElements ?? root.total ?? nested.total,
    itemCount,
  );
  const totalPages = asNumber(root.totalPages ?? nested.totalPages, Math.max(1, Math.ceil(totalElements / 10)));
  const pageNumber = asNumber(root.pageNumber ?? nested.pageNumber ?? root.page ?? nested.page, pageFallback);

  return {
    totalElements,
    totalPages: Math.max(1, totalPages),
    pageNumber,
  };
};

const toUser = (row: UnknownRecord): AdminUser => {
  const profile = asRecord(row.profile);
  const address = asRecord(row.address);
  const blocked = Boolean(row.blocked ?? row.isBlocked ?? row.block);
  const role = normalizeRole(row.role ?? profile.role);
  const status = normalizeStatus(row.status ?? profile.status, blocked);

  return {
    id: asString(row.id ?? row.userId),
    name: asString(row.name ?? row.fullName ?? profile.name),
    email: asString(row.email ?? profile.email),
    phone: asString(row.phone ?? row.mobile ?? profile.phone),
    role,
    status,
    city: asString(row.city ?? address.city ?? profile.city),
    blocked: status === "BLOCKED",
    createdAt: asString(row.createdAt ?? row.created_on),
    updatedAt: asString(row.updatedAt ?? row.updated_on),
  };
};

const toBackendUserPayload = (payload: UserUpsertPayload) => {
  const isBlocked = payload.status === "BLOCKED";
  const isActive = payload.status === "ACTIVE";

  return {
    name: payload.name,
    fullName: payload.name,
    email: payload.email,
    phone: payload.phone,
    mobile: payload.phone,
    role: payload.role,
    city: payload.city,
    status: payload.status,
    isBlocked,
    blocked: isBlocked,
    active: isActive,
  };
};

export async function getUsers(params: UsersQueryParams): Promise<UsersListResponse> {
  const query = {
    page: params.page,
    limit: params.limit,
    size: params.limit,
    search: params.search || undefined,
    role: params.role || undefined,
    status: params.status || undefined,
    city: params.city || undefined,
  };

  const { data } = await api.get("/api/admin/users", { params: query });
  const content = readArray(data).map(toUser);
  const meta = readPaginationMeta(data, content.length, params.page);

  return {
    content,
    totalElements: meta.totalElements,
    totalPages: meta.totalPages,
    pageNumber: meta.pageNumber,
  };
}

export async function getUserById(id: string): Promise<AdminUser | null> {
  const { data } = await api.get(`/api/admin/users/${id}`);
  const root = asRecord(data);
  const nested = asRecord(root.data);
  const candidate =
    (nested && Object.keys(nested).length > 0 ? nested : null) ??
    (root && Object.keys(root).length > 0 ? root : null);

  if (!candidate) {
    return null;
  }

  return toUser(candidate);
}

export async function createUser(payload: UserUpsertPayload) {
  await api.post("/api/admin/users", toBackendUserPayload(payload));
}

export async function updateUser(id: string, payload: UserUpsertPayload) {
  await api.put(`/api/admin/users/${id}`, toBackendUserPayload(payload));
}

export async function blockUser(id: string) {
  await api.put(`/api/admin/users/${id}/block`);
}

export async function unblockUser(id: string) {
  await api.put(`/api/admin/users/${id}/unblock`);
}

export async function deleteUser(id: string) {
  await api.delete(`/api/admin/users/${id}`);
}

