const mockGetToken = jest.fn();

jest.mock("../src/services/api", () => ({ API_BASE_URL: "http://api.test:8082" }));
jest.mock("../src/utils/storage", () => ({ getToken: () => mockGetToken() }));

class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readyState = MockWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  send(value: string) {
    this.sent.push(value);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  open() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }
}

(global as any).WebSocket = MockWebSocket;

import { chatSocket } from "../src/services/chatSocket";

describe("chatSocket", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetToken.mockResolvedValue("jwt-token");
    MockWebSocket.instances = [];
    chatSocket.disconnect();
  });

  afterEach(() => {
    chatSocket.disconnect();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("authenticates, subscribes, emits events, and sends typing/read frames", async () => {
    const eventListener = jest.fn();
    const connectionListener = jest.fn();
    chatSocket.addListener(eventListener);
    chatSocket.addConnectionListener(connectionListener);
    const unsubscribe = chatSocket.subscribe(45);

    await chatSocket.connect();
    const socket = MockWebSocket.instances[0];
    expect(socket.url).toBe("ws://api.test:8082/ws/chat");

    socket.open();
    expect(connectionListener).toHaveBeenCalledWith(true);
    expect(socket.sent.map(value => JSON.parse(value))).toEqual(
      expect.arrayContaining([
        { type: "AUTH", token: "jwt-token", role: "PARTNER" },
        { type: "SUBSCRIBE", orderId: 45 },
      ]),
    );

    chatSocket.sendTyping(45, true);
    chatSocket.sendReadReceipt(45, ["m1"]);
    socket.onmessage?.({ data: JSON.stringify({ type: "TYPING", orderId: 45, senderType: "CUSTOMER", typing: true }) });
    expect(eventListener).toHaveBeenCalledWith(expect.objectContaining({ type: "TYPING", typing: true }));
    expect(socket.sent.map(value => JSON.parse(value))).toEqual(
      expect.arrayContaining([
        { type: "TYPING", orderId: 45, typing: true, senderType: "PARTNER" },
        { type: "READ", orderId: 45, messageIds: ["m1"] },
      ]),
    );

    unsubscribe();
    expect(socket.sent.map(value => JSON.parse(value))).toEqual(expect.arrayContaining([{ type: "UNSUBSCRIBE", orderId: 45 }]));
  });

  it("ignores malformed websocket frames and avoids duplicate connections", async () => {
    await chatSocket.connect();
    await chatSocket.connect();
    const socket = MockWebSocket.instances[0];
    socket.open();
    socket.onmessage?.({ data: "{bad-json" });

    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it("notifies connection listeners on socket errors and manual disconnects", async () => {
    const connectionListener = jest.fn();
    chatSocket.addConnectionListener(connectionListener);

    await chatSocket.connect();
    const socket = MockWebSocket.instances[0];
    socket.open();
    socket.onerror?.();
    chatSocket.disconnect();

    expect(connectionListener).toHaveBeenCalledWith(true);
    expect(connectionListener).toHaveBeenCalledWith(false);
  });

  it("reconnects after unexpected closes and re-subscribes pending orders", async () => {
    const connectionListener = jest.fn();
    chatSocket.addConnectionListener(connectionListener);
    chatSocket.subscribe(99);

    await chatSocket.connect();
    const firstSocket = MockWebSocket.instances[0];
    firstSocket.open();
    firstSocket.close();

    expect(connectionListener).toHaveBeenLastCalledWith(false);
    await jest.advanceTimersByTimeAsync(1000);

    expect(MockWebSocket.instances).toHaveLength(2);
    const secondSocket = MockWebSocket.instances[1];
    secondSocket.open();
    expect(secondSocket.sent.map(value => JSON.parse(value))).toEqual(
      expect.arrayContaining([
        { type: "AUTH", token: "jwt-token", role: "PARTNER" },
        { type: "SUBSCRIBE", orderId: 99 },
      ]),
    );
  });

  it("does not reconnect after an intentional disconnect", async () => {
    await chatSocket.connect();
    const socket = MockWebSocket.instances[0];
    socket.open();

    chatSocket.disconnect();
    await jest.advanceTimersByTimeAsync(1000);

    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it("requires an access token", async () => {
    mockGetToken.mockResolvedValue(null);
    await expect(chatSocket.connect()).rejects.toThrow("Authentication token is required for chat");
  });
});
