import { useEffect } from "react";

type ProviderNotificationSocketOptions = {
  enabled?: boolean;
  onMessage?: () => void;
};

function resolveSocketUrl() {
  const explicit = import.meta.env.VITE_PROVIDER_NOTIFICATIONS_WS_URL;
  if (explicit) return explicit;
  const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8082";
  const wsBase = base.replace(/^http/i, "ws");
  return `${wsBase}/ws/provider/notifications`;
}

export function useProviderNotificationSocket({ enabled = true, onMessage }: ProviderNotificationSocketOptions) {
  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem("partner_access_token") ?? localStorage.getItem("access_token");
    const socketUrl = new URL(resolveSocketUrl());
    if (token) {
      socketUrl.searchParams.set("token", token);
    }

    let isClosedManually = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const connect = () => {
      socket = new WebSocket(socketUrl.toString());

      socket.onmessage = () => {
        onMessage?.();
      };

      socket.onclose = () => {
        if (isClosedManually) return;
        reconnectTimer = window.setTimeout(connect, 3000);
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
