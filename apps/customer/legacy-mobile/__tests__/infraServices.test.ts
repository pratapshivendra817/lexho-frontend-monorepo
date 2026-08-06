export {};

const asyncStorage = require("@react-native-async-storage/async-storage");
const mockApiRequest = jest.fn();
const mockTrackScreenView = jest.fn();

jest.mock("../src/api/client", () => ({
  api: {
    request: (...args: any[]) => mockApiRequest(...args),
  },
}));

jest.mock("../src/services/firebaseAnalytics", () => ({
  trackScreenView: (...args: any[]) => mockTrackScreenView(...args),
}));

describe("infra services", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await asyncStorage.clear();
  });

  it("stores and reads cached entries with age metadata", async () => {
    const { cacheManager } = require("../src/services/cacheManager");

    await cacheManager.set("booking-list", [{ id: 1 }]);

    await expect(cacheManager.get("booking-list", 1000)).resolves.toEqual([{ id: 1 }]);
    const entry = await cacheManager.getEntry("booking-list");
    expect(entry?.cachedAt).toEqual(expect.any(Number));
  });

  it("queues offline actions and flushes successful replays", async () => {
    const { offlineQueue } = require("../src/services/offlineQueue");
    mockApiRequest.mockResolvedValue({ data: { ok: true } });

    await offlineQueue.enqueue({
      type: "booking:create",
      endpoint: "/api/v1/bookings/create",
      method: "post",
      payload: { serviceId: 10 },
    });

    const beforeFlush = await offlineQueue.getItems();
    expect(beforeFlush).toHaveLength(1);

    const failed = await offlineQueue.flush();

    expect(failed).toEqual([]);
    expect(mockApiRequest).toHaveBeenCalledWith({
      url: "/api/v1/bookings/create",
      method: "post",
      data: { serviceId: 10 },
    });
    await expect(offlineQueue.getItems()).resolves.toEqual([]);
  });

  it("tracks only unique supported navigation screens", async () => {
    const { resetTrackedScreen, trackNavigationScreen } = require("../src/services/screenTrackingService");
    const dispatch = jest.fn();

    resetTrackedScreen();
    await trackNavigationScreen("Home", dispatch);
    await trackNavigationScreen("Home", dispatch);
    await trackNavigationScreen("ServiceList", dispatch);
    await trackNavigationScreen("UnknownScreen", dispatch);

    expect(mockTrackScreenView).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it("classifies network and server failures for offline handling", async () => {
    const { isNetworkError } = require("../src/services/networkService");

    expect(isNetworkError({ code: "ERR_NETWORK" })).toBe(true);
    expect(isNetworkError({ response: { status: 503 } })).toBe(true);
    expect(isNetworkError({ message: "Network Error" })).toBe(true);
    expect(isNetworkError({ response: { status: 400 } })).toBe(false);
  });
});
