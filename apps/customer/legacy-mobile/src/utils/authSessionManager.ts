import { clearSession, getOrCreateDeviceId, getRefreshToken, loadSession, saveSession } from "./storage";
import { API_BASE_URL, DEV_LOGIN_BYPASS } from "../constants/env";

type AnyObj = Record<string, any>;

function normalizeTokenValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getAuthPayloadCandidates(payload: unknown): AnyObj[] {
  const root = ((payload ?? {}) as AnyObj);
  const queue: AnyObj[] = [root];
  const nestedKeys = ["data", "result", "payload", "tokens", "session"];

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const key of nestedKeys) {
      const candidate = current?.[key];
      if (candidate && typeof candidate === "object" && !queue.includes(candidate)) {
        queue.push(candidate as AnyObj);
      }
    }
  }

  return queue;
}

export function extractAccessToken(payload: unknown): string {
  for (const candidate of getAuthPayloadCandidates(payload)) {
    for (const key of ["accessToken", "token", "jwt", "jwtToken", "authToken"] as const) {
      if (!(key in candidate)) continue;
      return normalizeTokenValue(candidate[key]);
    }
  }
  return "";
}

export function extractRefreshToken(payload: unknown, fallback?: string | null): string {
  for (const candidate of getAuthPayloadCandidates(payload)) {
    if (!("refreshToken" in candidate)) continue;
    return normalizeTokenValue(candidate.refreshToken);
  }
  return normalizeTokenValue(fallback ?? "");
}

export async function tryRefreshSessionWithAxios(axiosClient: any) {
  const session = await loadSession();
  const currentRefreshToken = session.refreshToken || (await getRefreshToken());
  if (!currentRefreshToken) {
    return { ok: false as const, reason: "NO_REFRESH_TOKEN" };
  }

  const deviceId = await getOrCreateDeviceId();
  const { data } = await axiosClient.post(`${String(API_BASE_URL).replace(/\/+$/, "")}/api/auth/refresh`, {
    refreshToken: currentRefreshToken,
    deviceId,
  });
  const nextAccessToken = extractAccessToken(data);
  const nextRefreshToken = extractRefreshToken(data, currentRefreshToken);
  if (!nextAccessToken) {
    return { ok: false as const, reason: "MISSING_ACCESS_TOKEN", raw: data };
  }
  await saveSession(nextAccessToken, nextRefreshToken, session.user ?? undefined);
  return {
    ok: true as const,
    token: nextAccessToken,
    refreshToken: nextRefreshToken,
    user: session.user ?? undefined,
  };
}

export async function clearSessionWithReason(
  reason: string,
  dispatch?: (action: any) => void,
  clearAction?: any,
  context?: { source?: string; status?: number; endpoint?: string; message?: string },
) {
  if (!(DEV_LOGIN_BYPASS && __DEV__)) {
    try {
      await clearSession();
    } catch {
      // no-op
    }
  }
  if (dispatch && clearAction) {
    dispatch(clearAction());
  }
}
