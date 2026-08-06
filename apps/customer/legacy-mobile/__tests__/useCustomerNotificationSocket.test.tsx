import React from "react";
import { Text } from "react-native";
import { cleanup, render } from "@testing-library/react-native";

import { useCustomerNotificationSocket } from "../src/hooks/useCustomerNotificationSocket";

class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static instances: MockWebSocket[] = [];

  url: string;
  readyState = MockWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: { code?: number; reason?: string }) => void) | null = null;
  close = jest.fn();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send = jest.fn((value: string) => {
    this.sent.push(value);
  });

  open() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  message(data: string) {
    this.onmessage?.({ data });
  }

  closed(code = 1006, reason = "closed") {
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }
}

function Probe(props: {
  enabled?: boolean;
  token?: string | null;
  userId?: string | number | null;
  onMessage?: (payload: unknown) => void;
}) {
  useCustomerNotificationSocket(props);
  return <Text>socket</Text>;
}

describe("useCustomerNotificationSocket", () => {
  const runtime = globalThis as any;
  const originalDev = runtime.__DEV__;

  beforeEach(() => {
    jest.useFakeTimers();
    MockWebSocket.instances = [];
    (globalThis as any).WebSocket = MockWebSocket;
    runtime.__DEV__ = true;
  });

  afterEach(async () => {
    await cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  afterAll(() => {
    runtime.__DEV__ = originalDev;
  });

  it.each([
    { enabled: false, token: "token", userId: "1" },
    { enabled: true, token: "", userId: "1" },
    { enabled: true, token: "token", userId: "" },
  ])("does not connect with incomplete options", async (props) => {
    await render(<Probe {...props} />);
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it("connects, subscribes and parses JSON and text STOMP messages", async () => {
    const onMessage = jest.fn();
    const view = await render(
      <Probe token="auth-token" userId={12} onMessage={onMessage} />,
    );
    const socket = MockWebSocket.instances[0];
    expect(socket.url).toContain("/ws-notifications");

    socket.open();
    expect(socket.sent[0]).toContain("CONNECT");
    expect(socket.sent[0]).toContain("Authorization:Bearer auth-token");

    socket.message("CONNECTED\nversion:1.2\n\n\0");
    expect(socket.sent[1]).toContain("/topic/notifications/12");

    socket.message(
      'MESSAGE\ndestination:/topic/notifications/12\n\n{"id":"n1"}\0' +
        "MESSAGE\n\nplain-text\0",
    );
    expect(onMessage).toHaveBeenNthCalledWith(1, { id: "n1" });
    expect(onMessage).toHaveBeenNthCalledWith(2, "plain-text");

    await view.unmount();
    expect(socket.sent.at(-1)).toContain("DISCONNECT");
    expect(socket.close).toHaveBeenCalled();
  });

  it("uses the latest callback without reconnecting", async () => {
    const first = jest.fn();
    const second = jest.fn();
    const view = await render(
      <Probe token="token" userId="1" onMessage={first} />,
    );
    const socket = MockWebSocket.instances[0];
    socket.open();
    socket.message("CONNECTED\n\n\0");

    await view.rerender(
      <Probe token="token" userId="1" onMessage={second} />,
    );
    socket.message('MESSAGE\n\n{"id":"new"}\0');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ id: "new" });
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it("reconnects with backoff and pauses after repeated failures", async () => {
    await render(<Probe token="token" userId="1" />);
    for (let failure = 0; failure < 6; failure += 1) {
      const socket = MockWebSocket.instances.at(-1)!;
      socket.closed();
      await jest.runOnlyPendingTimersAsync();
    }
    expect(MockWebSocket.instances).toHaveLength(6);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("avoids duplicate connection while socket is connecting and cleans timers", async () => {
    const clearTimeoutSpy = jest.spyOn(globalThis, "clearTimeout");
    const view = await render(<Probe token="token" userId="1" />);
    const first = MockWebSocket.instances[0];
    first.onerror?.();
    first.closed();

    await view.unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("uses defaults and rejects whitespace-only credentials", async () => {
    await render(<Probe token="   " userId="  " />);
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it("parses frames without separators and ignores malformed headers", async () => {
    const onMessage = jest.fn();
    await render(
      <Probe token="token" userId="1" onMessage={onMessage} />,
    );
    const socket = MockWebSocket.instances[0];
    socket.open();

    socket.message("CONNECTED\ninvalid-header\0");
    expect(socket.send).toHaveBeenCalledWith(
      expect.stringContaining("/topic/notifications/1"),
    );
    socket.message("\ninvalid-header\n\nbody\0");
    socket.message("RECEIPT\nreceipt-id:1\n\n\0");
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("does not reconnect after cleanup and tolerates teardown failures", async () => {
    const view = await render(<Probe token="token" userId="1" />);
    const socket = MockWebSocket.instances[0];
    socket.open();
    socket.send.mockImplementationOnce(() => {
      throw new Error("send failed");
    });
    socket.close.mockImplementationOnce(() => {
      throw new Error("close failed");
    });

    await expect(view.unmount()).resolves.toBeUndefined();
    socket.closed();
    await jest.runOnlyPendingTimersAsync();
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it("runs connection and messages in production mode", async () => {
    runtime.__DEV__ = false;
    const onMessage = jest.fn();
    await render(
      <Probe token="token" userId="1" onMessage={onMessage} />,
    );
    const socket = MockWebSocket.instances[0];
    socket.open();
    socket.message("CONNECTED\n\n\0");
    socket.message('MESSAGE\n\n{"id":"production"}\0');

    expect(onMessage).toHaveBeenCalledWith({ id: "production" });
  });
});
