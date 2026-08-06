import { API_BASE_URL } from "./api";
import { getToken } from "../utils/storage";
import type { CallSignal } from "../types/call";

type Listener = (signal: CallSignal) => void;

class CallSignalingService {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  private attempts = 0;
  private pendingFrames: string[] = [];

  async connect() {
    if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) return;
    const token = await getToken();
    if (!token) throw new Error("Authentication token is required for calling");
    this.shouldReconnect = true;
    const socket = new WebSocket(`${API_BASE_URL.replace(/^http/i, "ws")}/ws/calls`);
    this.socket = socket;
    socket.onopen = () => {
      this.attempts = 0;
      socket.send(JSON.stringify({ type: "AUTH", token, role: "PARTNER" }));
      this.pendingFrames.splice(0).forEach(frame => socket.send(frame));
    };
    socket.onmessage = event => {
      try {
        const signal = JSON.parse(String(event.data)) as CallSignal;
        this.listeners.forEach(listener => listener(signal));
      } catch {
        // Ignore malformed signaling frames.
      }
    };
    socket.onclose = () => {
      this.socket = null;
      if (this.shouldReconnect) this.scheduleReconnect();
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.socket?.close();
    this.socket = null;
    this.pendingFrames = [];
  }

  send(signal: CallSignal | Record<string, unknown>) {
    const frame = JSON.stringify(signal);
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(frame);
      return;
    }
    if (this.socket?.readyState === WebSocket.CONNECTING) {
      this.pendingFrames.push(frame);
      return;
    }
    throw new Error("Call signaling is not connected");
  }

  addListener(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** this.attempts, 15000);
    this.attempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => this.scheduleReconnect());
    }, delay);
  }
}

export const callSignaling = new CallSignalingService();
