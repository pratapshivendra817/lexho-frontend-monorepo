const mockPost = jest.fn();
jest.mock("../src/api/client", () => ({
  api: { post: (...args: any[]) => mockPost(...args) },
  unwrapPayload: (data: any) => data?.data ?? data,
  parseApiError: (error: any, fallback: string) => error?.response?.data?.message ?? error?.message ?? fallback,
}));
import { createSubscriptionBooking } from "../src/api/subscriptionBookingApi";

describe("subscription checkout API contract", () => {
  beforeEach(() => mockPost.mockReset());
  it("uses the subscription create contract and keeps payment and plan IDs separate", async () => {
    mockPost.mockResolvedValue({ data: { data: { bookingId: 412, subscriptionId: 72, id: 72 } } });
    await expect(createSubscriptionBooking(
      { serviceId: 9, subscriptionServiceType: "COOK", familySize: "SMALL", couponCode: " SAVE " },
      "subscription-retry-key",
    ))
      .resolves.toEqual({ bookingId: 412, subscriptionId: 72, id: 72 });
    expect(mockPost).toHaveBeenCalledWith("/api/subscription/create", expect.objectContaining({
      serviceId: 9, bookingMode: "SUBSCRIPTION", serviceType: "COOK", familySize: "SMALL", couponCode: "SAVE",
    }), { headers: { "Idempotency-Key": "subscription-retry-key" } });
  });
  it.each([404, 405])("uses only the supported alias when the create route is missing (%s)", async status => {
    mockPost.mockRejectedValueOnce({ response: { status } }).mockResolvedValueOnce({ data: { bookingId: 412 } });
    await createSubscriptionBooking({ serviceId: 9 });
    expect(mockPost.mock.calls.map(call => call[0])).toEqual(["/api/subscription/create", "/api/subscription/bookings"]);
  });
  it.each([400, 401, 403, 409, 422, 429, 500, 503])("does not hide the original error or repeat creation on %s", async status => {
    mockPost.mockRejectedValue({ response: { status, data: { message: "Original failure" } } });
    await expect(createSubscriptionBooking({})).rejects.toThrow("Original failure");
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
  it("surfaces subscription validation details", async () => {
    mockPost.mockRejectedValue({ response: { status: 400, data: { message: "Validation failed", data: { errors: ["Select a supported service", "Choose a time slot"] } } } });
    await expect(createSubscriptionBooking({})).rejects.toThrow("Select a supported service\nChoose a time slot");
  });
  it("does not retry an ambiguous network failure", async () => {
    mockPost.mockRejectedValue(new Error("Network Error"));
    await expect(createSubscriptionBooking({})).rejects.toThrow("Network Error");
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});
