import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";

import { appConfig } from "@/config";
import { getAccessToken } from "@/utils/authSession";

import type { AdminBookingEtaUpdate } from "../types";

type UseAdminBookingEtaSocketOptions = {
  bookingId?: string;
  enabled?: boolean;
  onEtaUpdate?: (payload: AdminBookingEtaUpdate) => void;
};

const IS_DEV = import.meta.env.DEV;

function resolveBrokerUrl() {
  const explicit = import.meta.env.VITE_ADMIN_BOOKING_ETA_WS_URL?.trim();
  if (explicit) return explicit;
  return `${appConfig.apiBaseUrl.replace(/^http/i, "ws").replace(/\/+$/, "")}/ws-notifications`;
}

export function useAdminBookingEtaSocket({
  bookingId,
  enabled = true,
  onEtaUpdate,
}: UseAdminBookingEtaSocketOptions) {
  const clientRef = useRef<Client | null>(null);
  const onEtaUpdateRef = useRef(onEtaUpdate);

  useEffect(() => {
    onEtaUpdateRef.current = onEtaUpdate;
  }, [onEtaUpdate]);

  useEffect(() => {
    const normalizedBookingId = String(bookingId ?? "").trim();
    if (!enabled || !normalizedBookingId) return undefined;

    const token = getAccessToken();
    if (!token) return undefined;

    const brokerURL = resolveBrokerUrl();
    const topic = `/topic/admin/bookings/${normalizedBookingId}/eta`;
    const client = new Client({
      brokerURL,
      reconnectDelay: 5000,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      onConnect: () => {
        client.subscribe(topic, (frame) => {
          try {
            onEtaUpdateRef.current?.(JSON.parse(frame.body) as AdminBookingEtaUpdate);
          } catch {
            onEtaUpdateRef.current?.({ bookingId: normalizedBookingId });
          }
        });
      },
      onStompError: (frame) => {
        if (IS_DEV) {
          // eslint-disable-next-line no-console
          console.error("[admin-booking-eta-ws] stomp error", frame.headers["message"], frame.body);
        }
      },
      onWebSocketError: (event) => {
        if (IS_DEV) {
          // eslint-disable-next-line no-console
          console.error("[admin-booking-eta-ws] websocket error", event);
        }
      },
    });

    clientRef.current = client;
    client.activate();

    return () => {
      if (client.active) void client.deactivate();
      clientRef.current = null;
    };
  }, [bookingId, enabled]);
}
