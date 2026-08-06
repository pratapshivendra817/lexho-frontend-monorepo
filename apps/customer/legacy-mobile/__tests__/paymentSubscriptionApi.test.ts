const mockApi = { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() };
const mockParse = jest.fn((_error: unknown, fallback: string) => fallback);
const mockToError = jest.fn((_error: unknown, fallback: string) => new Error(fallback));

jest.mock("../src/api/client", () => ({
  api: {
    get: (...args: any[]) => (mockApi.get as any)(...args), post: (...args: any[]) => (mockApi.post as any)(...args),
    put: (...args: any[]) => (mockApi.put as any)(...args), delete: (...args: any[]) => (mockApi.delete as any)(...args),
  },
  parseApiError: (...args: any[]) => (mockParse as any)(...args),
  toApiError: (...args: any[]) => (mockToError as any)(...args),
  unwrapPayload: (data: any, fallback: any) => data?.data ?? data ?? fallback,
  extractList: (data: any) => Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.content) ? data.content : [],
}));

import { createPaymentOrder, getPaymentOptions, reportPaymentFailure, verifyPayment } from "../src/api/paymentApi";
import { cancelSubscription, getSubscriptionDetails, getSubscriptions, pauseSubscription, resumeSubscription } from "../src/api/subscriptionApi";
import { getCookSubscriptionPriceQuote, getSubscriptionPriceQuote, getSubscriptionPricing } from "../src/api/subscriptionPricingApi";
import { getSubscriptionVisits } from "../src/api/subscriptionVisitsApi";

describe("paymentApi", () => {
  beforeEach(() => { jest.clearAllMocks(); mockToError.mockImplementation((_e, f) => new Error(f)); mockParse.mockImplementation((_e, f) => f); });

  it("creates numeric and string booking orders and verifies payments", async () => {
    mockApi.post
      .mockResolvedValueOnce({ data: { data: { razorpayOrderId: "O1" } } })
      .mockResolvedValueOnce({ data: { razorpayOrderId: "O2" } })
      .mockResolvedValueOnce({ data: { verified: true } });
    await expect(createPaymentOrder({ bookingId: "42" }, "key")).resolves.toEqual({ razorpayOrderId: "O1" });
    expect(mockApi.post).toHaveBeenNthCalledWith(1, "/api/payments/create-order", { bookingId: 42 }, { headers: { "Idempotency-Key": "key" } });
    await createPaymentOrder({ bookingId: "B-2" }, "key2");
    expect(mockApi.post).toHaveBeenNthCalledWith(2, "/api/payments/create-order", { bookingId: "B-2" }, expect.any(Object));
    await expect(verifyPayment({} as any)).resolves.toEqual({ verified: true });
  });

  it("retries failure reporting and throws after all endpoints fail", async () => {
    mockApi.post.mockRejectedValueOnce(new Error("first")).mockRejectedValueOnce(new Error("second")).mockResolvedValueOnce({ data: { reported: true } });
    await expect(reportPaymentFailure({ bookingId: "B", errorCode: "E" })).resolves.toEqual({ reported: true });
    expect(mockApi.post).toHaveBeenCalledTimes(3);
    mockApi.post.mockRejectedValue(new Error("all"));
    await expect(reportPaymentFailure({})).rejects.toThrow("Payment failure report failed");
  });

  it("maps payment options from GET and POST fallbacks", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { paymentMethods: [
      { methodId: 1, code: "upi", title: "UPI", subtitle: "Fast" },
      { type: "card", displayName: "Card" },
      { name: "", label: "invalid" },
    ] } } });
    await expect(getPaymentOptions({ bookingId: "B", cartId: null, amount: 100 })).resolves.toMatchObject({ options: [
      { id: "1", mode: "UPI", label: "UPI", description: "Fast" },
      expect.objectContaining({ mode: "CARD" }),
    ] });
    mockApi.get.mockRejectedValue(new Error("get failed"));
    mockApi.post.mockResolvedValueOnce({ data: { items: [{ mode: "cash" }] } });
    await expect(getPaymentOptions({})).resolves.toMatchObject({ options: [expect.objectContaining({ mode: "CASH" })] });
    mockApi.post.mockRejectedValue(new Error("post failed"));
    await expect(getPaymentOptions({})).rejects.toThrow("Payment options unavailable");
  });

  it("normalizes create and verify failures", async () => {
    mockApi.post.mockRejectedValue(new Error("network"));
    await expect(createPaymentOrder({ bookingId: "1" }, "k")).rejects.toThrow("Payment order creation failed");
    await expect(verifyPayment({} as any)).rejects.toThrow("Payment verification failed");
  });
});

describe("subscription APIs", () => {
  beforeEach(() => { jest.clearAllMocks(); mockToError.mockImplementation((_e, f) => new Error(f)); mockParse.mockImplementation((_e, f) => f); });

  it("maps subscription list/detail values and pagination variants", async () => {
    const row = { subscriptionId: 2, subscriptionServiceType: "COOK", service: { name: "Cook" }, frequency: "Weekly", visitCount: "4", remainingVisits: "2", address: "Home", totalPrice: "800", canPause: true };
    mockApi.get
      .mockResolvedValueOnce({ data: { data: { items: [row], hasMore: true } } })
      .mockResolvedValueOnce({ data: { content: [row], last: true } })
      .mockResolvedValueOnce({ data: row });
    await expect(getSubscriptions({ page: 1 })).resolves.toMatchObject({ items: [expect.objectContaining({ id: "2", visits: 4, fullAddress: "Home", totalAmount: 800 })], hasMore: true });
    await expect(getSubscriptions()).resolves.toMatchObject({ hasMore: false });
    await expect(getSubscriptionDetails("2")).resolves.toMatchObject({ id: "2", serviceName: "Cook" });
  });

  it("calls lifecycle actions and normalizes all subscription failures", async () => {
    mockApi.post.mockResolvedValue({ data: { ok: true } });
    await expect(pauseSubscription("1")).resolves.toEqual({ ok: true });
    await expect(resumeSubscription("1")).resolves.toEqual({ ok: true });
    await expect(cancelSubscription("1")).resolves.toEqual({ ok: true });
    mockApi.get.mockRejectedValue(new Error("bad")); mockApi.post.mockRejectedValue(new Error("bad"));
    await expect(getSubscriptions()).rejects.toThrow("Failed to load subscriptions");
    await expect(getSubscriptionDetails("1")).rejects.toThrow("Failed to load subscription");
    await expect(pauseSubscription("1")).rejects.toThrow("Failed to pause subscription");
    await expect(resumeSubscription("1")).rejects.toThrow("Failed to resume subscription");
    await expect(cancelSubscription("1")).rejects.toThrow("Failed to cancel subscription");
  });

  it("filters and sorts subscription pricing and maps quotes", async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: [
        { id: 2, serviceId: null, durationHours: 2, perVisitPrice: "200", active: "yes" },
        { id: 1, serviceId: 5, durationHours: 1, perVisitPrice: 100, active: 1 },
        { durationHours: 0, perVisitPrice: 1 },
        { durationHours: 3, perVisitPrice: 300, active: false },
      ] })
      .mockResolvedValueOnce({ data: { serviceId: 5, durationHours: 2, perVisitPrice: 150, visits: 4, totalPrice: 600 } });
    await expect(getSubscriptionPricing(5)).resolves.toEqual([
      expect.objectContaining({ durationHours: 1 }), expect.objectContaining({ durationHours: 2 }),
    ]);
    await expect(getSubscriptionPriceQuote({ serviceId: 5, durationHours: 2, visits: 4 })).resolves.toMatchObject({ totalPrice: 600 });
  });

  it("uses direct, selected-row, and fallback cook pricing paths", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { pricePerVisit: 200, totalPrice: 800 } });
    await expect(getCookSubscriptionPriceQuote({ serviceId: 3, familySize: "SMALL", visits: 4 })).resolves.toMatchObject({ pricePerVisit: 200, totalPrice: 800 });
    mockApi.get.mockResolvedValueOnce({ data: [
      { familySize: "1_2", serviceId: null, perVisitPrice: 100, active: true },
      { familySize: "SMALL", serviceId: 3, perVisitPrice: 250, active: "active" },
    ] });
    await expect(getCookSubscriptionPriceQuote({ serviceId: 3, familySize: "SMALL", visits: 2 })).resolves.toMatchObject({ pricePerVisit: 250, totalPrice: 500 });
    mockApi.get.mockRejectedValueOnce(new Error("direct failed")).mockResolvedValueOnce({ data: { perVisitPrice: 75, visits: 2 } });
    await expect(getCookSubscriptionPriceQuote({ familySize: "MEDIUM", visits: 2 })).resolves.toMatchObject({ totalPrice: 150 });
  });

  it("throws pricing errors after exhausted attempts", async () => {
    mockApi.get.mockRejectedValue(new Error("none"));
    await expect(getSubscriptionPricing()).rejects.toThrow("Failed to fetch subscription pricing");
    await expect(getSubscriptionPriceQuote({ durationHours: 1, visits: 1 })).rejects.toThrow("Failed to calculate subscription price");
    await expect(getCookSubscriptionPriceQuote({ familySize: "XLARGE", visits: 1 })).rejects.toThrow("Failed to calculate cook subscription price");
  });

  it("maps grouped and flat subscription visits and errors", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: {
      upcomingVisits: [{ visitId: 1, booking: { id: 2 }, service: { name: "Cook" }, visitStatus: "scheduled", timeline: [{ title: "Created", createdAt: "now" }, { title: "" }] }],
      completedVisits: [{ bookingId: 3, totalAmount: "100" }], cancelledVisits: [],
    } } }).mockResolvedValueOnce({ data: { content: [{ id: 4, statusHistory: [{ label: "Done", status: "DONE" }] }] } });
    await expect(getSubscriptionVisits("S1")).resolves.toEqual([
      expect.objectContaining({ id: "1", section: "Upcoming Visits", status: "SCHEDULED" }),
      expect.objectContaining({ id: "3", section: "Completed Visits", amount: 100 }),
    ]);
    await expect(getSubscriptionVisits("S1")).resolves.toEqual([expect.objectContaining({ id: "4" })]);
    mockApi.get.mockRejectedValue(new Error("bad"));
    await expect(getSubscriptionVisits("S1")).rejects.toThrow("Failed to load subscription visits");
  });
});
