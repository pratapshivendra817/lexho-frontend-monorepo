import {
  getBookingMeta,
  shouldShowBookingMap,
} from "../src/utils/bookingMeta";

describe("utils/bookingMeta", () => {
  it("normalizes supported metadata values without changing extra fields", () => {
    const booking = {
      meta: {
        trackingScreen: "  PartnerTracking  ",
        showMap: true,
        canCancel: false,
        canReschedule: true,
        canCallPartner: false,
        canTrackPartner: true,
        canRaiseIssue: false,
        canPause: true,
        canResume: false,
        trackingRefreshSeconds: "15",
        retryPaymentAllowed: true,
        arrivalTime: "  10:30 AM  ",
        customFlag: "preserved",
      },
    };

    expect(getBookingMeta(booking as never)).toEqual({
      ...booking.meta,
      trackingScreen: "PartnerTracking",
      trackingRefreshSeconds: 15,
      arrivalTime: "10:30 AM",
    });
  });

  it("ignores invalid values and checks later number candidates", () => {
    expect(
      getBookingMeta({
        meta: {
          trackingScreen: "   ",
          showMap: "true",
          canCancel: 1,
          trackingRefreshSeconds: "invalid",
          arrivalTime: null,
        },
      } as never),
    ).toEqual(
      expect.objectContaining({
        trackingScreen: undefined,
        showMap: undefined,
        canCancel: undefined,
        trackingRefreshSeconds: undefined,
        arrivalTime: undefined,
      }),
    );
  });

  it.each([undefined, null, {}, { meta: null }, { meta: "invalid" }])(
    "returns an empty normalized shape for missing metadata",
    (booking) => {
      expect(getBookingMeta(booking as never)).toEqual({
        trackingScreen: undefined,
        showMap: undefined,
        canCancel: undefined,
        canReschedule: undefined,
        canCallPartner: undefined,
        canTrackPartner: undefined,
        canRaiseIssue: undefined,
        canPause: undefined,
        canResume: undefined,
        trackingRefreshSeconds: undefined,
        retryPaymentAllowed: undefined,
        arrivalTime: undefined,
      });
    },
  );

  it.each([
    [{ meta: { showMap: true }, map: { enabled: true } }, true],
    [{ meta: { showMap: true }, map: { enabled: false } }, false],
    [{ meta: { showMap: false }, map: { enabled: true } }, false],
    [{ meta: { showMap: true } }, false],
    [null, false],
  ])("determines map visibility", (booking, expected) => {
    expect(shouldShowBookingMap(booking as never)).toBe(expected);
  });
});
