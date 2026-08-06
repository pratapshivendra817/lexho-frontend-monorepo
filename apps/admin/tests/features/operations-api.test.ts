import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.get,
  },
}));

import {
  fetchAuditLogDetail,
  fetchAuditLogs,
  fetchMonitoringDashboard,
  fetchWebhookEventDetail,
  fetchWebhookEvents,
} from "@/features/operations/api";

describe("operationsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes monitoring dashboard payloads from nested objects", async () => {
    mocks.get.mockResolvedValue({
      data: {
        data: {
          systemHealth: {
            system: "UP",
            api: "DEGRADED",
            redis: "DOWN",
            database: "UNKNOWN",
            checkedAt: "2026-07-15T09:00:00Z",
          },
          metrics: {
            ordersCreated: "10",
            ordersCompleted: 7,
            paymentsSuccess: "5",
            paymentsFailed: "2",
            partnerOnlineCount: "3",
          },
        },
      },
    });

    await expect(fetchMonitoringDashboard()).resolves.toEqual({
      health: {
        system: "UP",
        api: "DEGRADED",
        redis: "DOWN",
        database: "UNKNOWN",
        checkedAt: "2026-07-15T09:00:00Z",
      },
      metrics: {
        ordersCreated: 10,
        ordersCompleted: 7,
        paymentsSuccess: 5,
        paymentsFailed: 2,
        partnerOnlineCount: 3,
      },
    });

    expect(mocks.get).toHaveBeenCalledWith("/api/v1/admin/monitoring/dashboard");
  });

  it("falls back to root monitoring fields and default numbers", async () => {
    mocks.get.mockResolvedValue({
      data: {
        systemHealthStatus: "DOWN",
        apiHealth: "UP",
        redisHealth: "DEGRADED",
        dbHealth: "UP",
        checkedAt: 12345,
        ordersCreated: "oops",
      },
    });

    await expect(fetchMonitoringDashboard()).resolves.toEqual({
      health: {
        system: "DOWN",
        api: "UP",
        redis: "DEGRADED",
        database: "UP",
        checkedAt: "12345",
      },
      metrics: {
        ordersCreated: 0,
        ordersCompleted: 0,
        paymentsSuccess: 0,
        paymentsFailed: 0,
        partnerOnlineCount: 0,
      },
    });
  });

  it("normalizes object-based monitoring health fields and alternate metric names", async () => {
    mocks.get.mockResolvedValue({
      data: {
        result: {
          healthStatus: {
            overall: { status: "UP" },
            backend: { health: "DEGRADED" },
            cache: { state: "DOWN" },
            db: { value: "UP" },
            updatedAt: "2026-07-20T09:30:00Z",
          },
          counters: {
            createdOrders: "4",
            completedOrders: 3,
            successfulPayments: "2",
            failedPayments: 1,
            onlinePartners: "6",
          },
        },
      },
    });

    await expect(fetchMonitoringDashboard()).resolves.toEqual({
      health: {
        system: "UP",
        api: "DEGRADED",
        redis: "DOWN",
        database: "UP",
        checkedAt: "2026-07-20T09:30:00Z",
      },
      metrics: {
        ordersCreated: 4,
        ordersCompleted: 3,
        paymentsSuccess: 2,
        paymentsFailed: 1,
        partnerOnlineCount: 6,
      },
    });
  });

  it("maps flat aggregate monitoring payloads from the current backend response", async () => {
    mocks.get.mockResolvedValue({
      data: {
        data: {
          status: "UP",
          timestamp: "2026-07-20T15:39:37.988635400+05:30",
          completedBookings: 9,
          bookingCreationCount: 4,
          paymentFailureCount: 2,
        },
      },
    });

    await expect(fetchMonitoringDashboard()).resolves.toEqual({
      health: {
        system: "UP",
        api: "UP",
        redis: "UNKNOWN",
        database: "UNKNOWN",
        checkedAt: "2026-07-20T15:39:37.988635400+05:30",
      },
      metrics: {
        ordersCreated: 4,
        ordersCompleted: 9,
        paymentsSuccess: 0,
        paymentsFailed: 2,
        partnerOnlineCount: 0,
      },
    });
  });

  it("normalizes webhook event lists from wrapped arrays", async () => {
    mocks.get.mockResolvedValue({
      data: {
        content: [
          {
            eventId: "evt-1",
            type: "payment.captured",
            razorpayPaymentId: "pay_1",
            processingStatus: "SUCCESS",
            updatedAt: "2026-07-15T10:00:00Z",
            retries: "2",
            requestId: 100,
          },
          {
            webhookEventId: "evt-2",
            eventType: "refund.failed",
            paymentId: null,
            status: "",
            processedAt: "",
            retryCount: "bad",
            correlationId: 200,
          },
        ],
      },
    });

    await expect(fetchWebhookEvents({ search: "pay", eventType: "payment", status: "SUCCESS" })).resolves.toEqual([
      {
        id: "evt-1",
        eventType: "payment.captured",
        paymentId: "pay_1",
        status: "SUCCESS",
        processedAt: "2026-07-15T10:00:00Z",
        retryCount: 2,
        requestId: "100",
        correlationId: undefined,
      },
      {
        id: "evt-2",
        eventType: "refund.failed",
        paymentId: undefined,
        status: "",
        processedAt: undefined,
        retryCount: 0,
        requestId: undefined,
        correlationId: "200",
      },
    ]);

    expect(mocks.get).toHaveBeenCalledWith("/api/v1/admin/razorpay/webhooks", {
      params: { search: "pay", eventType: "payment", status: "SUCCESS" },
    });
  });

  it("normalizes webhook detail payloads and history", async () => {
    mocks.get.mockResolvedValue({
      data: {
        data: {
          event: {
            id: "evt-9",
            type: "payment.failed",
            razorpayPaymentId: "pay_9",
            processingStatus: "FAILED",
            retries: "3",
            eventPayload: { foo: "bar" },
            error: "gateway timeout",
            retryStatus: "RETRYING",
            processingHistory: [
              { id: "h1", status: "FAILED", errorMessage: "oops", createdAt: "2026-07-15T11:00:00Z" },
              { status: "", message: "", processedAt: "" },
            ],
          },
        },
      },
    });

    await expect(fetchWebhookEventDetail("evt-9")).resolves.toEqual({
      id: "",
      eventType: "",
      paymentId: undefined,
      status: "PENDING",
      processedAt: undefined,
      retryCount: 0,
      requestId: undefined,
      correlationId: undefined,
      payload: {},
      errorMessage: undefined,
      retryStatus: undefined,
      history: [],
    });

    expect(mocks.get).toHaveBeenCalledWith("/api/v1/admin/razorpay/webhooks/evt-9");
  });

  it("normalizes audit log lists", async () => {
    mocks.get.mockResolvedValue({
      data: {
        data: {
          logs: [
            {
              auditId: "a1",
              createdAt: "2026-07-15T08:00:00Z",
              adminName: "Admin",
              role: "SUPER_ADMIN",
              action: "CREATE",
              module: "BOOKING",
              referenceId: 321,
              correlationId: 99,
            },
          ],
        },
      },
    });

    await expect(fetchAuditLogs({ startDate: "2026-07-01", role: "SUPER_ADMIN" })).resolves.toEqual([
      {
        id: "a1",
        date: "2026-07-15T08:00:00Z",
        user: "Admin",
        role: "SUPER_ADMIN",
        action: "CREATE",
        entityType: "BOOKING",
        entityId: "321",
        requestId: undefined,
        correlationId: "99",
      },
    ]);

    expect(mocks.get).toHaveBeenCalledWith("/api/v1/admin/audit-logs", {
      params: { startDate: "2026-07-01", role: "SUPER_ADMIN" },
    });
  });

  it("normalizes audit detail payloads and change history", async () => {
    mocks.get.mockResolvedValue({
      data: {
        audit: {
          id: "a9",
          timestamp: "2026-07-15T07:00:00Z",
          username: "Ops",
          role: "OPERATIONS",
          action: "UPDATE",
          entityType: "PAYMENT",
          entityId: "pay_9",
          requestId: "req-1",
          oldValue: { before: true },
          newValue: { after: true },
          changes: [
            { field: "status", oldValue: "PENDING", newValue: "SUCCESS", createdAt: "2026-07-15T07:10:00Z" },
            { id: "c2", oldValue: null, newValue: "yes" },
          ],
        },
      },
    });

    await expect(fetchAuditLogDetail("a9")).resolves.toEqual({
      id: "a9",
      date: "2026-07-15T07:00:00Z",
      user: "Ops",
      role: "OPERATIONS",
      action: "UPDATE",
      entityType: "PAYMENT",
      entityId: "pay_9",
      requestId: "req-1",
      correlationId: undefined,
      oldValue: { before: true },
      newValue: { after: true },
      changeHistory: [
        {
          id: "0",
          field: "status",
          oldValue: "PENDING",
          newValue: "SUCCESS",
          changedAt: "2026-07-15T07:10:00Z",
        },
        {
          id: "c2",
          field: undefined,
          oldValue: null,
          newValue: "yes",
          changedAt: undefined,
        },
      ],
    });

    expect(mocks.get).toHaveBeenCalledWith("/api/v1/admin/audit-logs/a9");
  });
});
