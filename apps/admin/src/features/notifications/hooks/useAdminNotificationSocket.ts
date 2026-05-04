import { useEffect } from "react";
import { getAccessToken } from "@/utils/authSession";

type AdminNotificationSocketOptions = {
  enabled?: boolean;
  onMessage?: () => void;
};

function resolveSocketUrl() {
  const explicit = import.meta.env.VITE_ADMIN_NOTIFICATIONS_WS_URL;
  if (explicit) return explicit;
  const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8082";
  const wsBase = base.replace(/^http/i, "ws");
  return `${wsBase}/ws/admin/notifications`;
}

export function useAdminNotificationSocket({ enabled = true, onMessage }: AdminNotificationSocketOptions) {
  useEffect(() => {
    if (!enabled) return;

    const token = getAccessToken();
    if (!token) {
      return;
    }

    const socketUrl = new URL(resolveSocketUrl());
    socketUrl.searchParams.set("token", token);

    let isClosedManually = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const baseDelayMs = 3000;
    const maxDelayMs = 30000;

    const connect = () => {
      socket = new WebSocket(socketUrl.toString());
      socket.onopen = () => {
        reconnectAttempts = 0;
      };
      socket.onmessage = () => {
        onMessage?.();
      };
      socket.onclose = () => {
        if (isClosedManually) return;
        if (reconnectAttempts >= maxReconnectAttempts) return;
        reconnectAttempts += 1;
        const exponentialDelay = Math.min(baseDelayMs * 2 ** (reconnectAttempts - 1), maxDelayMs);
        const jitter = Math.floor(Math.random() * 400);
        reconnectTimer = window.setTimeout(connect, exponentialDelay + jitter);
      };
    };

    connect();

    return () => {
      isClosedManually = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [enabled, onMessage]);
}
