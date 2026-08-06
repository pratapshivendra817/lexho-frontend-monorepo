jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  cacheOrderDetails,
  cacheOrderList,
  getCachedOrderDetails,
  getCachedOrderList,
  isCacheStale,
} from "./orderCacheService";

describe("orderCacheService", () => {
  const baseNow = 1_700_000_000_000;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(baseNow);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("caches the order list with an envelope", async () => {
    const orders = [{ id: 1 }, { id: 2 }] as any;

    await cacheOrderList("newOrders", orders);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "partner_orders_cache:newOrders",
      JSON.stringify({
        updatedAt: baseNow,
        data: orders,
      }),
    );
  });

  it("reads a cached order list envelope", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ updatedAt: baseNow, data: [{ id: 10 }] }),
    );

    await expect(getCachedOrderList("history")).resolves.toEqual({
      updatedAt: baseNow,
      data: [{ id: 10 }],
    });
    expect(AsyncStorage.getItem).toHaveBeenCalledWith("partner_orders_cache:history");
  });

  it("returns null for missing or corrupted cached order lists", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce("{bad json");

    await expect(getCachedOrderList("newOrders")).resolves.toBeNull();
    await expect(getCachedOrderList("history")).resolves.toBeNull();
  });

  it("caches and reads order details", async () => {
    const order = { id: 99, total: 500 } as any;
    await cacheOrderDetails(order);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "partner_order_details_99",
      JSON.stringify({
        updatedAt: baseNow,
        data: order,
      }),
    );

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ updatedAt: baseNow - 1000, data: order }),
    );
    await expect(getCachedOrderDetails(99)).resolves.toEqual({
      updatedAt: baseNow - 1000,
      data: order,
    });
  });

  it("returns null for invalid order-details cache payloads", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("not-json");

    await expect(getCachedOrderDetails(101)).resolves.toBeNull();
  });

  it("detects stale and fresh cache envelopes", () => {
    expect(isCacheStale(baseNow - 5 * 60 * 1000 - 1)).toBe(true);
    expect(isCacheStale(baseNow - 5 * 60 * 1000)).toBe(false);
  });
});
