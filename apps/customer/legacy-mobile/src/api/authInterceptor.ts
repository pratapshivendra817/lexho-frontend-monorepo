import type { AxiosInstance } from "axios";
import { authService, type RefreshedSession } from "../services/authService";

type RetryableRequest = {
  _retry?: boolean;
  headers?: Record<string, unknown>;
  url?: string;
};

type AuthInterceptorOptions = {
  onSessionRefreshed?: (session: RefreshedSession) => void | Promise<void>;
  onLogout?: (error: unknown) => void | Promise<void>;
};

function isRefreshRequest(url?: string) {
  return String(url ?? "").includes("/api/auth/refresh");
}

export function installAuthRefreshInterceptor(
  client: AxiosInstance,
  options: AuthInterceptorOptions = {},
) {
  let logoutPromise: Promise<void> | null = null;

  const logoutOnce = (error: unknown) => {
    if (!logoutPromise) {
      logoutPromise = Promise.resolve(options.onLogout?.(error))
        .then(() => undefined)
        .finally(() => {
          logoutPromise = null;
        });
    }
    return logoutPromise;
  };

  return client.interceptors.response.use(
    response => response,
    async error => {
      const request = error?.config as RetryableRequest | undefined;
      const shouldRefresh =
        error?.response?.status === 401 &&
        request &&
        !request._retry &&
        !isRefreshRequest(request.url);

      if (!shouldRefresh) {
        return Promise.reject(error);
      }

      request._retry = true;

      try {
        const session = await authService.refreshAccessToken();
        await options.onSessionRefreshed?.(session);
        request.headers = request.headers ?? {};
        request.headers.Authorization = `Bearer ${session.accessToken}`;
        return client(request as any);
      } catch {
        await logoutOnce(error);
        return Promise.reject(error);
      }
    },
  );
}

