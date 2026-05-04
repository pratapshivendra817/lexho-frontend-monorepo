import { useEffect } from "react";
import { useAppDispatch } from "../redux/hooks";
import { setHydrated, setSession } from "../redux/authSlice";
import { loadSession } from "../utils/storage";
import { DEV_BYPASS_SESSION, DEV_LOGIN_BYPASS } from "../constants/env";

export function useAuthBootstrap() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (DEV_LOGIN_BYPASS && __DEV__ && DEV_BYPASS_SESSION.token) {
          if (!active) return;
          dispatch(setSession({
            token: DEV_BYPASS_SESSION.token,
            refreshToken: DEV_BYPASS_SESSION.refreshToken,
            user: DEV_BYPASS_SESSION.user,
          }));
          return;
        }

        const session = await loadSession();
        if (!active) return;
        if (session.token) {
          dispatch(setSession({ token: session.token, refreshToken: session.refreshToken, user: session.user ?? undefined }));
        }
      } catch (error) {
        // Keep app boot resilient even if local storage is unavailable.
      } finally {
        if (active) {
          dispatch(setHydrated(true));
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [dispatch]);
}
