import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "../../../constants/env";
import { getToken } from "../../../utils/storage";
import type { CallEventMap } from "../types";

type EventName = keyof CallEventMap;
type Listener<K extends EventName> = (payload: CallEventMap[K]) => void;

class SocketCallService {
  private socket: Socket | null = null;
  private listeners = new Map<EventName, Set<(payload: any) => void>>();

  async connect() {
    if (this.socket?.connected) return;
    const token = await getToken();
    if (!token) throw new Error("Authentication token is required for calling");
    this.socket?.disconnect();
    this.socket = io(API_BASE_URL, {
      transports: ["websocket"],
      auth: { token, role: "CUSTOMER" },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 15000,
    });
    this.listeners.forEach((callbacks, event) => callbacks.forEach(callback => this.socket?.on(event, callback)));
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Call socket connection timed out")), 15000);
      this.socket!.once("connect", () => { clearTimeout(timer); resolve(); });
      this.socket!.once("connect_error", error => { clearTimeout(timer); reject(error); });
    });
  }

  disconnect() { this.socket?.disconnect(); this.socket = null; }

  emit<K extends EventName>(event: K, payload: CallEventMap[K]) {
    if (!this.socket?.connected) throw new Error("Call socket is disconnected");
    this.socket.emit(event, payload);
  }

  on<K extends EventName>(event: K, listener: Listener<K>) {
    const callbacks = this.listeners.get(event) ?? new Set();
    callbacks.add(listener as (payload: any) => void);
    this.listeners.set(event, callbacks);
    this.socket?.on(event, listener as any);
    return () => { callbacks.delete(listener as any); this.socket?.off(event, listener as any); };
  }
}

export const socketCallService = new SocketCallService();
