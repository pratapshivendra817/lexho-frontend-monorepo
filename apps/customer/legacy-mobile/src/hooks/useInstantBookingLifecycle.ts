import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { AppState } from "react-native";
import { useEffect, useState } from "react";
import { getBookingDetails } from "../api/bookingExtrasApi";
import { API_BASE_URL, ENABLE_BOOKING_WS } from "../constants/env";
import { getBookingMeta } from "../utils/bookingMeta";
import { tokenStorage } from "../services/tokenStorage";

const MAX_RECONNECT_DELAY_MS = 60000;

function parseStompFrames(raw: string) {
  return raw.split("\0").filter((frame) => frame.trim().length > 0).map((frame) => {
    const clean = frame.replace(/^\r?\n+/, "");
    const separator = clean.indexOf("\n\n");
    const header = separator >= 0 ? clean.slice(0, separator) : clean;
    const body = separator >= 0 ? clean.slice(separator + 2) : "";
    const lines = header.split(/\r?\n/);
    const command = (lines.shift() ?? "").trim();
    const headers: Record<string, string> = {};
    for (const line of lines) {
      const colon = line.indexOf(":");
      if (colon > 0) headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
    }
    return { command, headers, body };
  });
}

export function useInstantBookingLifecycle(bookingId: string) {
  const [isForeground, setIsForeground] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      setIsForeground(next === "active");
      if (next === "active" && bookingId) {
        void queryClient.invalidateQueries({ queryKey: ["instant-booking-status", bookingId] });
      }
    });
    return () => sub.remove();
  }, [bookingId, queryClient]);

  useEffect(() => {
    if (!ENABLE_BOOKING_WS || !bookingId) return;
    const wsUrl = `${String(API_BASE_URL).replace(/^http/i, "ws").replace(/\/+$/, "")}/ws/customer/bookings`;
    let closed = false;
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 4000;
    let subscribed = false;

    const connect = async () => {
      if (closed) return;
      let token: string | null;
      try {
        token = await tokenStorage.getAccessToken();
      } catch {
        if (!closed) {
          console.warn("Unable to retrieve booking realtime credentials; retrying");
          retryTimer = setTimeout(connect, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
        }
        return;
      }
      if (!token || closed) {
        retryTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
        return;
      }
      try {
        socket = new WebSocket(wsUrl);
      } catch {
        retryTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
        return;
      }
      socket.onopen = () => {
        socket?.send(`CONNECT\naccept-version:1.2\nheart-beat:10000,10000\nAuthorization:Bearer ${token}\n\n\0`);
      };
      socket.onclose = () => {
        subscribed = false;
        setWsConnected(false);
        if (!closed) {
          retryTimer = setTimeout(connect, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
        }
      };
      socket.onerror = () => {
        subscribed = false;
        setWsConnected(false);
      };
      socket.onmessage = (event) => {
        for (const frame of parseStompFrames(String(event.data ?? ""))) {
          if (frame.command === "CONNECTED") {
            reconnectDelay = 4000;
            socket?.send(`SUBSCRIBE\nid:booking-${bookingId}\ndestination:/topic/customer/bookings/${bookingId}\nack:auto\n\n\0`);
            subscribed = true;
            setWsConnected(true);
            continue;
          }
          if (frame.command !== "MESSAGE" || !subscribed) continue;
          try {
            const payload = JSON.parse(frame.body);
            const root = payload?.data && typeof payload.data === "object" ? payload.data : payload;
            const payloadId = String(root?.id ?? root?.bookingId ?? "");
            if (payloadId === bookingId) {
              void queryClient.invalidateQueries({ queryKey: ["instant-booking-status", bookingId] });
            }
          } catch {
            void queryClient.invalidateQueries({ queryKey: ["instant-booking-status", bookingId] });
          }
        }
      };
    };

    connect();
    return () => {
      closed = true;
      subscribed = false;
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
      const data = query.state.data as any;
      const meta = getBookingMeta(data);
      const seconds = Number(meta.trackingRefreshSeconds);
      if (Number.isFinite(seconds)) {
        return seconds > 0 ? seconds * 1000 : 6000;
      }
      return 6000;
    },
    refetchOnWindowFocus: true,
  });

  return { ...query, wsConnected };
}
