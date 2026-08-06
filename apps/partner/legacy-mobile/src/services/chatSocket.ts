import { API_BASE_URL } from "./api";
import { getToken } from "../utils/storage";
import type { ChatSocketEvent } from "../types/chat";

type Listener = (event: ChatSocketEvent) => void;
type ConnectionListener = (connected: boolean) => void;

const socketUrl = () => `${API_BASE_URL.replace(/^http/i, "ws")}/ws/chat`;

class PartnerChatSocket {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private connectionListeners = new Set<ConnectionListener>();
  private orders = new Set<number>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private intentionallyClosed = false;

  async connect() {
    if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) return;
    this.intentionallyClosed = false;
    const token = await getToken();
    if (!token) throw new Error("Authentication token is required for chat");

    const socket = new WebSocket(socketUrl());
    this.socket = socket;
    socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.emitConnection(true);
      this.sendRaw({ type: "AUTH", token, role: "PARTNER" });
      this.orders.forEach(orderId => this.sendRaw({ type: "SUBSCRIBE", orderId }));
    };
    socket.onmessage = message => {
      try {
        const event = JSON.parse(String(message.data)) as ChatSocketEvent;
        this.listeners.forEach(listener => listener(event));
      } catch {
        // Ignore malformed frames without interrupting the connection.
      }
    };
    socket.onerror = () => this.emitConnection(false);
    socket.onclose = () => {
      this.emitConnection(false);
      this.socket = null;
      if (!this.intentionallyClosed) this.scheduleReconnect();
    };
  }

  disconnect() {
    this.intentionallyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.socket?.close();
    this.socket = null;
    this.emitConnection(false);
  }

  subscribe(orderId: number) {
    this.orders.add(orderId);
    this.sendRaw({ type: "SUBSCRIBE", orderId });
    return () => {
      this.orders.delete(orderId);
      this.sendRaw({ type: "UNSUBSCRIBE", orderId });
    };
  }

  sendTyping(orderId: number, typing: boolean) {
    this.sendRaw({ type: "TYPING", orderId, typing, senderType: "PARTNER" });
  }

  sendReadReceipt(orderId: number, messageIds: string[]) {
    this.sendRaw({ type: "READ", orderId, messageIds });
  }

  addListener(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  addConnectionListener(listener: ConnectionListener) {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  private sendRaw(payload: Record<string, unknown>) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(payload));
  }

  private emitConnection(connected: boolean) {
    this.connectionListeners.forEach(listener => listener(connected));
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 30000);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => this.scheduleReconnect());
    }, delay);
  }
}

export const chatSocket = new PartnerChatSocket();

