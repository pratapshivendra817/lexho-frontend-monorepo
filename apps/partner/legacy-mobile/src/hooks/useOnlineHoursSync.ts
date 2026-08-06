import { useEffect } from "react";

import { useAppSelector } from "./useRedux";
import { attachOnlineHoursLifecycle, beginOnlineSession, endOnlineSession, syncOnlineHoursToBackend } from "../services/onlineHoursService";

export function useOnlineHoursSync() {
  const online = useAppSelector((state) => state.partner.online);

  useEffect(() => {
    if (online) {
      void beginOnlineSession().catch(() => null);
    } else {
      void endOnlineSession()
        .then(() => syncOnlineHoursToBackend())
        .catch(() => null);
    }
  }, [online]);

  useEffect(() => {
    const unsubscribe = attachOnlineHoursLifecycle(() => online);
    return unsubscribe;
  }, [online]);
}
