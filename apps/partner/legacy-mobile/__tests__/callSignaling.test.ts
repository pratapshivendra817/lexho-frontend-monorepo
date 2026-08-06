const mockGetToken = jest.fn();
jest.mock("../src/services/api", () => ({ API_BASE_URL: "http://api.test:8082" }));
jest.mock("../src/utils/storage", () => ({ getToken: () => mockGetToken() }));

class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static instances: MockWebSocket[] = [];
  readyState = MockWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(public url: string) { MockWebSocket.instances.push(this); }
  send(frame: string) { this.sent.push(frame); }
  close() { this.onclose?.(); }
  open() { this.readyState = MockWebSocket.OPEN; this.onopen?.(); }
}

(global as any).WebSocket = MockWebSocket;

import { callSignaling } from "../src/services/callSignaling";

describe("callSignaling", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    callSignaling.disconnect();
    MockWebSocket.instances = [];
    mockGetToken.mockResolvedValue("jwt");
  });
  afterEach(() => {
    callSignaling.disconnect();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("authenticates, flushes queued signals, and emits server frames", async () => {
    const listener = jest.fn();
    callSignaling.addListener(listener);
    await callSignaling.connect();
    callSignaling.send({ type: "ANSWER", callId: "c1", sdp: "answer" });
    const socket = MockWebSocket.instances[0];
    expect(socket.url).toBe("ws://api.test:8082/ws/calls");
    socket.open();
    expect(socket.sent.map(JSON.parse)).toEqual([
      { type: "AUTH", token: "jwt", role: "PARTNER" },
      { type: "ANSWER", callId: "c1", sdp: "answer" },
    ]);
    socket.onmessage?.({ data: JSON.stringify({ type: "ENDED", callId: "c1", reason: "REMOTE" }) });
    expect(listener).toHaveBeenCalledWith({ type: "ENDED", callId: "c1", reason: "REMOTE" });
  });

  it("sends immediately when the socket is already open and ignores malformed frames", async () => {
    const listener = jest.fn();
    callSignaling.addListener(listener);
    await callSignaling.connect();
    const socket = MockWebSocket.instances[0];
    socket.open();

    callSignaling.send({ type: "RINGING", callId: "c2" });
    expect(socket.sent.map(JSON.parse)).toEqual([
      { type: "AUTH", token: "jwt", role: "PARTNER" },
      { type: "RINGING", callId: "c2" },
    ]);

    socket.onmessage?.({ data: "{bad-json" });
    expect(listener).not.toHaveBeenCalled();
  });

  it("throws when sending without a live or connecting socket", () => {
    expect(() => callSignaling.send({ type: "ANSWER", callId: "c3", sdp: "x" })).toThrow(
      "Call signaling is not connected",
    );
  });

  it("reconnects after close, avoids duplicate reconnect timers, and cancels reconnect on disconnect", async () => {
    await callSignaling.connect();
    const firstSocket = MockWebSocket.instances[0];
    firstSocket.open();

    firstSocket.onclose?.();
    firstSocket.onclose?.();
    expect(MockWebSocket.instances).toHaveLength(1);

    await jest.advanceTimersByTimeAsync(1000);
    expect(MockWebSocket.instances).toHaveLength(2);

    const secondSocket = MockWebSocket.instances[1];
    secondSocket.open();
    secondSocket.onclose?.();

    callSignaling.disconnect();
    await jest.advanceTimersByTimeAsync(2000);
    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it("requires authentication", async () => {
    mockGetToken.mockResolvedValue(null);
    await expect(callSignaling.connect()).rejects.toThrow("Authentication token is required");
  });
});
