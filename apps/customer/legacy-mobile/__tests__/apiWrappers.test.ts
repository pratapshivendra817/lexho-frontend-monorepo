const mockApi = { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() };
const mockParse = jest.fn((_error: unknown, fallback: string) => fallback);
const mockToError = jest.fn((_error: unknown, fallback: string) => new Error(fallback));
const mockUnwrap = jest.fn((data: any, fallback: any) => data?.data ?? data ?? fallback);
const mockExtract = jest.fn((data: any) => Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.content) ? data.content : []);

jest.mock("../src/api/client", () => ({
  api: {
    get: (...args: any[]) => (mockApi.get as any)(...args), post: (...args: any[]) => (mockApi.post as any)(...args),
    put: (...args: any[]) => (mockApi.put as any)(...args), patch: (...args: any[]) => (mockApi.patch as any)(...args),
    delete: (...args: any[]) => (mockApi.delete as any)(...args),
  },
  parseApiError: (...args: any[]) => (mockParse as any)(...args),
  toApiError: (...args: any[]) => (mockToError as any)(...args),
  unwrapPayload: (...args: any[]) => (mockUnwrap as any)(...args),
  extractList: (...args: any[]) => (mockExtract as any)(...args),
}));

import { applyCoupon, getCoupons } from "../src/api/couponApi";
import { addFavorite, getFavorites, removeFavorite } from "../src/api/favoritesApi";
import { applyReferral, generateReferral } from "../src/api/referralApi";
import { getPaymentStatus, refundPayment, retryPayment } from "../src/api/paymentExtrasApi";
import { addReview, createReview, deleteReview, getReviews, getServiceReviews, reportReview, submitCustomerReview, updateReview } from "../src/api/reviewApi";
import { createSupportTicket, getSupportFaqCategories, getSupportHistory } from "../src/api/supportApi";
import { getCleaningCoverage } from "../src/api/cleaningCoverageApi";
import { getCookCoverage, getDisplayCookCoverageItems } from "../src/api/cookCoverageApi";
import { getCookFamilySizes } from "../src/api/cookFamilySizeApi";
import { createSubscriptionBooking } from "../src/api/subscriptionBookingApi";

describe("small API wrappers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParse.mockImplementation((_error, fallback) => fallback);
    mockToError.mockImplementation((_error, fallback) => new Error(fallback));
    mockUnwrap.mockImplementation((data, fallback) => data?.data ?? data ?? fallback);
    mockExtract.mockImplementation(data => Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.content) ? data.content : []);
  });

  it("covers coupon, favorite, referral, and payment CRUD requests", async () => {
    mockApi.post.mockResolvedValue({ data: { ok: true } });
    mockApi.get.mockResolvedValue({ data: { data: [{ id: "1" }] } });
    mockApi.delete.mockResolvedValue({ data: { removed: true } });
    await expect(applyCoupon({ code: "SAVE" } as any)).resolves.toEqual({ ok: true });
    await expect(getCoupons()).resolves.toEqual([{ id: "1" }]);
    await expect(addFavorite({ serviceId: "1" } as any)).resolves.toEqual({ ok: true });
    await expect(getFavorites()).resolves.toEqual([{ id: "1" }]);
    await expect(removeFavorite("1")).resolves.toEqual({ removed: true });
    await expect(generateReferral()).resolves.toEqual({ ok: true });
    await expect(applyReferral({ code: "REF" } as any)).resolves.toEqual({ ok: true });
    await expect(getPaymentStatus("B1")).resolves.toEqual({ data: [{ id: "1" }] });
    await expect(retryPayment("B1")).resolves.toEqual({ ok: true });
    await expect(refundPayment({ bookingId: "B1" } as any)).resolves.toEqual({ ok: true });
    expect(mockApi.delete).toHaveBeenCalledWith("/api/favorites/remove", { data: { id: "1" } });
  });

  it("normalizes empty list responses and all simple-wrapper errors", async () => {
    mockApi.get.mockResolvedValue({ data: {} });
    await expect(getCoupons()).resolves.toEqual([]);
    await expect(getFavorites()).resolves.toEqual([]);
    const calls = [
      () => applyCoupon({} as any), () => getCoupons(), () => addFavorite({} as any), () => getFavorites(),
      () => removeFavorite("1"), () => generateReferral(), () => applyReferral({} as any),
      () => getPaymentStatus("B"), () => retryPayment("B"), () => refundPayment({} as any),
    ];
    mockApi.get.mockRejectedValue(new Error("network"));
    mockApi.post.mockRejectedValue(new Error("network"));
    mockApi.delete.mockRejectedValue(new Error("network"));
    for (const call of calls) await expect(call()).rejects.toThrow();
  });

  it("covers review aliases, payload variants, and failures", async () => {
    mockApi.post.mockResolvedValue({ data: { id: "R1" } });
    mockApi.get.mockResolvedValue({ data: [{ id: "R1" }] });
    mockApi.delete.mockResolvedValue({ data: { deleted: true } });
    await expect(addReview({ rating: 5 } as any)).resolves.toEqual({ id: "R1" });
    await expect(getServiceReviews("S1")).resolves.toEqual([{ id: "R1" }]);
    await expect(submitCustomerReview({ bookingId: "B1" } as any)).resolves.toEqual({ id: "R1" });
    await getReviews();
    await createReview({ rating: 4 });
    await updateReview("R1", { rating: 3 });
    await updateReview({ id: "R2", rating: 2 });
    await deleteReview("R1");
    await deleteReview({ id: "R2" });
    await reportReview("R1");
    await reportReview({ id: "R2" });
    expect(mockApi.get).toHaveBeenCalledWith("/api/reviews/service/svc-1");
    mockApi.get.mockRejectedValue(new Error("bad"));
    mockApi.post.mockRejectedValue(new Error("bad"));
    mockApi.delete.mockRejectedValue(new Error("bad"));
    await expect(getServiceReviews("S")).rejects.toThrow("Reviews failed");
    await expect(addReview({} as any)).rejects.toThrow("Add review failed");
    await expect(submitCustomerReview({} as any)).rejects.toThrow("Review submit failed");
    await expect(deleteReview("R")).rejects.toThrow("Delete review failed");
    await expect(reportReview("R")).rejects.toThrow("Report review failed");
  });

  it("normalizes support history and sorted FAQ endpoint fallbacks", async () => {
    mockApi.post.mockResolvedValue({ data: { id: "T1" } });
    await expect(createSupportTicket({ subject: "Help" } as any)).resolves.toEqual({ id: "T1" });
    mockApi.get.mockResolvedValueOnce({ data: { data: [{ id: "T1" }] } });
    await expect(getSupportHistory()).resolves.toEqual([{ id: "T1" }]);
    mockApi.get
      .mockRejectedValueOnce(new Error("first"))
      .mockResolvedValueOnce({ data: { content: [{ id: "empty", label: "Empty", faqs: [] }] } })
      .mockResolvedValueOnce({ data: { payload: { data: [
        { id: "billing", title: "Billing", displayOrder: 2, items: [{ title: " Pay? ", description: " Online ", position: 2 }, { question: "", answer: "bad" }] },
        { key: "general", name: "General", order: 1, faqs: [{ id: 4, question: " When? ", answer: " Today ", displayOrder: 1 }] },
      ] } } });
    await expect(getSupportFaqCategories()).resolves.toEqual([
      expect.objectContaining({ id: "general", label: "General" }),
      expect.objectContaining({ id: "billing", label: "Billing" }),
    ]);
    mockApi.get.mockRejectedValue(new Error("none"));
    await expect(getSupportFaqCategories()).resolves.toEqual([]);
  });

  it("validates and filters cleaning coverage", async () => {
    mockApi.get.mockResolvedValue({ data: [
      { durationHours: "2", reference: " Standard ", tasks: [{ name: " Mop ", icon: "mop", estimatedMinutes: "30" }, { name: "", icon: "x", estimatedMinutes: 1 }] },
      { active: false, durationHours: 1, reference: "Off", tasks: [{ name: "A", icon: "a", estimatedMinutes: 1 }] },
      { durationHours: "bad", reference: "Bad", tasks: [] },
    ] });
    await expect(getCleaningCoverage(2)).resolves.toEqual([{ durationHours: 2, reference: "Standard", tasks: [{ name: "Mop", icon: "mop", estimatedMinutes: 30 }] }]);
    expect(mockApi.get).toHaveBeenCalledWith("/api/cleaning-coverage", { params: { durationHours: 2 } });
    mockApi.get.mockRejectedValue(new Error("network"));
    await expect(getCleaningCoverage(null)).rejects.toThrow("Failed to fetch cleaning coverage");
  });

  it("normalizes cook family sizes and returns fallback options", async () => {
    mockApi.get.mockResolvedValueOnce({ data: [
      { id: "2", code: "MEDIUM", displayName: "3-5", enabled: "yes", displayOrder: 2 },
      { value: 1, key: "SMALL", label: "1-2", active: 1, sortOrder: 1, description: "Small" },
      { id: 3, code: "LARGE", label: "6-8", active: false },
      { id: 0, code: "", label: "bad" },
    ] });
    await expect(getCookFamilySizes()).resolves.toEqual([
      expect.objectContaining({ familySize: "SMALL", sortOrder: 1 }),
      expect.objectContaining({ familySize: "MEDIUM", sortOrder: 2 }),
    ]);
    mockApi.get.mockRejectedValue(new Error("offline"));
    await expect(getCookFamilySizes()).resolves.toHaveLength(4);
  });

  it("prefers service-specific cook coverage rows over same-family shared rows", async () => {
    mockApi.get.mockResolvedValue({
      data: [
        {
          id: 1,
          serviceId: null,
          familySize: "SMALL",
          familySizeLabel: "1-2 Members",
          reference: "Shared",
          active: true,
          items: [{ name: "Global Dal", sortOrder: 1 }],
        },
        {
          id: 2,
          serviceId: 124,
          familySize: "SMALL",
          familySizeLabel: "1-2 Members",
          reference: "Premium Veg Cook",
          active: true,
          items: [{ name: "Premium Thali", sortOrder: 1 }],
        },
        {
          id: 3,
          serviceId: 123,
          familySize: "SMALL",
          familySizeLabel: "1-2 Members",
          reference: "Simple Veg Cook",
          active: true,
          items: [{ name: "Simple Dal", sortOrder: 1, quantity: 1 }],
        },
      ],
    });
    await expect(getCookCoverage({ serviceId: 123, familySize: "SMALL" })).resolves.toMatchObject({
      serviceId: 123,
      reference: "Simple Veg Cook",
      items: [{ name: "Simple Dal", sortOrder: 1, quantity: 1 }],
    });
    await expect(getCookCoverage({ serviceId: 124, familySize: "SMALL" })).resolves.toMatchObject({
      serviceId: 124,
      reference: "Premium Veg Cook",
      items: [{ name: "Premium Thali", sortOrder: 1 }],
    });
  });

  it("does not leak another service's cook coverage when no exact or global row exists", async () => {
    mockApi.get.mockResolvedValue({
      data: [
        {
          id: 3,
          serviceId: 123,
          familySize: "SMALL",
          familySizeLabel: "1-2 Members",
          reference: "Simple Veg Cook",
          active: true,
          items: [{ name: "Simple Dal", sortOrder: 1 }],
        },
      ],
    });
    await expect(getCookCoverage({ serviceId: 124, familySize: "SMALL" })).resolves.toBeNull();
  });

  it("merges small-family coverage items into larger-family coverage while overriding matching quantities", () => {
    expect(
      getDisplayCookCoverageItems({
        baseCoverageItems: [
          { name: "Dal", quantity: 1 },
          { name: "Rice", quantity: 1 },
          { name: "Roti", quantity: 6 },
        ],
        selectedCoverageItems: [
          { name: "Dal", quantity: 1 },
          { name: "Rice", quantity: 1 },
          { name: "Roti", quantity: 10 },
          { name: "Poha", quantity: 2 },
        ],
      }),
    ).toEqual(["Dal", "Rice", "Roti x10", "Poha x2"]);
  });

  it("splits comma-separated coverage names into separate display rows", () => {
    expect(
      getDisplayCookCoverageItems({
        selectedCoverageItems: [
          { name: "Poha, Daliya, Khichdi, Halwa", quantity: 1 },
        ],
      }),
    ).toEqual(["Poha", "Daliya", "Khichdi", "Halwa"]);
  });

  it("creates subscription bookings with endpoint fallback and final error", async () => {
    mockApi.post.mockRejectedValueOnce(new Error("first")).mockResolvedValueOnce({ data: { data: { id: "SB1" } } });
    await expect(createSubscriptionBooking({ serviceId: 1, visits: 4 })).resolves.toEqual({ id: "SB1" });
    mockApi.post.mockRejectedValue(new Error("all failed"));
    await expect(createSubscriptionBooking({})).rejects.toThrow("Unable to create subscription booking");
  });
});
