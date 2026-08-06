import { act, renderHook, waitFor } from "@testing-library/react-native";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mockEnableDispatchWs = false;
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
  get ENABLE_DISPATCH_WS() {
    return mockEnableDispatchWs;
  },
}));
import { useRealtimeDispatchRequests } from "./useRealtimeDispatchRequests";

describe("useRealtimeDispatchRequests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockWebSocket.instances = [];
    mockEnableDispatchWs = false;
    mockAppStateChangeListener = null;
    mockGetNewDispatchRequests.mockResolvedValue([]);
    mockGetLastNewOrdersFetchMeta.mockReturnValue({
      endpoint: "/partner/orders/new",
      status: 200,
      at: 1700000000000,
    });
    const { AppState } = require("react-native");
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type: any, listener: any) => {
      mockAppStateChangeListener = listener;
      return { remove: mockAppStateRemove } as any;
    });
    global.WebSocket = jest.fn((url: string) => new MockWebSocket(url)) as any;
    jest.spyOn(Date, "now").mockReturnValue(1700000000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns the initial state and no-ops refresh when disabled", async () => {
    const { result, unmount } = await renderHook(({ enabled }) => useRealtimeDispatchRequests(enabled), {
      initialProps: { enabled: false },
    });

    expect(result.current.orders).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("");
    expect(result.current.lastFetchedAt).toBeNull();
    expect(result.current.diagText).toBe("");
    expect(result.current.wsConnected).toBe(false);

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetNewDispatchRequests).not.toHaveBeenCalled();

    await unmount();
    expect(mockAppStateRemove).toHaveBeenCalled();
  });

  it("loads orders successfully and updates diagnostics", async () => {
    const orders = [{ id: 1 }, { id: 2 }] as any[];
    mockGetNewDispatchRequests.mockResolvedValue(orders);

    const { result } = await renderHook(() => useRealtimeDispatchRequests(true));

    await waitFor(() => {
      expect(result.current.orders).toEqual(orders);
    });

    expect(result.current.error).toBe("");
    expect(result.current.loading).toBe(false);
    expect(result.current.lastFetchedAt).toBe(1700000000000);
    expect(result.current.diagText).toContain("Endpoint: /partner/orders/new");
    expect(result.current.diagText).toContain("Status: 200");
  });

  it("stores error and diagnostics when loading fails", async () => {
    mockGetNewDispatchRequests.mockRejectedValue(new Error("network down"));
    mockGetLastNewOrdersFetchMeta.mockReturnValue({
      endpoint: null,
      status: null,
      at: null,
    });

    const { result } = await renderHook(() => useRealtimeDispatchRequests(true));

    await waitFor(() => {
      expect(result.current.error).toBe("network down");
    });

    expect(result.current.orders).toEqual([]);
    expect(result.current.lastFetchedAt).toBe(1700000000000);
    expect(result.current.diagText).toBe("Endpoint: - | Status: - | Time: -");
  });

  it("falls back to a default error message for nullish failures", async () => {
    mockGetNewDispatchRequests.mockRejectedValueOnce(null);
    mockGetLastNewOrdersFetchMeta.mockReturnValueOnce({
      endpoint: "/orders/null-error",
      status: 500,
      at: null,
    });

    const { result } = await renderHook(() => useRealtimeDispatchRequests(true));

    await waitFor(() => {
      expect(result.current.error).toBe("Unable to load new orders");
    });

    expect(result.current.diagText).toBe("Endpoint: /orders/null-error | Status: 500 | Time: -");
  });

  it("updates diagnostics for manual refresh success and failure paths", async () => {
    const { result } = await renderHook(() => useRealtimeDispatchRequests(true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGetNewDispatchRequests.mockReset();
    mockGetLastNewOrdersFetchMeta.mockReset();

    mockGetNewDispatchRequests.mockResolvedValueOnce([{ id: 7 }] as any[]);
    mockGetLastNewOrdersFetchMeta.mockReturnValueOnce({
      endpoint: "/orders/manual-success",
      status: 201,
      at: 1700000000000,
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.orders).toEqual([{ id: 7 }]);
    expect(result.current.diagText).toContain("/orders/manual-success");
    expect(result.current.diagText).toContain("Status: 201");

    mockGetNewDispatchRequests.mockRejectedValueOnce(new Error("manual refresh failed"));
    mockGetLastNewOrdersFetchMeta.mockReturnValueOnce({
      endpoint: "/orders/manual-failure",
      status: 503,
      at: 1700000000000,
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBe("manual refresh failed");
    expect(result.current.diagText).toContain("/orders/manual-failure");
    expect(result.current.diagText).toContain("Status: 503");
  });

  it("formats successful diagnostics when the backend metadata has no timestamp", async () => {
    const { result } = await renderHook(() => useRealtimeDispatchRequests(true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGetNewDispatchRequests.mockResolvedValueOnce([{ id: 8 }] as any[]);
    mockGetLastNewOrdersFetchMeta.mockReturnValueOnce({
      endpoint: null,
      status: null,
      at: null,
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.orders).toEqual([{ id: 8 }]);
    expect(result.current.diagText).toBe("Endpoint: - | Status: - | Time: -");
  });

  it("prevents duplicate in-flight refreshes", async () => {
    const { result } = await renderHook(() => useRealtimeDispatchRequests(true));
    await waitFor(() => {
      expect(mockGetNewDispatchRequests).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    mockGetNewDispatchRequests.mockClear();

    let resolveLoad!: (value: any[]) => void;
    mockGetNewDispatchRequests.mockReturnValueOnce(new Promise((resolve) => { resolveLoad = resolve; }));
    let firstRefresh!: Promise<void>;
    let secondRefresh!: Promise<void>;

    await act(async () => {
      firstRefresh = result.current.refresh();
      secondRefresh = result.current.refresh();
      await Promise.resolve();
    });

    expect(mockGetNewDispatchRequests).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLoad([{ id: 5 }] as any[]);
      await Promise.all([firstRefresh, secondRefresh]);
    });

    expect(mockGetNewDispatchRequests).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
  });
});
