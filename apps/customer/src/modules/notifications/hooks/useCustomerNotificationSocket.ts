import { useEffect } from "react";
import toast from "react-hot-toast";

type CustomerNotificationSocketOptions = {
  enabled?: boolean;
  onMessage?: () => void;
};

function resolveSocketUrl() {
  const explicit = import.meta.env.VITE_CUSTOMER_NOTIFICATIONS_WS_URL;
  if (explicit) return explicit;
  const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8082";
  const wsBase = base.replace(/^http/i, "ws");
  return `${wsBase}/ws/customer/notifications`;
}

export function useCustomerNotificationSocket({ enabled = true, onMessage }: CustomerNotificationSocketOptions) {
  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem("customer_access_token") ?? localStorage.getItem("access_token");
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
        toast.success("New notification received");
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
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [enabled, onMessage]);
}
