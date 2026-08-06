import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.get,
    post: mocks.post,
  },
}));

describe("admin-payments api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps dashboard payloads from nested and fallback object keys", async () => {
    mocks.get
      .mockResolvedValueOnce({
        data: {
          dashboard: {
            createdCount: "3",
            paid: 8,
            failedCount: "x",
            refunded: 2,
            totalPaidAmount: "456.5",
            totalRefunded: "11",
          },
        },
      })
      .mockResolvedValueOnce({ data: {} });

    const { fetchAdminPaymentDashboard } = await import("@/features/admin-payments/api");

    await expect(fetchAdminPaymentDashboard()).resolves.toEqual({
      createdAttempts: 3,
      paidAttempts: 8,
      failedAttempts: 0,
      refundedAttempts: 2,
      paidAmount: 456.5,
      processedRefundAmount: 11,
    });
    await expect(fetchAdminPaymentDashboard()).resolves.toEqual({
      createdAttempts: 0,
      paidAttempts: 0,
      failedAttempts: 0,
      refundedAttempts: 0,
      paidAmount: 0,
      processedRefundAmount: 0,
    });
  });

  it("maps transactions, params, totals, and pagination fallbacks", async () => {
    mocks.get
      .mockResolvedValueOnce({
        data: {
          data: {
            transactions: [
              {
                paymentAttemptId: 1,
                booking: { id: 77 },
                paymentStatus: "PAID",
                paidAmount: "900.5",
                orderId: "order-1",
                paymentId: "pay-1",
                attemptedAt: "2026-01-01T10:00:00Z",
              },
            ],
            total: "6",
            totalPages: "4",
            number: "2",
          },
        },
      })
      .mockResolvedValueOnce({
        data: [{ id: "raw", bookingId: "b2", status: "FAILED", amount: "bad" }],
      });

    const { fetchAdminPaymentTransactions } = await import("@/features/admin-payments/api");

    await expect(fetchAdminPaymentTransactions({ bookingId: "77", status: "PAID", page: 1, size: 10 })).resolves.toEqual({
      content: [
        {
          id: "1",
          bookingId: "77",
          status: "PAID",
          amount: 900.5,
          currency: "INR",
          razorpayOrderId: "order-1",
          razorpayPaymentId: "pay-1",
          createdAt: "2026-01-01T10:00:00Z",
          updatedAt: "",
        },
      ],
      totalElements: 6,
      totalPages: 4,
      pageNumber: 2,
    });
    expect(mocks.get).toHaveBeenNthCalledWith(1, "/api/v1/admin/payments/transactions", {
      params: { bookingId: "77", status: "PAID", page: 1, size: 10 },
    });

    await expect(fetchAdminPaymentTransactions({ bookingId: "", status: "", page: 0, size: 20 })).resolves.toEqual({
      content: [
        {
          id: "raw",
          bookingId: "b2",
          status: "FAILED",
          amount: 0,
          currency: "INR",
          razorpayOrderId: "",
          razorpayPaymentId: "",
          createdAt: "",
          updatedAt: "",
        },
      ],
      totalElements: 1,
      totalPages: 1,
      pageNumber: 0,
    });
  });

  it("maps booking detail and reconcile responses, including empty reconcile fallback fetch", async () => {
    mocks.get
      .mockResolvedValueOnce({
        data: {
          payment: {
            status: "PAID",
            amount: "1200",
            currency: "",
            orderId: "order-5",
            paymentId: "payment-5",
            transactions: [
              { transactionId: "tx-1", bookingId: "b5", status: "PAID", amount: 1200, currency: "INR", createdAt: "t1", updatedAt: "t2" },
            ],
            refunds: [
              { refundId: "rf-1", refundAmount: "300", status: "DONE", reason: "duplicate", updatedAt: "t3" },
            ],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          item: {
            bookingId: "b7",
            paymentStatus: "REFUNDED",
            amount: "500",
            razorpayOrderId: "order-7",
            razorpayPaymentId: "payment-7",
            attempts: [],
            refunds: [],
          },
        },
      });
    mocks.post
      .mockResolvedValueOnce({ data: { result: { bookingId: "b6", status: "CREATED", amount: "250" } } })
      .mockResolvedValueOnce({ data: {} });

    const {
      fetchAdminBookingPaymentDetail,
      reconcileAdminBookingPayment,
      createAdminBookingRefund,
    } = await import("@/features/admin-payments/api");

    await expect(fetchAdminBookingPaymentDetail("b5")).resolves.toEqual({
      bookingId: "b5",
      paymentStatus: "PAID",
      amount: 1200,
      currency: "INR",
      razorpayOrderId: "order-5",
      razorpayPaymentId: "payment-5",
      attempts: [
        {
          id: "tx-1",
          bookingId: "b5",
          status: "PAID",
          amount: 1200,
          currency: "INR",
          razorpayOrderId: "",
          razorpayPaymentId: "",
          createdAt: "t1",
          updatedAt: "t2",
        },
      ],
      refunds: [
        {
          id: "rf-1",
          amount: 300,
          status: "DONE",
          reason: "duplicate",
          razorpayRefundId: "rf-1",
          createdAt: "",
          processedAt: "t3",
        },
      ],
    });

    await expect(reconcileAdminBookingPayment("b6")).resolves.toEqual({
      bookingId: "b6",
      paymentStatus: "CREATED",
      amount: 250,
      currency: "INR",
      razorpayOrderId: "",
      razorpayPaymentId: "",
      attempts: [],
      refunds: [],
    });

    await expect(reconcileAdminBookingPayment("b7")).resolves.toEqual({
      bookingId: "b7",
      paymentStatus: "REFUNDED",
      amount: 500,
      currency: "INR",
      razorpayOrderId: "order-7",
      razorpayPaymentId: "payment-7",
      attempts: [],
      refunds: [],
    });

    await createAdminBookingRefund("b5", { amount: 100, reason: "customer request", idempotencyKey: "idem-1" });
    expect(mocks.post).toHaveBeenLastCalledWith(
      "/api/v1/admin/payments/bookings/b5/refunds",
      { amount: 100, reason: "customer request" },
      { headers: { "Idempotency-Key": "idem-1" } },
    );
  });

  it("covers detail and reconcile fallbacks for nested items, booking id defaults, and refund id variants", async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        data: {
          paidAmount: "75",
          status: "FAILED",
          currency: "USD",
          orderId: "ord-fallback",
          paymentId: "pay-fallback",
          attempts: [
            {
              razorpayPaymentId: "pay-fallback",
              bookingId: 91,
              paymentStatus: "FAILED",
              paidAmount: "75",
              currency: "USD",
              attemptedAt: "attempted-at",
            },
          ],
          refunds: [
            {
              id: "refund-direct-id",
              amount: "25",
              reason: "manual",
              createdAt: "created-at",
              processedAt: "processed-at",
            },
          ],
        },
      },
    });
    mocks.post.mockResolvedValueOnce({
      data: {
        payment: {
          paidAmount: "42",
          razorpayOrderId: "ord-42",
          razorpayPaymentId: "pay-42",
          refunds: [],
          transactions: [],
        },
      },
    });

    const { fetchAdminBookingPaymentDetail, reconcileAdminBookingPayment } = await import("@/features/admin-payments/api");

    await expect(fetchAdminBookingPaymentDetail("booking-fallback")).resolves.toEqual({
      bookingId: "booking-fallback",
      paymentStatus: "FAILED",
      amount: 75,
      currency: "USD",
      razorpayOrderId: "ord-fallback",
      razorpayPaymentId: "pay-fallback",
      attempts: [
        {
          id: "pay-fallback",
          bookingId: "91",
          status: "FAILED",
          amount: 75,
          currency: "USD",
          razorpayOrderId: "",
          razorpayPaymentId: "pay-fallback",
          createdAt: "attempted-at",
          updatedAt: "",
        },
      ],
      refunds: [
        {
          id: "refund-direct-id",
          amount: 25,
          status: "",
          reason: "manual",
          razorpayRefundId: "",
          createdAt: "created-at",
          processedAt: "processed-at",
        },
      ],
    });

    await expect(reconcileAdminBookingPayment("booking-42")).resolves.toEqual({
      bookingId: "booking-42",
      paymentStatus: "",
      amount: 42,
      currency: "INR",
      razorpayOrderId: "ord-42",
      razorpayPaymentId: "pay-42",
      attempts: [],
      refunds: [],
    });
  });
});
