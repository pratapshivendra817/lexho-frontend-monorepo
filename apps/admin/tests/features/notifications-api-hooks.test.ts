import { beforeEach, describe, expect, it, vi } from "vitest";

import { createQueryClientMock } from "./featureTestUtils";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.get,
    post: mocks.post,
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

import {
  getAdminNotificationById,
  getAdminNotificationStats,
  getAdminNotifications,
  retryAdminNotification,
  sendAdminNotification,
} from "@/features/notifications/api/notificationsApi";
import {
  useAdminNotificationDetailsQuery,
  useAdminNotificationMutations,
  useAdminNotificationsQuery,
  useAdminNotificationStatsQuery,
} from "@/features/notifications/hooks/useAdminNotifications";

describe("notifications api and hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQuery.mockImplementation((options) => options);
    mocks.useMutation.mockImplementation((options) => options);
  });

  it("maps notifications list payloads and pagination from nested data", async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        data: {
          notifications: [
            {
              notificationId: 9,
              title: "Hello",
              body: "Body",
              audience: "CUSTOMERS",
              type: "PROMO",
              channel: "PUSH",
              failedReason: "bad token",
              readCount: "4",
              clickCount: "2",
              scheduleTime: "2026-07-15T10:00:00Z",
            },
          ],
          total: "11",
          totalPages: "3",
          page: "2",
        },
      },
    });

    await expect(getAdminNotifications({ page: 2, size: 5 })).resolves.toEqual({
      content: [
        {
          id: "9",
          title: "Hello",
          message: "Body",
          userType: "CUSTOMERS",
          notificationType: "PROMO",
          channelType: "PUSH",
          status: "PENDING",
          city: undefined,
          service: undefined,
          createdAt: undefined,
          scheduledAt: "2026-07-15T10:00:00Z",
          readCount: 4,
          clickCount: 2,
          failureReason: "bad token",
        },
      ],
      totalElements: 11,
      totalPages: 3,
      pageNumber: 2,
    });
    expect(mocks.get).toHaveBeenCalledWith("/api/admin/notifications", {
      params: { page: 2, size: 5 },
    });
  });

  it("returns null for empty notification details and maps nested detail data", async () => {
    mocks.get.mockResolvedValueOnce({ data: {} }).mockResolvedValueOnce({
      data: {
        data: {
          id: "note-1",
          title: "Sent",
          message: "Done",
          userType: "PARTNERS",
          notificationType: "ALERT",
          channelType: "EMAIL",
          errorMessage: "none",
        },
      },
    });

    await expect(getAdminNotificationById("missing")).resolves.toBeNull();
    await expect(getAdminNotificationById("note-1")).resolves.toMatchObject({
      id: "note-1",
      title: "Sent",
      message: "Done",
      failureReason: "none",
    });
  });

  it("retries notification create requests across fallback endpoints and payload shapes", async () => {
    const retriableError = { isAxiosError: true, response: { status: 404, data: { message: "missing" } } };
    mocks.post
      .mockRejectedValueOnce(retriableError)
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 422, data: { message: "bad payload" } } })
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 500, data: { message: "server" } } })
      .mockResolvedValueOnce({ status: 201 });

    await expect(
      sendAdminNotification({
        title: "Offer",
        message: "Promo",
        targetUserType: "customers",
        channels: ["EMAIL"],
        scheduledTime: "2026-07-16 10:30",
      } as never),
    ).resolves.toBeUndefined();

    expect(mocks.post).toHaveBeenNthCalledWith(1, "/api/admin/notifications", expect.objectContaining({ title: "Offer" }));
    expect(mocks.post).toHaveBeenNthCalledWith(4, "/api/admin/notifications/send", expect.objectContaining({
      targetUserType: "CUSTOMER",
      channelType: "EMAIL",
      scheduleTime: expect.any(String),
    }));
  });

  it("stops retrying notifications for non-retriable or non-axios errors", async () => {
    const authError = { isAxiosError: true, response: { status: 401 } };
    mocks.post.mockRejectedValueOnce(authError);
    await expect(sendAdminNotification({ title: "A" } as never)).rejects.toBe(authError);
    expect(mocks.post).toHaveBeenCalledTimes(1);

    const networkError = new Error("offline");
    mocks.post.mockReset();
    mocks.post.mockRejectedValueOnce(networkError);
    await expect(sendAdminNotification({ title: "B" } as never)).rejects.toThrow("offline");
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });

  it("retries by id and maps notification stats fallbacks", async () => {
    mocks.post.mockResolvedValueOnce({ status: 200 });
    mocks.get.mockResolvedValueOnce({
      data: {
        totalSent: "7",
        totalFailed: 1,
        totalRead: "3",
        totalPending: 2,
        totalClicked: "6",
        channelWiseStats: [{ channel: "PUSH", count: "5" }],
        trend: [{ date: "2026-07-16", sent: "2", failed: "1", read: "1" }],
      },
    });

    await expect(retryAdminNotification("42")).resolves.toBeUndefined();
    expect(mocks.post).toHaveBeenCalledWith("/api/admin/notifications/42/retry");

    await expect(getAdminNotificationStats()).resolves.toEqual({
      totalSent: 7,
      totalFailed: 1,
      totalRead: 3,
      totalPending: 2,
      totalClicked: 6,
      channelWiseStats: [{ name: "PUSH", value: 5 }],
      trend: [{ label: "2026-07-16", sent: 2, failed: 1, read: 1 }],
    });
  });

  it("configures notifications queries and invalidates caches after mutations", async () => {
    const queryClient = createQueryClientMock();
    mocks.useQueryClient.mockReturnValue(queryClient);

    const listQuery = useAdminNotificationsQuery({ page: 1, size: 10 });
    expect(listQuery.queryKey).toEqual(["admin-notifications", { page: 1, size: 10 }]);
    expect(listQuery.retry).toBe(false);
    expect(listQuery.placeholderData?.("old")).toBe("old");

    const detailsQuery = useAdminNotificationDetailsQuery(undefined);
    expect(detailsQuery.enabled).toBe(false);

    const statsQuery = useAdminNotificationStatsQuery();
    expect(statsQuery.queryKey).toEqual(["admin-notification-stats"]);
    expect(statsQuery.refetchInterval).toBe(30000);

    const mutations = useAdminNotificationMutations();
    await mutations.sendMutation.onSuccess?.(undefined, undefined as never, undefined);
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ["admin-notifications"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ["admin-notification-stats"],
    });
  });
});
