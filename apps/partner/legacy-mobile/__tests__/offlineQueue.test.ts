import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  enqueueOfflineAction,
  flushOfflineQueue,
  getOfflineQueueSize,
  registerOfflineHandler,
  startOfflineQueueAutoRetry,
} from "../src/services/offlineQueue";

const mockIsNetworkOnline = jest.fn(async () => true);
const mockSubscribeNetworkStatus = jest.fn();

jest.mock("../src/services/networkService", () => ({
  isNetworkOnline: () => mockIsNetworkOnline(),
  subscribeNetworkStatus: (listener: (online: boolean) => void) => mockSubscribeNetworkStatus(listener),
  getCurrentNetworkStatus: jest.fn(() => true),
}));

describe("offlineQueue", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    await AsyncStorage.clear();
    mockIsNetworkOnline.mockResolvedValue(true);
    mockSubscribeNetworkStatus.mockImplementation(() => jest.fn());
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("queues and flushes actions", async () => {
    const handler = jest.fn(async () => undefined);
    registerOfflineHandler("accept_order", handler);

    await enqueueOfflineAction("accept_order", { requestId: 99 });
    expect(await getOfflineQueueSize()).toBe(1);

    const processed = await flushOfflineQueue();
    expect(processed).toBe(1);
    expect(handler).toHaveBeenCalledWith({ requestId: 99 });
    expect(await getOfflineQueueSize()).toBe(0);
  });

  it("keeps failed or unhandled items and returns zero when offline or storage is invalid", async () => {
    const okHandler = jest.fn(async () => undefined);
    const failHandler = jest.fn(async () => {
      throw new Error("retry later");
    });
    registerOfflineHandler("accept_order", okHandler);
    registerOfflineHandler("reject_order", failHandler);

    await enqueueOfflineAction("accept_order", { requestId: 1 });
    await enqueueOfflineAction("reject_order", { requestId: 2 });
    await enqueueOfflineAction("update_location", { latitude: 1 });

    expect(await flushOfflineQueue()).toBe(1);
    expect(okHandler).toHaveBeenCalledWith({ requestId: 1 });
    expect(failHandler).toHaveBeenCalledWith({ requestId: 2 });
    expect(await getOfflineQueueSize()).toBe(2);

    mockIsNetworkOnline.mockResolvedValueOnce(false);
    expect(await flushOfflineQueue()).toBe(0);

    await AsyncStorage.setItem("partner_offline_queue_v1", "{bad-json");
    expect(await getOfflineQueueSize()).toBe(0);
    expect(await flushOfflineQueue()).toBe(0);
  });

  it("trims the queue to the latest 100 items", async () => {
    for (let index = 0; index < 101; index += 1) {
      await enqueueOfflineAction("update_profile", { index });
    }

    expect(await getOfflineQueueSize()).toBe(100);
  });

  it("subscribes to network changes, flushes on reconnect, and reports queue size", async () => {
    const handler = jest.fn(async () => undefined);
    const status = jest.fn();
    let listener: ((online: boolean) => void) | undefined;
    const unsubscribe = jest.fn();
    registerOfflineHandler("accept_order", handler);
    mockSubscribeNetworkStatus.mockImplementation((cb) => {
      listener = cb;
      return unsubscribe;
    });

    await enqueueOfflineAction("accept_order", { requestId: 99 });
    const stop = startOfflineQueueAutoRetry(status);
    await jest.advanceTimersByTimeAsync(0);
    expect(status).toHaveBeenCalledWith(1);

    listener?.(false);
    expect(handler).not.toHaveBeenCalled();

    listener?.(true);
    await jest.advanceTimersByTimeAsync(0);
    expect(handler).toHaveBeenCalledWith({ requestId: 99 });
    expect(status).toHaveBeenLastCalledWith(0);

    stop();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
