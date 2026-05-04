export type AdminRole = "ADMIN";

const ADMIN_TOKEN_KEY = "admin_access_token";
const ACCESS_TOKEN_KEY = "access_token";

export function getAccessToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) ?? localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAccessToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
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
