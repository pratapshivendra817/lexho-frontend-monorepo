import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { AppState } from "react-native";
import { useEffect, useState } from "react";
import { getBookingDetails } from "../api/bookingExtrasApi";
import { API_BASE_URL, ENABLE_BOOKING_WS } from "../constants/env";
import { getBookingMeta } from "../utils/bookingMeta";

export function useInstantBookingLifecycle(bookingId: string) {
  const [isForeground, setIsForeground] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      setIsForeground(next === "active");
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!ENABLE_BOOKING_WS || !bookingId) return;
    const wsUrl = `${String(API_BASE_URL).replace(/^http/, "ws").replace(/\/+$/, "")}/ws/customer/bookings/${bookingId}`;
    let closed = false;
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      try {
        socket = new WebSocket(wsUrl);
      } catch {
        retryTimer = setTimeout(connect, 4000);
        return;
      }
      socket.onopen = () => {
        setWsConnected(true);
      };
      socket.onclose = () => {
        setWsConnected(false);
        if (!closed) retryTimer = setTimeout(connect, 4000);
      };
      socket.onerror = () => {
        setWsConnected(false);
      };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data ?? "{}"));
          const root = payload?.data && typeof payload.data === "object" ? payload.data : payload;
          const payloadId = String(root?.id ?? root?.bookingId ?? "");
          if (payloadId !== bookingId) {
            return;
          }
          queryClient.setQueryData(["instant-booking-status", bookingId], (prev: any) => ({ ...(prev ?? {}), ...root }));
        } catch {
          // ignore malformed frames
        }
      };
    };

    connect();
    return () => {
      closed = true;
      setWsConnected(false);
      if (retryTimer) clearTimeout(retryTimer);
      try {
        socket?.close();
      } catch {
        // noop
      }
    };
  }, [bookingId, queryClient]);

  const query = useQuery({
    queryKey: ["instant-booking-status", bookingId],
    queryFn: () => getBookingDetails(bookingId),
    enabled: bookingId.length > 0,
    refetchInterval: (query) => {
      if (!isForeground) return false;
      if (ENABLE_BOOKING_WS && wsConnected) return false;
      const data = query.state.data as any;
      const meta = getBookingMeta(data);
      const seconds = Number(meta.trackingRefreshSeconds);
      if (Number.isFinite(seconds)) {
        return seconds > 0 ? seconds * 1000 : false;
      }
      return false;
    },
    refetchOnWindowFocus: true,
  });

  return { ...query, wsConnected };
}
