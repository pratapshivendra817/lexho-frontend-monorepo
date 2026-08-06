const mockApi = {
  get: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  post: jest.fn(),
};
const mockParseError = jest.fn((_error: unknown, fallback: string) => fallback);

jest.mock("../src/api/client", () => ({
  api: {
    get: (...args: any[]) => mockApi.get(...args),
    patch: (...args: any[]) => mockApi.patch(...args),
    delete: (...args: any[]) => mockApi.delete(...args),
    post: (...args: any[]) => mockApi.post(...args),
  },
  parseApiError: (error: unknown, fallback: string) =>
    mockParseError(error, fallback),
}));

import {
  deleteNotification,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  sendTestNotification,
} from "../src/api/notificationApi";

describe("notificationApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    { data: { data: { content: [{ id: "1" }] } } },
    { data: { data: { items: [{ id: "1" }] } } },
    { data: { data: { rows: [{ id: "1" }] } } },
    { data: { data: { notifications: [{ id: "1" }] } } },
    { data: { data: [{ id: "1" }] } },
    { data: { content: [{ id: "1" }] } },
    { data: { items: [{ id: "1" }] } },
    { data: { rows: [{ id: "1" }] } },
    { data: { notifications: [{ id: "1" }] } },
    { payload: { content: [{ id: "1" }] } },
    { payload: { items: [{ id: "1" }] } },
    { payload: { rows: [{ id: "1" }] } },
    { content: [{ id: "1" }] },
    { items: [{ id: "1" }] },
    { rows: [{ id: "1" }] },
    { notifications: [{ id: "1" }] },
    [{ id: "1" }],
  ])("extracts supported notification response shapes", async (response) => {
    mockApi.get.mockResolvedValueOnce({ data: response });
    await expect(
      getNotifications({ userId: 12, page: 2, size: 25 }),
    ).resolves.toEqual([{ id: "1" }]);
  });

  it("probes compatible endpoints and returns empty fallback response", async () => {
    mockApi.get
      .mockRejectedValueOnce(new Error("customer endpoint unavailable"))
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: { invalid: true } });

    await expect(
      getNotifications({ userId: 12, page: Number.NaN, size: Number.NaN }),
    ).resolves.toEqual([]);
    expect(mockApi.get).toHaveBeenNthCalledWith(2, "/api/notifications", {
      params: {
        page: 0,
        size: 50,
        userId: 12,
        customerId: 12,
        targetUserType: "CUSTOMER",
        appType: "CUSTOMER",
      },
    });
  });

  it("normalizes list failures after all endpoint attempts", async () => {
    mockApi.get.mockRejectedValue(new Error("network"));
    await expect(getNotifications()).rejects.toThrow(
      "Failed to load notifications",
    );
  });

  it("marks read, deletes, counts unread and sends test notifications", async () => {
    mockApi.patch.mockResolvedValue({ data: { read: true } });
    mockApi.delete.mockResolvedValue({ data: { deleted: true } });
    mockApi.get
      .mockResolvedValueOnce({ data: { count: 4 } })
      .mockResolvedValueOnce({ data: { data: { count: 3 } } })
      .mockResolvedValueOnce({ data: {} });
    mockApi.post.mockResolvedValue({ data: { sent: true } });

    await expect(markNotificationRead("a b")).resolves.toEqual({ read: true });
    await expect(deleteNotification(" a b ")).resolves.toEqual({
      deleted: true,
    });
    await expect(getUnreadNotificationCount()).resolves.toBe(4);
    await expect(getUnreadNotificationCount()).resolves.toBe(3);
    await expect(getUnreadNotificationCount()).resolves.toBe(0);
    await expect(sendTestNotification({ userId: 12 })).resolves.toEqual({
      sent: true,
    });

    expect(mockApi.patch).toHaveBeenCalledWith(
      "/api/customer/notifications/a%20b/read",
    );
    expect(mockApi.delete).toHaveBeenCalledWith(
      "/api/customer/notifications/a%20b",
    );
    expect(mockApi.post).toHaveBeenCalledWith("/api/notifications/send", {
      userId: 12,
      title: "Test Notification",
      message: "Push working from backend",
      data: { redirectType: "NOTIFICATIONS", bookingId: "BKG123" },
    });
  });

  it("uses supplied test notification content", async () => {
    mockApi.post.mockResolvedValue({ data: { sent: true } });
    await sendTestNotification({
      userId: 9,
      title: "Booking",
      message: "Confirmed",
      data: { redirectType: "BOOKING" },
    });
    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/notifications/send",
      expect.objectContaining({
        title: "Booking",
        message: "Confirmed",
        data: { redirectType: "BOOKING" },
      }),
    );
  });

  it("rejects missing ids and normalizes action failures", async () => {
    await expect(deleteNotification()).rejects.toThrow(
      "Notification id missing",
    );
    mockApi.patch.mockRejectedValueOnce(new Error("timeout"));
    mockApi.get.mockRejectedValueOnce(new Error("network"));
    mockApi.delete.mockRejectedValueOnce(new Error("network"));
    mockApi.post.mockRejectedValueOnce(new Error("network"));

    await expect(markNotificationRead("1")).rejects.toThrow(
      "Failed to mark read",
    );
    await expect(getUnreadNotificationCount()).rejects.toThrow(
      "Failed to load unread count",
    );
    await expect(deleteNotification("1")).rejects.toThrow(
      "Failed to delete notification",
    );
    await expect(sendTestNotification({ userId: 1 })).rejects.toThrow(
      "Failed to send test notification",
    );
  });
});
