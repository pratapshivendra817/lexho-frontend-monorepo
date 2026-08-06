export type AdminRole = "ADMIN";

const ADMIN_TOKEN_KEY = "admin_access_token";
const ACCESS_TOKEN_KEY = "access_token";
const ADMIN_REFRESH_TOKEN_KEY = "admin_refresh_token";
const ADMIN_DEVICE_ID_KEY = "admin_device_id";
let fallbackAdminDeviceIdSequence = 0;

export function getAccessToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) ?? localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function getRefreshToken() {
  return localStorage.getItem(ADMIN_REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string) {
  localStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, token);
}

export function clearRefreshToken() {
  localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
}

export function getOrCreateAdminDeviceId() {
  const existing = localStorage.getItem(ADMIN_DEVICE_ID_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  let suffix: string;
  if (typeof globalThis.crypto?.randomUUID === "function") {
    suffix = globalThis.crypto.randomUUID();
  } else if (typeof globalThis.crypto?.getRandomValues === "function") {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(8));
    suffix = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  } else {
    fallbackAdminDeviceIdSequence += 1;
    suffix = `${Date.now()}-${fallbackAdminDeviceIdSequence}`;
  }

  const created = `admin-${suffix}`;
  localStorage.setItem(ADMIN_DEVICE_ID_KEY, created);
  return created;
}

export function clearAccessToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  clearRefreshToken();
}

export function hasAdminSession() {
  return Boolean(getAccessToken());
}

function parseTokenPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const decoded = atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readRoles(payload: Record<string, unknown>): AdminRole[] {
  const roleCandidates: string[] = [];

  const rolesField = payload.roles ?? payload.authorities;
  if (Array.isArray(rolesField)) {
    rolesField.forEach((value) => {
      if (typeof value === "string") {
        roleCandidates.push(value);
      }
    });
  }

  if (typeof payload.role === "string") {
    roleCandidates.push(payload.role);
  }

  return roleCandidates
    .map((value) => value.toUpperCase().replace(/^ROLE_/, ""))
    .filter((value): value is AdminRole => value === "ADMIN");
}

export function hasRequiredRole(allowedRoles: AdminRole[]) {
  if (allowedRoles.length === 0) {
    return true;
  }

  const token = getAccessToken();
  if (!token) {
    return false;
  }

  const payload = parseTokenPayload(token);
  if (!payload) {
    return false;
  }

  const tokenRoles = readRoles(payload);
  if (tokenRoles.length === 0) {
    return false;
  }

  return tokenRoles.some((role) => allowedRoles.includes(role));
}

