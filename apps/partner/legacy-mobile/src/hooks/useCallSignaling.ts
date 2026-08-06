import { useEffect } from "react";
import { useAppDispatch } from "./useRedux";
import { receiveCallSignal } from "../redux/slices/callSlice";
import { callSignaling } from "../services/callSignaling";
import { webrtcCallService } from "../services/webrtcCallService";

export function useCallSignaling(enabled: boolean, onIncomingOffer?: (signal: { callId: string; orderId: number; customerName?: string }) => void) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!enabled) {
      callSignaling.disconnect();
      webrtcCallService.end();
      return;
    }
    const remove = callSignaling.addListener(signal => {
      if (signal.type === "OFFER") onIncomingOffer?.(signal);
      dispatch(receiveCallSignal(signal));
      webrtcCallService.applySignal(signal).catch(() => undefined);
      if (["ENDED", "REJECTED"].includes(signal.type)) webrtcCallService.end();
    });
    callSignaling.connect().catch(() => undefined);
    return () => {
      remove();
      callSignaling.disconnect();
      webrtcCallService.end();
    };
  }, [dispatch, enabled, onIncomingOffer]);
}
