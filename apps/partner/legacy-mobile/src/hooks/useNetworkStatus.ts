import { useEffect, useState } from "react";
import { NativeModules } from "react-native";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!NativeModules?.RNCNetInfo) {
      setIsOnline(true);
      return () => undefined;
    }

    try {
      const netInfo = require("@react-native-community/netinfo");
      const unsubscribe = netInfo.addEventListener((state: any) => {
        const next = Boolean(state?.isConnected) && Boolean(state?.isInternetReachable ?? true);
        setIsOnline(next);
      });
      return () => unsubscribe?.();
    } catch {
      // NetInfo not installed yet; default to online.
      setIsOnline(true);
      return () => undefined;
    }
  }, []);

  return isOnline;
}
