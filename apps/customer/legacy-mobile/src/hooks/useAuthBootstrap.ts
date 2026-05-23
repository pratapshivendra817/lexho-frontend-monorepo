import { useEffect } from "react";
import axios from "axios";
import { useAppDispatch } from "../redux/hooks";
import { setHydrated, setSession } from "../redux/authSlice";
import { getRefreshToken, getToken, loadSession } from "../utils/storage";
import { DEV_BYPASS_SESSION, DEV_LOGIN_BYPASS } from "../constants/env";
import { tryRefreshSessionWithAxios } from "../utils/authSessionManager";

function decodeJwtExpMs(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    let json = "";
    const atobFn = (globalThis as any)?.atob;
    if (typeof atobFn === "function") {
      json = atobFn(padded);
    } else if (typeof (globalThis as any)?.Buffer !== "undefined") {
      json = (globalThis as any).Buffer.from(padded, "base64").toString("utf8");
    } else {
      return null;
    }
    const parsed = JSON.parse(json);
    const exp = Number(parsed?.exp ?? 0);
    if (!Number.isFinite(exp) || exp <= 0) return null;
    return exp * 1000;
  } catch {
    return null;
  }
}

export function useAuthBootstrap() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log("[auth:bootstrap:start]");
        }
        if (DEV_LOGIN_BYPASS && __DEV__ && DEV_BYPASS_SESSION.token) {
          if (!active) return;
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log("[auth:bootstrap:dev-bypass]");
          }
          dispatch(setSession({
            token: DEV_BYPASS_SESSION.token,
            refreshToken: DEV_BYPASS_SESSION.refreshToken,
            user: DEV_BYPASS_SESSION.user,
          }));
          return;
        }

        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log("[auth:bootstrap:loadSession:attempt]");
        }
        const session = await loadSession();
        if (!active) return;
        const fallbackToken = String((await getToken()) ?? "").trim();
        const fallbackRefreshToken = String((await getRefreshToken()) ?? "").trim();
        const token = String(session.token ?? fallbackToken ?? "").trim();
        const refreshToken = String(session.refreshToken ?? fallbackRefreshToken ?? "").trim();
        const tokenExpMs = token ? decodeJwtExpMs(token) : null;
        const isTokenExpired = tokenExpMs !== null && tokenExpMs <= Date.now();
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log("[auth:bootstrap:loaded]", {
            hasToken: !!token,
            hasRefreshToken: !!refreshToken,
            isTokenExpired,
            sessionTokenPresent: !!session.token,
            fallbackTokenPresent: !!fallbackToken,
            sessionRefreshPresent: !!session.refreshToken,
            fallbackRefreshPresent: !!fallbackRefreshToken,
          });
        }

        // Keep token in app state even if locally-decoded exp looks stale.
        // Server/interceptor is source of truth and can refresh on live 401.
        if (token && (!isTokenExpired || !refreshToken)) {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log("[auth:bootstrap:restore-token]");
          }
          dispatch(setSession({ token, refreshToken: refreshToken || null, user: session.user ?? undefined }));
          return;
        }

        if (refreshToken) {
          try {
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.log("[auth:bootstrap:refresh:attempt]");
            }
            const result = await tryRefreshSessionWithAxios(axios);
            if (result.ok) {
              if (!active) return;
              if (__DEV__) {
                // eslint-disable-next-line no-console
                console.log("[auth:bootstrap:refresh:success]");
              }
              dispatch(setSession({ token: result.token, refreshToken: result.refreshToken, user: result.user ?? undefined }));
              return;
            }
          } catch {
            // Keep existing persisted session on transient refresh/network failures.
            if (token) {
              if (__DEV__) {
                // eslint-disable-next-line no-console
                console.log("[auth:bootstrap:refresh:failed-fallback-token]");
              }
              dispatch(setSession({ token, refreshToken: refreshToken || null, user: session.user ?? undefined }));
              return;
            }
          }
        }
      } catch (error: any) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log("[auth:bootstrap:error]", {
            message: String(error?.message ?? "unknown"),
          });
        }
      } finally {
        if (active) {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log("[auth:bootstrap:hydrated:true]");
          }
          dispatch(setHydrated(true));
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [dispatch]);
}
