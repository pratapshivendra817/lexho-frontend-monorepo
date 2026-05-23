import { clearSession, getOrCreateDeviceId, getRefreshToken, loadSession, saveSession } from "./storage";
import { API_BASE_URL, DEV_LOGIN_BYPASS } from "../constants/env";

type AnyObj = Record<string, any>;

function mask(value?: string | null) {
  const text = String(value ?? "").trim();
  if (!text) return "<empty>";
  if (text.length <= 12) return `${text.slice(0, 3)}...${text.slice(-2)}`;
  return `${text.slice(0, 6)}...${text.slice(-6)}`;
}

function debugLog(event: string, payload: Record<string, unknown>) {
  if (!__DEV__) return;
  // eslint-disable-next-line no-console
  console.log(`[auth:manager:${event}]`, payload);
}

export function extractAccessToken(payload: unknown): string {
  const root = (payload ?? {}) as AnyObj;
  const token = root?.accessToken ?? root?.token ?? root?.data?.accessToken ?? root?.data?.token ?? "";
  const value = typeof token === "string" ? token.trim() : "";
  debugLog("extractAccessToken", {
    hasRootToken: !!root?.token,
    hasRootAccessToken: !!root?.accessToken,
    hasDataToken: !!root?.data?.token,
    hasDataAccessToken: !!root?.data?.accessToken,
    extracted: mask(value),
  });
  return value;
}

export function extractRefreshToken(payload: unknown, fallback?: string | null): string {
  const root = (payload ?? {}) as AnyObj;
  const token = root?.refreshToken ?? root?.data?.refreshToken ?? fallback ?? "";
  const value = typeof token === "string" ? token.trim() : "";
  debugLog("extractRefreshToken", {
    hasRootRefreshToken: !!root?.refreshToken,
    hasDataRefreshToken: !!root?.data?.refreshToken,
    fallbackUsed: !root?.refreshToken && !root?.data?.refreshToken,
    extracted: mask(value),
  });
  return value;
}

export async function tryRefreshSessionWithAxios(axiosClient: any) {
  const session = await loadSession();
  const currentRefreshToken = session.refreshToken || (await getRefreshToken());
  debugLog("refresh:start", {
    hasSessionToken: !!session.token,
    hasSessionRefreshToken: !!session.refreshToken,
    currentRefreshToken: mask(currentRefreshToken),
  });
  if (!currentRefreshToken) {
    debugLog("refresh:skip", { reason: "NO_REFRESH_TOKEN" });
    return { ok: false as const, reason: "NO_REFRESH_TOKEN" };
  }

  const deviceId = await getOrCreateDeviceId();
  const { data } = await axiosClient.post(`${String(API_BASE_URL).replace(/\/+$/, "")}/api/auth/refresh`, {
    refreshToken: currentRefreshToken,
    deviceId,
  });
  debugLog("refresh:response", {
    topLevelKeys: data && typeof data === "object" ? Object.keys(data as AnyObj) : [],
    hasData: !!(data as AnyObj)?.data,
  });
  const nextAccessToken = extractAccessToken(data);
  const nextRefreshToken = extractRefreshToken(data, currentRefreshToken);
  if (!nextAccessToken) {
    debugLog("refresh:failed", { reason: "MISSING_ACCESS_TOKEN", refreshToken: mask(nextRefreshToken) });
    return { ok: false as const, reason: "MISSING_ACCESS_TOKEN", raw: data };
  }
  await saveSession(nextAccessToken, nextRefreshToken, session.user ?? undefined);
  debugLog("refresh:done", {
    accessToken: mask(nextAccessToken),
    refreshToken: mask(nextRefreshToken),
  });
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
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log("[auth:session:clear]", {
      reason,
      source: context?.source ?? "unknown",
      status: context?.status ?? null,
      endpoint: context?.endpoint ?? null,
      message: context?.message ?? null,
      at: new Date().toISOString(),
    });
  }
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
