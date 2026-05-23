import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { PartnerOrder } from "../types/order";
import { getLastNewOrdersFetchMeta, getNewDispatchRequests } from "../services/partnerService";
import { API_BASE_URL, ENABLE_DISPATCH_WS } from "../services/api";

export function useRealtimeDispatchRequests(enabled: boolean) {
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [diagText, setDiagText] = useState("");
  const [isForeground, setIsForeground] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => setIsForeground(next === "active"));
    return () => sub.remove();
  }, []);

  const load = useCallback(async () => {
    if (!enabled || inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    try {
      const rows = await getNewDispatchRequests();
      setOrders(rows);
      setError("");
      setLastFetchedAt(Date.now());
      const meta = getLastNewOrdersFetchMeta();
      setDiagText(`Endpoint: ${meta.endpoint ?? "-"} | Status: ${meta.status ?? "-"} | Time: ${meta.at ? new Date(meta.at).toLocaleTimeString() : "-"}`);
    } catch (e: any) {
      setError(String(e?.message ?? "Unable to load new orders"));
      setLastFetchedAt(Date.now());
      const meta = getLastNewOrdersFetchMeta();
      setDiagText(`Endpoint: ${meta.endpoint ?? "-"} | Status: ${meta.status ?? "-"} | Time: ${meta.at ? new Date(meta.at).toLocaleTimeString() : "-"}`);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !ENABLE_DISPATCH_WS) return;
    const wsUrl = `${String(API_BASE_URL).replace(/^http/, "ws").replace(/\/+$/, "")}/ws/partner/dispatch`;
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
      socket.onopen = () => setWsConnected(true);
      socket.onclose = () => {
        setWsConnected(false);
        if (!closed) retryTimer = setTimeout(connect, 4000);
      };
      socket.onerror = () => setWsConnected(false);
      socket.onmessage = () => {
        // Pull latest normalized data from API to avoid schema drift in raw WS payloads.
        load().catch(() => null);
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
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled || !isForeground) return;
    load().catch(() => null);
    if (ENABLE_DISPATCH_WS && wsConnected) return;
    const id = setInterval(() => {
      load().catch(() => null);
    }, 6000);
    return () => clearInterval(id);
  }, [enabled, isForeground, load, wsConnected]);

  return { orders, loading, error, lastFetchedAt, diagText, refresh: load, wsConnected };
}
