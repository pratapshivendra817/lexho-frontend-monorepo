import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, Share, Vibration } from "react-native";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { BookingHistoryScreen } from "../src/screens/booking/BookingHistoryScreen";
import { getBookingsHistoryPage } from "../src/api/bookingApi";
import { getBookingDetails } from "../src/api/bookingExtrasApi";
import { resolveLifecycleTarget } from "../src/hooks/useBookingLifecycleNavigation";
import { getBookingMeta } from "../src/utils/bookingMeta";
import type { BookingHistoryPageDto, BookingSummaryDto } from "../src/types/contracts";

jest.mock("../src/api/bookingApi", () => ({
  getBookingsHistoryPage: jest.fn(),
}));

jest.mock("../src/api/bookingExtrasApi", () => ({
  getBookingDetails: jest.fn(),
}));

jest.mock("../src/hooks/useBookingLifecycleNavigation", () => ({
  resolveLifecycleTarget: jest.fn(),
}));

jest.mock("../src/utils/bookingMeta", () => ({
  getBookingMeta: jest.fn(),
}));

jest.mock("../src/components/booking/BookingTimeline", () => {
  const { Text, View } = require("react-native");
  return {
    BookingTimeline: ({ history, compact }: { history?: unknown[]; compact?: boolean }) => (
      <View testID="booking-timeline">
        <Text>{compact ? "Compact timeline" : "Timeline"}</Text>
        <Text>{`History ${Array.isArray(history) ? history.length : 0}`}</Text>
      </View>
    ),
  };
});

type NavigationMock = {
  navigate: jest.Mock;
  goBack?: jest.Mock;
};

type BookingWithMeta = BookingSummaryDto & {
  __meta?: Record<string, unknown>;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const mockGetBookingsHistoryPage = getBookingsHistoryPage as jest.MockedFunction<typeof getBookingsHistoryPage>;
const mockGetBookingDetails = getBookingDetails as jest.MockedFunction<typeof getBookingDetails>;
const mockResolveLifecycleTarget = resolveLifecycleTarget as jest.MockedFunction<typeof resolveLifecycleTarget>;
const mockGetBookingMeta = getBookingMeta as jest.MockedFunction<typeof getBookingMeta>;

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function buildNavigation(withGoBack = true): NavigationMock {
  return {
    navigate: jest.fn(),
    ...(withGoBack ? { goBack: jest.fn() } : {}),
  };
}

function buildBooking(overrides: Partial<BookingWithMeta> = {}): BookingWithMeta {
  return {
    id: "101",
    serviceId: "501",
    serviceName: "Deep Cleaning",
    status: "CONFIRMED",
    bookingType: "INSTANT",
    createdAt: "2026-06-12T08:00:00.000Z",
    totalAmount: 1299,
    partnerName: "Amit",
    paymentStatus: "PAID",
    statusHistory: [{ status: "CONFIRMED", at: "2026-06-12T08:00:00.000Z" }],
    __meta: {
      historySection: "Active Bookings",
      statusColor: "#22c55e",
      paymentLabel: "Paid online",
      canTrackPartner: true,
      canReschedule: true,
    },
    ...overrides,
  } as BookingWithMeta;
}

function buildSubscription(overrides: Partial<BookingWithMeta> = {}): BookingWithMeta {
  return buildBooking({
    id: "301",
    serviceId: "701",
    serviceName: "Monthly Cook",
    bookingType: "SUBSCRIPTION",
    subscriptionId: "sub-301",
    frequencyLabel: "Monday, Wednesday",
    nextVisitDate: "2026-06-15T08:00:00.000Z",
    remainingVisits: 8,
    __meta: {
      subscriptionSection: "Active Plans",
      canPause: true,
      canResume: true,
      canCancel: true,
    },
    ...overrides,
  });
}

function buildPage(overrides: Partial<BookingHistoryPageDto> = {}): BookingHistoryPageDto {
  const instant = buildBooking();
  return {
    items: [instant],
    instantBookings: [instant],
    scheduledBookings: [],
    subscriptions: [],
    hasMore: false,
    page: 0,
    size: 12,
    ...overrides,
  };
}

async function renderScreen(navigation = buildNavigation()) {
  const view = await render(<BookingHistoryScreen navigation={navigation} />);
  return { ...view, navigation };
}

async function pressLabel(label: string) {
  await fireEvent.press(screen.getByLabelText(label));
}

async function pressText(text: string | RegExp) {
  await fireEvent.press(screen.getByText(text));
}

describe("BookingHistoryScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "setTimeout", "clearTimeout"] });
    jest.setSystemTime(new Date("2026-06-12T12:00:00.000Z"));
    jest.clearAllMocks();

    mockGetBookingsHistoryPage.mockResolvedValue(buildPage());
    mockGetBookingDetails.mockResolvedValue(buildBooking());
    mockResolveLifecycleTarget.mockReturnValue({ name: "LiveTracking" });
    mockGetBookingMeta.mockImplementation((row) => (row as BookingWithMeta | undefined)?.__meta ?? {});
    jest.spyOn(Share, "share").mockResolvedValue({ action: Share.sharedAction });
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    jest.spyOn(Vibration, "vibrate").mockImplementation(() => true);
  });

  afterEach(async () => {
    await cleanup();
    await AsyncStorage.clear();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("shows skeleton loading cards until the initial API request resolves", async () => {
    const request = deferred<BookingHistoryPageDto>();
    mockGetBookingsHistoryPage.mockReturnValueOnce(request.promise);

    await renderScreen();

    expect(screen.getByText("My Bookings")).toBeTruthy();
    expect(screen.queryByText("Deep Cleaning")).toBeNull();
    expect(screen.queryByText("Could not load bookings")).toBeNull();
    expect(mockGetBookingsHistoryPage).toHaveBeenCalledWith({ page: 0, size: 12 });

    await act(() => request.resolve(buildPage()));
    await waitFor(() => expect(screen.getByText("Deep Cleaning")).toBeTruthy());
  });

  it("renders successful instant bookings, status metadata, fallback values, and timeline data", async () => {
    const complete = buildBooking();
    const fallback = buildBooking({
      id: "",
      serviceName: undefined,
      status: undefined,
      bookingType: "INSTANT",
      createdAt: "invalid-date",
      totalAmount: undefined,
      amount: undefined,
      partnerName: undefined,
      paymentStatus: undefined,
      statusHistory: undefined,
      __meta: { canTrackPartner: false, historySection: "Instant Bookings" },
    });
    mockGetBookingsHistoryPage.mockResolvedValue(buildPage({
      items: [complete, fallback],
      instantBookings: [complete, fallback],
    }));

    await renderScreen();

    await waitFor(() => expect(screen.getByText("Deep Cleaning")).toBeTruthy());
    expect(screen.getByText("CONFIRMED")).toBeTruthy();
    expect(screen.getByText("Paid online")).toBeTruthy();
    expect(screen.getByText("Rs 1299")).toBeTruthy();
    expect(screen.getByText("Partner: Amit")).toBeTruthy();
    expect(screen.getByText("Service booking")).toBeTruthy();
    expect(screen.getByText("PENDING")).toBeTruthy();
    expect(screen.getByText("Date unavailable")).toBeTruthy();
    expect(screen.getByText("Partner: Not assigned")).toBeTruthy();
    expect(screen.getAllByText("Compact timeline")).toHaveLength(2);
    expect(screen.getByText("History 1")).toBeTruthy();
    expect(screen.getByText("History 0")).toBeTruthy();
    expect(screen.getByText("View")).toBeTruthy();
  });

  it("shows instant, scheduled, subscription, and search-specific empty states", async () => {
    mockGetBookingsHistoryPage.mockResolvedValue(buildPage({ items: [], instantBookings: [], scheduledBookings: [], subscriptions: [] }));
    await renderScreen();

    await waitFor(() => expect(screen.getByText("No instant bookings yet")).toBeTruthy());
    await pressLabel("Scheduled bookings");
    expect(screen.getByText("No scheduled bookings yet")).toBeTruthy();
    await pressLabel("Subscriptions bookings");
    expect(screen.getByText("No subscriptions yet")).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText("Search bookings"), "missing");
    expect(screen.getByText("No matching bookings")).toBeTruthy();
  });

  it("shows the error state and retries the initial request successfully", async () => {
    mockGetBookingsHistoryPage
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce(buildPage());

    await renderScreen();

    await waitFor(() => expect(screen.getByText("Could not load bookings")).toBeTruthy());
    expect(screen.getByText("Please retry after a moment.")).toBeTruthy();
    await pressText("Could not load bookings");

    await waitFor(() => expect(screen.getByText("Deep Cleaning")).toBeTruthy());
    expect(mockGetBookingsHistoryPage).toHaveBeenNthCalledWith(2, { page: 0, size: 12 });
  });

  it("loads the next page, renders loading feedback, deduplicates rows, and stops duplicate pagination", async () => {
    const secondPage = deferred<BookingHistoryPageDto>();
    const first = buildBooking({ id: "101" });
    const second = buildBooking({ id: "102", serviceName: "Bathroom Cleaning", createdAt: "2026-06-11T08:00:00.000Z" });
    mockGetBookingsHistoryPage
      .mockResolvedValueOnce(buildPage({ items: [first], instantBookings: [], hasMore: true }))
      .mockReturnValueOnce(secondPage.promise);

    await renderScreen();
    await waitFor(() => expect(screen.getByText("Load more")).toBeTruthy());
    await pressText("Load more");

    expect(screen.getByText("Loading...")).toBeTruthy();
    expect(mockGetBookingsHistoryPage).toHaveBeenNthCalledWith(2, { page: 1, size: 12 });
    await act(() => secondPage.resolve(buildPage({ items: [first, second], instantBookings: [], hasMore: true, page: 1 })));

    await waitFor(() => expect(screen.getByText("Bathroom Cleaning")).toBeTruthy());
    expect(screen.getAllByText("Deep Cleaning")).toHaveLength(1);
    expect(screen.getByText("Load more")).toBeTruthy();

    mockGetBookingsHistoryPage.mockResolvedValueOnce(buildPage({ items: [first, second], instantBookings: [], hasMore: true, page: 2 }));
    await pressText("Load more");
    await waitFor(() => expect(screen.queryByText("Load more")).toBeNull());
    expect(mockGetBookingsHistoryPage).toHaveBeenCalledTimes(3);
  });

  it("preserves existing rows when load-more fails and exposes the error retry state", async () => {
    const first = buildBooking();
    mockGetBookingsHistoryPage
      .mockResolvedValueOnce(buildPage({ items: [first], instantBookings: [], hasMore: true }))
      .mockRejectedValueOnce(new Error("page failed"));

    await renderScreen();
    await waitFor(() => expect(screen.getByText("Load more")).toBeTruthy());
    await pressText("Load more");

    await waitFor(() => expect(screen.getByText("Deep Cleaning")).toBeTruthy());
    expect(screen.queryByText("Could not load bookings")).toBeNull();
  });

  it("filters by booking id, service, and partner, clears search, switches tabs, and handles haptic failure", async () => {
    const instant = buildBooking({ id: "IN-101", serviceName: "Deep Cleaning", partnerName: "Amit" });
    const scheduled = buildBooking({ id: "SC-202", serviceName: "AC Repair", partnerName: "Ravi", bookingType: "SCHEDULED", __meta: { historySection: "Tomorrow" } });
    const subscription = buildSubscription();
    mockGetBookingsHistoryPage.mockResolvedValue(buildPage({
      items: [instant, scheduled, subscription],
      instantBookings: [],
      scheduledBookings: [],
      subscriptions: [],
    }));
    jest.spyOn(Vibration, "vibrate").mockImplementation(() => {
      throw new Error("unsupported");
    });

    await renderScreen();
    await waitFor(() => expect(screen.getByText("Deep Cleaning")).toBeTruthy());

    await fireEvent.changeText(screen.getByLabelText("Search bookings"), "in-101");
    expect(screen.getByText("Deep Cleaning")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Search bookings"), "amit");
    expect(screen.getByText("Deep Cleaning")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Search bookings"), "deep");
    expect(screen.getByText("Clear filters")).toBeTruthy();
    await pressText("Clear filters");
    expect(screen.getByLabelText("Search bookings").props.value).toBe("");

    await pressLabel("Scheduled bookings");
    expect(screen.getByText("AC Repair")).toBeTruthy();
    await pressLabel("Subscriptions bookings");
    expect(screen.getByText("Monthly Cook")).toBeTruthy();
  });

  it("renders subscription plans and all conditional management actions", async () => {
    const subscription = buildSubscription();
    const fallbackPlan = buildSubscription({
      id: "302",
      subscriptionId: undefined,
      frequencyLabel: undefined,
      frequencyDays: ["Tuesday", "", "Friday"],
      nextVisitDate: undefined,
      nextServiceDate: "invalid-next-date",
      remainingVisits: 0,
      visits: 0,
      totalAmount: 0,
      __meta: { subscriptionSection: "", canPause: false, canResume: false, canCancel: false },
    });
    const emptyPlan = buildSubscription({
      id: "303",
      subscriptionId: "sub-303",
      frequencyLabel: undefined,
      frequencyDays: undefined,
      nextVisitDate: undefined,
      nextServiceDate: undefined,
      remainingVisits: undefined,
      visits: 3,
      __meta: { subscriptionSection: "Subscription Plans" },
    });
    mockGetBookingsHistoryPage.mockResolvedValue(buildPage({
      items: [subscription, fallbackPlan, emptyPlan],
      subscriptions: [subscription, fallbackPlan, emptyPlan],
    }));

    await renderScreen();
    await waitFor(() => expect(screen.getByText("Deep Cleaning")).toBeTruthy());
    await pressLabel("Subscriptions bookings");

    expect(screen.getByText("Active Plans")).toBeTruthy();
    expect(screen.getByText("Subscription Plans")).toBeTruthy();
    expect(screen.getByText("Plan: Monday, Wednesday")).toBeTruthy();
    expect(screen.getByText("Plan: Tuesday, Friday")).toBeTruthy();
    expect(screen.getByText(/Next visit:.*15/)).toBeTruthy();
    expect(screen.getByText("Next visit: invalid-next-date")).toBeTruthy();
    expect(screen.getByText("Upcoming visits will appear here")).toBeTruthy();
    expect(screen.getByText("Remaining visits: 8")).toBeTruthy();
    expect(screen.getByText("Remaining visits: -")).toBeTruthy();
    expect(screen.getByText("Remaining visits: 3")).toBeTruthy();
    expect(screen.getByText("Plan: Subscription")).toBeTruthy();
    expect(screen.getByLabelText("Pause subscription")).toBeTruthy();
    expect(screen.getByLabelText("Resume subscription")).toBeTruthy();
    expect(screen.getByLabelText("Cancel subscription")).toBeTruthy();
    await pressLabel("Pause subscription");
    await pressLabel("Resume subscription");
    await pressLabel("Cancel subscription");
    expect(Linking.openURL).toHaveBeenCalledTimes(3);
  });

  it("handles card, back, tracking, sharing, support, and rebooking navigation branches", async () => {
    const noService = buildBooking({ id: "103", serviceId: undefined, serviceName: "Unknown Service" });
    const subscription = buildSubscription();
    const blankId = buildBooking({ id: "", serviceName: "Blank Booking" });
    mockGetBookingsHistoryPage.mockResolvedValue(buildPage({
      items: [buildBooking(), noService, subscription, blankId],
      instantBookings: [],
      scheduledBookings: [],
      subscriptions: [],
    }));
    const { navigation } = await renderScreen();
    await waitFor(() => expect(screen.getByText("Deep Cleaning")).toBeTruthy());

    await fireEvent.press(screen.getByLabelText("Booking 101 Deep Cleaning CONFIRMED"));
    expect(navigation.navigate).toHaveBeenCalledWith("BookingDetail", { bookingId: "101" });

    await fireEvent.press(screen.getAllByLabelText("Track booking")[0]);
    await waitFor(() => expect(mockGetBookingDetails).toHaveBeenCalledWith("101"));
    expect(navigation.navigate).toHaveBeenCalledWith("LiveTracking", { bookingId: "101" });

    mockGetBookingDetails.mockRejectedValueOnce(new Error("details unavailable"));
    await fireEvent.press(screen.getAllByLabelText("Track booking")[1]);
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith("BookingDetail", { bookingId: "103" }));
    await fireEvent.press(screen.getAllByLabelText("Track booking")[2]);
    expect(mockGetBookingDetails).toHaveBeenCalledTimes(2);

    await fireEvent.press(screen.getAllByLabelText("Share booking")[0]);
    expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({
      title: "Booking Summary",
      message: expect.stringContaining("Booking ID: 101"),
    }));

    await fireEvent.press(screen.getAllByLabelText("Call support")[0]);
    expect(Linking.openURL).toHaveBeenCalledWith("tel:18001234567");
    (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error("dialer unavailable"));
    await fireEvent.press(screen.getAllByLabelText("Call support")[1]);
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith("Support"));

    await fireEvent.press(screen.getAllByLabelText("Rebook")[0]);
    expect(navigation.navigate).toHaveBeenCalledWith("CartCrud", { serviceId: 501 });
    await fireEvent.press(screen.getAllByLabelText("Rebook")[1]);
    expect(navigation.navigate).toHaveBeenCalledWith("ServiceList", { categoryId: "all", categoryName: "Services" });

    await pressLabel("Subscriptions bookings");
    await pressLabel("Track booking");
    expect(navigation.navigate).toHaveBeenCalledWith("SubscriptionPlan", { subscriptionId: "sub-301" });
    await pressLabel("Rebook");
    expect(navigation.navigate).toHaveBeenCalledWith("RecurringBooking");

    await pressLabel("Go back");
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it("falls back to Home when goBack is unavailable and tolerates malformed API collections", async () => {
    mockGetBookingsHistoryPage.mockResolvedValue({
      items: null,
      instantBookings: undefined,
      scheduledBookings: undefined,
      subscriptions: undefined,
      hasMore: true,
    } as unknown as BookingHistoryPageDto);
    const navigation = buildNavigation(false);

    await renderScreen(navigation);
    await waitFor(() => expect(screen.getByText("No instant bookings yet")).toBeTruthy());
    expect(screen.queryByText("Load more")).toBeNull();
    await pressLabel("Go back");
    expect(navigation.navigate).toHaveBeenCalledWith("Home");
  });
});
