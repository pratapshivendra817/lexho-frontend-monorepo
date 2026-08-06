const mockApi = { get: jest.fn(), put: jest.fn() };
const mockToError = jest.fn((_error: unknown, fallback: string) => new Error(fallback));
jest.mock("../src/api/client", () => ({
  api: { get: (...args: any[]) => (mockApi.get as any)(...args), put: (...args: any[]) => (mockApi.put as any)(...args) },
  parseApiError: jest.fn(),
  toApiError: (...args: any[]) => (mockToError as any)(...args),
}));

import { cancelBooking, getBookingDetails, getPartnerLiveLocation, rescheduleBooking } from "../src/api/bookingExtrasApi";

describe("bookingExtrasApi", () => {
  beforeEach(() => { jest.clearAllMocks(); mockToError.mockImplementation((_e, f) => new Error(f)); });

  it("maps a complete booking details payload", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: {
      bookingId: 7, service: { id: 3, name: "Cleaning" }, bookingStatus: "assigned",
      createdOn: "created", scheduledDate: "2026-06-13", scheduledSlot: "10:00", finishedAt: "done",
      serviceAmount: "100", grandTotal: "118", unitPrice: "100", serviceAddress: "Home",
      bookingType: "instant", dispatchStatus: "partner_assigned", slaStartTime: "soon", slaMinutes: "30",
      reasonCode: "NONE", etaMinutes: "15", partner: { id: 9, name: "Partner", phone: "999", rating: "4.5", avatar: "p.png" },
      subscription: { id: 5, serviceType: "CLEANING", frequencyDays: ["MON"], frequencyLabel: "Weekly", startDate: "s", endDate: "e", visits: "4", remainingVisits: "3", timeSlot: "10", nextServiceDate: "n", canPause: true, canResume: false },
      paymentStatus: "PAID", meta: { trackingStatus: "LIVE", trackingScreen: "LiveTracking", showMap: true, canReview: false, canCancel: true, canReschedule: true, canCallPartner: true, canTrackPartner: true, canRaiseIssue: true, retryPaymentAllowed: true, arrivalTime: "arrived", trackingRefreshSeconds: "10" },
      startedAt: "start", expectedCompletionTime: "end", workStatus: "WORKING",
      timeline: [{ code: "CREATED", title: "Created", state: "DONE", completed: true, createdAt: "now" }, { title: "" }],
    } } });
    await expect(getBookingDetails("7")).resolves.toMatchObject({
      id: "7", serviceId: "3", status: "ASSIGNED", scheduledAt: "2026-06-13 10:00",
      amount: 100, totalAmount: 118, price: 100, partnerId: "9", partnerRating: 4.5,
      subscriptionId: "5", visits: 4, remainingVisits: 3, retryPaymentAllowed: true,
      meta: { trackingScreen: "LiveTracking", canPause: true, canResume: false, trackingRefreshSeconds: 10 },
      statusHistory: [expect.objectContaining({ label: "Created" })],
    });
  });

  it("maps sparse fallback fields through cancel and reschedule", async () => {
    const row = { id: "B", serviceID: 2, categoryName: "Cook", status: "", bookedAt: "booked", slot: "slot", completedOn: "done", payableAmount: "50", finalAmount: "60", addressLine: "Address", partnerId: "", frequencyDays: ["TUE"], visitCount: "2", retryPaymentAllowed: false };
    mockApi.put.mockResolvedValueOnce({ data: row }).mockResolvedValueOnce({ data: { data: row } });
    await expect(cancelBooking("B")).resolves.toMatchObject({ id: "B", serviceName: "Cook", amount: 50, totalAmount: 60, visits: 2 });
    await expect(rescheduleBooking("B", { date: "x" } as any)).resolves.toMatchObject({ id: "B" });
    expect(mockApi.put).toHaveBeenLastCalledWith("/api/bookings/reschedule/B", { date: "x" });
  });

  it("returns live location and normalizes every endpoint failure", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { latitude: 1, longitude: 2 } });
    await expect(getPartnerLiveLocation("B")).resolves.toEqual({ latitude: 1, longitude: 2 });
    mockApi.get.mockRejectedValue(new Error("bad")); mockApi.put.mockRejectedValue(new Error("bad"));
    await expect(getBookingDetails("B")).rejects.toThrow("Booking details failed");
    await expect(cancelBooking("B")).rejects.toThrow("Cancel booking failed");
    await expect(rescheduleBooking("B", {} as any)).rejects.toThrow("Reschedule booking failed");
    await expect(getPartnerLiveLocation("B")).rejects.toThrow("Live location failed");
  });
});
