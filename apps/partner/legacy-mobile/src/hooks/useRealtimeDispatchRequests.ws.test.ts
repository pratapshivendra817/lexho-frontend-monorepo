import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";
import type ReactType from "react";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mockAppStateChangeListener: ((state: string) => void) | null = null;
const mockAppStateRemove = jest.fn();
const mockGetNewDispatchRequests = jest.fn();
const mockGetLastNewOrdersFetchMeta = jest.fn();

class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static instances: MockWebSocket[] = [];

  url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: (() => void) | null = null;
  close = jest.fn(() => {
    this.readyState = 3;
    this.onclose?.();
  });

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  emitOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  emitClose() {
    this.readyState = 3;
    this.onclose?.();
  }

  emitError() {
    this.onerror?.();
  }

  emitMessage() {
    this.onmessage?.();
  }
}

jest.mock("../services/partnerService", () => ({
  getNewDispatchRequests: jest.fn(() => mockGetNewDispatchRequests()),
  getLastNewOrdersFetchMeta: jest.fn(() => mockGetLastNewOrdersFetchMeta()),
}));

jest.mock("../services/api", () => ({
  API_BASE_URL: "http://example.test/",
  ENABLE_DISPATCH_WS: true,
}));

import { useRealtimeDispatchRequests } from "./useRealtimeDispatchRequests";

describe("useRealtimeDispatchRequests websocket mode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    MockWebSocket.instances = [];
    mockAppStateChangeListener = null;
    mockGetNewDispatchRequests.mockResolvedValue([{ id: 11 }] as any[]);
    mockGetLastNewOrdersFetchMeta.mockReturnValue({
      endpoint: "/partner/orders/new",
      status: 200,
      at: 1700000000000,
    });
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type: any, listener: any) => {
      mockAppStateChangeListener = listener;
      return { remove: mockAppStateRemove } as any;
    });
    global.WebSocket = jest.fn((url: string) => new MockWebSocket(url)) as any;
    jest.spyOn(Date, "now").mockReturnValue(1700000000000);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("polls while foregrounded until websocket is connected and pauses in background", async () => {
    const { result } = await renderHook(() => useRealtimeDispatchRequests(true));

    await waitFor(() => {
      expect(mockGetNewDispatchRequests).toHaveBeenCalledTimes(1);
      expect(global.WebSocket).toHaveBeenCalledWith("ws://example.test/ws/partner/dispatch");
    });

    await act(async () => {
      jest.advanceTimersByTime(6000);
    });
    expect(mockGetNewDispatchRequests).toHaveBeenCalledTimes(2);

    await act(async () => {
      MockWebSocket.instances[0].emitOpen();
    });
    expect(result.current.wsConnected).toBe(true);
    const callsAfterOpen = mockGetNewDispatchRequests.mock.calls.length;

    await act(async () => {
      jest.advanceTimersByTime(6000);
    });
    expect(mockGetNewDispatchRequests.mock.calls.length).toBe(callsAfterOpen);

    await act(async () => {
      mockAppStateChangeListener?.("background");
      jest.advanceTimersByTime(6000);
    });
    expect(mockGetNewDispatchRequests.mock.calls.length).toBe(callsAfterOpen);
  });

  it("reloads on websocket messages, tracks errors, and cleans up", async () => {
    const { result, unmount } = await renderHook(() => useRealtimeDispatchRequests(true));

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    const callsBeforeMessage = mockGetNewDispatchRequests.mock.calls.length;
    await act(async () => {
      MockWebSocket.instances[0].emitMessage();
    });
    expect(mockGetNewDispatchRequests.mock.calls.length).toBe(callsBeforeMessage + 1);

    await act(async () => {
      MockWebSocket.instances[0].emitError();
    });
    expect(result.current.wsConnected).toBe(false);

    await unmount();
    expect(MockWebSocket.instances[0].close).toHaveBeenCalled();
  });

  it("retries websocket creation after failures and reconnects after close", async () => {
    let shouldThrow = true;
    global.WebSocket = jest.fn((url: string) => {
      if (shouldThrow) {
        shouldThrow = false;
        throw new Error("socket init failed");
      }
      return new MockWebSocket(url);
    }) as any;

    await renderHook(() => useRealtimeDispatchRequests(true));

    expect(global.WebSocket).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    expect(global.WebSocket).toHaveBeenCalledTimes(2);

    await act(async () => {
      MockWebSocket.instances[0].emitClose();
      jest.advanceTimersByTime(4000);
    });

    expect(global.WebSocket).toHaveBeenCalledTimes(3);
  });

  it("skips retry work after the hook has been disposed", async () => {
    const scheduled: Array<() => void> = [];
    jest.spyOn(global, "setTimeout").mockImplementation(((callback: any) => {
      scheduled.push(callback);
      return 1 as any;
    }) as any);
    global.WebSocket = jest.fn(() => {
      throw new Error("socket init failed");
    }) as any;

    const { unmount } = await renderHook(() => useRealtimeDispatchRequests(true));

    expect(scheduled).toHaveLength(1);

    await unmount();

    await act(async () => {
      scheduled[0]?.();
    });

    expect(global.WebSocket).toHaveBeenCalledTimes(1);
  });

  it("swallows rejected load calls from the foreground effect and polling interval", async () => {
    const loadReject = jest.fn(() => Promise.reject(new Error("load failed")));
    let intervalCallback: (() => void) | null = null;

    jest.isolateModules(() => {
      jest.doMock("react", () => {
        const actual = jest.requireActual("react") as typeof ReactType;
        return {
          ...actual,
          useState: jest.fn((initial) => [initial, jest.fn()]),
          useRef: jest.fn((value) => ({ current: value })),
          useCallback: jest.fn(() => loadReject),
          useEffect: jest.fn((effect) => effect()),
        };
      });
      jest.doMock("../services/api", () => ({
        API_BASE_URL: "http://example.test/",
        ENABLE_DISPATCH_WS: false,
      }));
      jest.doMock("../services/partnerService", () => ({
        getNewDispatchRequests: jest.fn(),
        getLastNewOrdersFetchMeta: jest.fn(),
      }));
      jest.spyOn(global, "setInterval").mockImplementation(((callback: any) => {
        intervalCallback = callback;
        return 1 as any;
      }) as any);
      jest.spyOn(global, "clearInterval").mockImplementation(jest.fn() as any);

      const { useRealtimeDispatchRequests: isolatedHook } = require("./useRealtimeDispatchRequests");
      expect(() => isolatedHook(true)).not.toThrow();
    });

    await Promise.resolve();
    intervalCallback?.();
    await Promise.resolve();

    expect(loadReject).toHaveBeenCalledTimes(2);
  });

  it("swallows rejected load calls triggered from websocket messages", async () => {
    const loadReject = jest.fn(() => Promise.reject(new Error("ws load failed")));
    let socketInstance: any = null;

    jest.isolateModules(() => {
      jest.doMock("react", () => {
        const actual = jest.requireActual("react") as typeof ReactType;
        return {
          ...actual,
          useState: jest.fn((initial) => [initial, jest.fn()]),
          useRef: jest.fn((value) => ({ current: value })),
          useCallback: jest.fn(() => loadReject),
          useEffect: jest.fn((effect) => effect()),
        };
      });
      jest.doMock("../services/api", () => ({
        API_BASE_URL: "http://example.test/",
        ENABLE_DISPATCH_WS: true,
      }));
      jest.doMock("../services/partnerService", () => ({
        getNewDispatchRequests: jest.fn(),
        getLastNewOrdersFetchMeta: jest.fn(),
      }));
      global.WebSocket = jest.fn(() => {
        socketInstance = {};
        return socketInstance;
      }) as any;

      const { useRealtimeDispatchRequests: isolatedHook } = require("./useRealtimeDispatchRequests");
      expect(() => isolatedHook(true)).not.toThrow();
    });

    const callsBeforeMessage = loadReject.mock.calls.length;
    socketInstance.onmessage?.();
    await Promise.resolve();

    expect(loadReject.mock.calls.length).toBe(callsBeforeMessage + 1);
  });
});
