import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";

import { appConfig } from "@/config";
import { getAccessToken } from "@/utils/authSession";

type AdminNotificationSocketOptions = {
  enabled?: boolean;
  onMessage?: (data?: unknown) => void;
};

const DEFAULT_BROKER_PATH = "/ws/admin/notifications";
const DEFAULT_DEV_BROKER_URL = "ws://localhost:8082/ws/admin/notifications";
const DEFAULT_TOPIC = "/topic/admin/notifications";
const IS_DEV = import.meta.env.DEV;

function resolveBrokerUrl() {
  const configuredBrokerUrl = import.meta.env.VITE_ADMIN_NOTIFICATIONS_WS_URL?.trim();
  if (configuredBrokerUrl) {
    return configuredBrokerUrl;
  }

  const apiBaseUrl = appConfig.apiBaseUrl?.trim();
  if (apiBaseUrl) {
    try {
      const brokerUrl = new URL(apiBaseUrl, window.location.origin);
      brokerUrl.protocol = brokerUrl.protocol === "https:" ? "wss:" : "ws:";
      brokerUrl.pathname = DEFAULT_BROKER_PATH;
      brokerUrl.search = "";
      brokerUrl.hash = "";
      return brokerUrl.toString();
    } catch {
      // Fall back below when the configured base URL is malformed.
    }
  }

  return IS_DEV ? DEFAULT_DEV_BROKER_URL : "";
}

function devLog(message: string, payload?: unknown) {
  if (!IS_DEV) return;
  // eslint-disable-next-line no-console
  console.info(message, payload ?? "");
}

export function useAdminNotificationSocket({ enabled = true, onMessage }: AdminNotificationSocketOptions) {
  const clientRef = useRef<Client | null>(null);
  const onMessageRef = useRef(onMessage);
  const isConnectingRef = useRef(false);
  const lastCloseLogAtRef = useRef(0);
  const shouldConnectRef = useRef(false);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    shouldConnectRef.current = enabled;
    if (!enabled) return undefined;

    const token = getAccessToken();
    if (!token) {
      devLog("[admin-notifications-ws] skipped: no admin token");
      return undefined;
    }

    const brokerURL = resolveBrokerUrl();
    if (!brokerURL) {
      devLog("[admin-notifications-ws] skipped: broker URL unavailable");
      return undefined;
    }
    if (brokerURL !== DEFAULT_DEV_BROKER_URL) {
      devLog(`[admin-notifications-ws] brokerURL from env: ${brokerURL}`);
    } else {
      devLog(`[admin-notifications-ws] brokerURL: ${DEFAULT_DEV_BROKER_URL}`);
    }

    if (!clientRef.current) {
      clientRef.current = new Client({
        brokerURL,
        reconnectDelay: 5000,
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        onConnect: () => {
          isConnectingRef.current = false;
          devLog(`[admin-notifications-ws] onConnect active=${Boolean(clientRef.current?.active)}`);
          if (!isSubscribedRef.current) {
            clientRef.current?.subscribe(DEFAULT_TOPIC, (frame) => {
              try {
                onMessageRef.current?.(JSON.parse(frame.body));
              } catch {
                onMessageRef.current?.(frame.body);
              }
            });
            isSubscribedRef.current = true;
          }
        },
        onStompError: (frame) => {
          isConnectingRef.current = false;
          if (IS_DEV) {
            // eslint-disable-next-line no-console
            console.error("[admin-notifications-ws] onStompError", frame.headers["message"], frame.body);
          }
        },
        onWebSocketClose: (event) => {
          isConnectingRef.current = false;
          isSubscribedRef.current = false;
          const now = Date.now();
          if (IS_DEV && now - lastCloseLogAtRef.current > 4000) {
            lastCloseLogAtRef.current = now;
            // eslint-disable-next-line no-console
            console.warn(`[admin-notifications-ws] close code=${event.code} reason="${event.reason || "-"}" clean=${event.wasClean}`);
          }
        },
        onWebSocketError: (event) => {
          isConnectingRef.current = false;
          if (IS_DEV) {
            // eslint-disable-next-line no-console
            console.error("[admin-notifications-ws] onWebSocketError", event);
          }
        },
      });
    }

    const client = clientRef.current;
    devLog(`[admin-notifications-ws] before activate active=${Boolean(client?.active)} connecting=${isConnectingRef.current}`);
    if (client?.active || isConnectingRef.current) {
      return undefined;
    }

    isConnectingRef.current = true;
    client?.activate();
    devLog(`[admin-notifications-ws] activate called active=${Boolean(client?.active)}`);

    return () => {
      shouldConnectRef.current = false;
      const current = clientRef.current;
      devLog(`[admin-notifications-ws] before deactivate active=${Boolean(current?.active)}`);
      if (current?.active) {
        void current.deactivate().finally(() => {
          isConnectingRef.current = false;
          isSubscribedRef.current = false;
          devLog(`[admin-notifications-ws] after deactivate active=${Boolean(current.active)}`);
          const tokenAfterDeactivate = getAccessToken();
          if (shouldConnectRef.current && tokenAfterDeactivate && !current.active && !isConnectingRef.current) {
            isConnectingRef.current = true;
            current.activate();
            devLog("[admin-notifications-ws] re-activate after deactivate");
          }
        });
      } else {
        isConnectingRef.current = false;
        isSubscribedRef.current = false;
      }
    };
  }, [enabled]);
}
