import axios from "axios";
import { API_BASE_URL } from "../constants/env";
import { extractAccessToken, extractRefreshToken } from "../utils/authSessionManager";
import { getOrCreateDeviceId } from "../utils/storage";
import { tokenStorage } from "./tokenStorage";

export type RefreshedSession = {
  accessToken: string;
  refreshToken: string;
  user: Awaited<ReturnType<typeof tokenStorage.getSession>>["user"];
};

let refreshPromise: Promise<RefreshedSession> | null = null;

async function performTokenRefresh(): Promise<RefreshedSession> {
  const session = await tokenStorage.getSession();
  const refreshToken = session.refreshToken || (await tokenStorage.getRefreshToken());

  if (!refreshToken) {
    throw new Error("Refresh token is unavailable");
  }

  const deviceId = await getOrCreateDeviceId();
  const baseUrl = String(API_BASE_URL).replace(/\/+$/, "");
  let data: any;
  try {
    const response = await axios.post(`${baseUrl}/api/v1/auth/refresh`, {
      refreshToken,
      deviceId,
    });
    data = response.data;
  } catch (primaryError: any) {
    const status = Number(primaryError?.response?.status ?? 0);
    if (status && status !== 404 && status !== 405) {
      throw primaryError;
    }
    const fallback = await axios.post(`${baseUrl}/api/auth/refresh`, {
      refreshToken,
      deviceId,
    });
    data = fallback.data;
  }
  const accessToken = extractAccessToken(data);
  const nextRefreshToken = extractRefreshToken(data, refreshToken);

  if (!accessToken) {
    throw new Error("Refresh response did not include an access token");
  }

  await tokenStorage.saveTokens(
    { accessToken, refreshToken: nextRefreshToken },
    session.user,
  );

  return { accessToken, refreshToken: nextRefreshToken, user: session.user };
}

export const authService = {
  refreshAccessToken(): Promise<RefreshedSession> {
    if (!refreshPromise) {
      refreshPromise = performTokenRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  },

  logout() {
    return tokenStorage.clear();
  },
};
