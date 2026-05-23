import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { AppState } from "react-native";
import { useEffect, useState } from "react";
import { getBookingDetails } from "../api/bookingExtrasApi";
import { API_BASE_URL, ENABLE_BOOKING_WS } from "../constants/env";

function isTerminalState(status?: string) {
  const value = String(status ?? "").toUpperCase();
  return value === "INSTANT_FAILED" || value === "COMPLETED" || value === "CANCELLED" || value === "EXPIRED" || value === "PAYMENT_FAILED";
}

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
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log("[booking:ws:connect]", { bookingId, wsUrl });
      }
      try {
        socket = new WebSocket(wsUrl);
      } catch {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log("[booking:ws:connect:failed]", { bookingId, wsUrl });
        }
        retryTimer = setTimeout(connect, 4000);
        return;
      }
      socket.onopen = () => {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log("[booking:ws:open]", { bookingId });
        }
        setWsConnected(true);
      };
      socket.onclose = () => {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log("[booking:ws:close]", { bookingId });
        }
        setWsConnected(false);
        if (!closed) retryTimer = setTimeout(connect, 4000);
      };
      socket.onerror = () => {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log("[booking:ws:error]", { bookingId });
        }
        setWsConnected(false);
      };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data ?? "{}"));
          const root = payload?.data && typeof payload.data === "object" ? payload.data : payload;
          const payloadId = String(root?.id ?? root?.bookingId ?? "");
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log("[booking:ws:message]", {
              bookingId,
              payloadId,
              status: String(root?.status ?? ""),
              assignmentStatus: String(root?.assignmentStatus ?? root?.dispatchStatus ?? ""),
            });
          }
          if (payloadId !== bookingId) {
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.log("[booking:ws:skip:id-mismatch]", { bookingId, payloadId });
            }
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
      const assignment = String((query.state.data as any)?.assignmentStatus ?? "SEARCHING_PARTNER").toUpperCase();
      return isTerminalState(assignment) ? false : 5000;
    },
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!__DEV__) return;
    const details = query.data as any;
    if (!details) return;
    // eslint-disable-next-line no-console
    console.log("[booking:lifecycle:data]", {
      bookingId,
      id: String(details?.id ?? ""),
      bookingType: String(details?.bookingType ?? ""),
      status: String(details?.status ?? ""),
      assignmentStatus: String(details?.assignmentStatus ?? ""),
      wsConnected,
    });
  }, [bookingId, query.data, wsConnected]);

  return { ...query, wsConnected };
}
