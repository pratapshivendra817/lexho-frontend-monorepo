import { useEffect, useState } from "react";

import { detectDeviceSecurityStatus, type DeviceSecurityStatus } from "../services/security/rootDetectionService";

export function useSecurityGuard() {
  const [status, setStatus] = useState<DeviceSecurityStatus | null>(null);

  useEffect(() => {
    detectDeviceSecurityStatus().then(setStatus).catch(() => setStatus({
      rooted: false,
      emulator: false,
      developerMode: false,
      blocked: false,
    }));
  }, []);

  return status;
}

