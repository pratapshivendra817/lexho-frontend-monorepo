import { useEffect, useRef } from "react";

type UseCustomerNotificationSocketOptions = {
  token?: string | null;
  userId?: string | number | null;
  enabled?: boolean;
  onMessage?: (payload: any) => void;
};

const WS_URL = "ws://localhost:8082/ws-notifications";
const RECONNECT_DELAY_MS = 5000;

function buildStompConnectFrame(token: string) {
  return `CONNECT\naccept-version:1.2\nheart-beat:10000,10000\nAuthorization:Bearer ${token}\n\n\0`;
}

function buildStompSubscribeFrame(userId: string) {
  return `SUBSCRIBE\nid:customer-notifications-sub\ndestination:/topic/notifications/${userId}\nack:auto\n\n\0`;
}

function buildStompDisconnectFrame() {
  return "DISCONNECT\nreceipt:customer-disconnect\n\n\0";
}

function parseStompFrame(raw: string) {
  const clean = raw.replace(/\0+$/, "");
  const separatorIndex = clean.indexOf("\n\n");
  const head = separatorIndex >= 0 ? clean.slice(0, separatorIndex) : clean;
  const body = separatorIndex >= 0 ? clean.slice(separatorIndex + 2) : "";
  const lines = head.split("\n");
  const command = (lines.shift() ?? "").trim();
  const headers: Record<string, string> = {};
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { command, headers, body };
}

export function useCustomerNotificationSocket({
  token,
  userId,
  enabled = true,
  onMessage,
}: UseCustomerNotificationSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldConnectRef = useRef(false);
  const isConnectingRef = useRef(false);
  const isSubscribedRef = useRef(false);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const normalizedUserId = String(userId ?? "").trim();
    const hasToken = String(token ?? "").trim().length > 0;
    shouldConnectRef.current = Boolean(enabled && hasToken && normalizedUserId);

    if (!shouldConnectRef.current) {
      return undefined;
    }

    const connect = () => {
      const current = wsRef.current;
      if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)) {
        return;
      }
      if (isConnectingRef.current) return;
      isConnectingRef.current = true;
      isSubscribedRef.current = false;

      const socket = new WebSocket(WS_URL);
      wsRef.current = socket;

      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log("[customer-notifications-ws] connecting", { userId: normalizedUserId, wsUrl: WS_URL });
      }

      socket.onopen = () => {
        isConnectingRef.current = false;
        socket.send(buildStompConnectFrame(String(token)));
      };

      socket.onmessage = (event) => {
        const frames = String(event?.data ?? "").split("\0").filter(Boolean);
        for (const rawFrame of frames) {
          const frame = parseStompFrame(rawFrame);
          if (frame.command === "CONNECTED") {
            const destination = `/topic/notifications/${normalizedUserId}`;
            socket.send(buildStompSubscribeFrame(normalizedUserId));
            isSubscribedRef.current = true;
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.log("[customer-notifications-ws] connected", { userId: normalizedUserId, destination });
            }
            continue;
          }

          if (frame.command === "MESSAGE") {
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.log("[customer-notifications-ws] incoming", frame.body);
            }
            try {
              onMessageRef.current?.(JSON.parse(frame.body));
            } catch {
              onMessageRef.current?.(frame.body);
            }
            continue;
          }
        }
      };

      socket.onerror = () => {
        isConnectingRef.current = false;
      };

      socket.onclose = (event) => {
        isConnectingRef.current = false;
        isSubscribedRef.current = false;
        wsRef.current = null;
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log("[customer-notifications-ws] close", {
            code: event?.code,
            reason: event?.reason,
          });
        }
        if (shouldConnectRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY_MS);
        }
      };
    };

    connect();

    return () => {
      shouldConnectRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const socket = wsRef.current;
      wsRef.current = null;
      isConnectingRef.current = false;
      isSubscribedRef.current = false;
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(buildStompDisconnectFrame());
        } catch {
          // no-op
        }
      }
      try {
        socket?.close();
      } catch {
        // no-op
      }
    };
  }, [enabled, token, userId]);
}
