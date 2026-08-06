import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { RecurringBookingScreen } from "../src/screens/booking/RecurringBookingScreen";
import { getPopularCookServices } from "../src/api/popularServicesApi";
import {
  getCookSubscriptionPriceQuote,
  getSubscriptionPriceQuote,
  getSubscriptionPricing,
} from "../src/api/subscriptionPricingApi";
import { getCookCoverage } from "../src/api/cookCoverageApi";
import { trackSubscriptionPurchased } from "../src/services/customerAnalyticsEvents";

jest.mock("../src/api/popularServicesApi", () => ({
  getPopularCookServices: jest.fn(),
}));

jest.mock("../src/api/subscriptionPricingApi", () => ({
  getCookSubscriptionPriceQuote: jest.fn(),
  getSubscriptionPriceQuote: jest.fn(),
  getSubscriptionPricing: jest.fn(),
}));

jest.mock("../src/api/cookCoverageApi", () => ({
  getCookCoverage: jest.fn(),
  getDisplayCookCoverageItems: jest.fn(({ baseCoverageItems, selectedCoverageItems }: any) => {
    const normalize = (items: any) => Array.isArray(items) ? items.map((item: any) => item?.name ?? item).filter(Boolean) : [];
    const base = normalize(baseCoverageItems);
    const selected = normalize(selectedCoverageItems);
    if (base.length === 0) return selected;
    if (selected.length === 0) return base;
    const selectedRoti = selected.find((item: string) => /roti/i.test(item));
    return base.map((item: string) => (/roti/i.test(item) && selectedRoti ? selectedRoti : item));
  }),
}));

jest.mock("../src/services/customerAnalyticsEvents", () => ({
  trackSubscriptionPurchased: jest.fn().mockResolvedValue(undefined),
}));

const mockUseQuery = jest.fn();
const mockUseQueries = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
  useQueries: (options: unknown) => mockUseQueries(options),
}));

jest.mock("../src/components/booking/CleaningCoverageCard", () => {
  const { Text, View } = require("react-native");
  return {
    CleaningCoverageCard: ({ durationHours }: { durationHours: number | null }) => (
      <View testID="cleaning-coverage">
        <Text>{durationHours == null ? "No duration selected" : `Coverage ${durationHours} hours`}</Text>
      </View>
    ),
  };
});

type NavigationMock = {
  goBack: jest.Mock;
  navigate: jest.Mock;
};

const mockGetPopularCookServices = getPopularCookServices as jest.MockedFunction<typeof getPopularCookServices>;
const mockGetCookSubscriptionPriceQuote = getCookSubscriptionPriceQuote as jest.MockedFunction<typeof getCookSubscriptionPriceQuote>;
const mockGetSubscriptionPriceQuote = getSubscriptionPriceQuote as jest.MockedFunction<typeof getSubscriptionPriceQuote>;
const mockGetSubscriptionPricing = getSubscriptionPricing as jest.MockedFunction<typeof getSubscriptionPricing>;
const mockGetCookCoverage = getCookCoverage as jest.MockedFunction<typeof getCookCoverage>;
const mockTrackSubscriptionPurchased = trackSubscriptionPurchased as jest.MockedFunction<typeof trackSubscriptionPurchased>;

function buildNavigation(): NavigationMock {
  return {
    goBack: jest.fn(),
    navigate: jest.fn(),
  };
}

function buildPricing(overrides: Partial<{ id: number; serviceId: number | null; durationHours: number; perVisitPrice: number }> = {}) {
  return {
    id: 1,
    serviceId: 42,
    durationHours: 1,
    perVisitPrice: 250,
    ...overrides,
  };
}

function buildCleaningQuote(overrides: Partial<{ perVisitPrice: number; totalPrice: number }> = {}) {
  return {
    perVisitPrice: 225,
    totalPrice: 6750,
    ...overrides,
  };
}

function buildCookQuote(overrides: Partial<{ pricePerVisit: number; totalPrice: number }> = {}) {
  return {
    pricePerVisit: 300,
    totalPrice: 9000,
    ...overrides,
  };
}

async function renderScreen({ serviceId = 42, navigation = buildNavigation() }: { serviceId?: number; navigation?: NavigationMock } = {}) {
  const view = await render(<RecurringBookingScreen route={{ params: { serviceId } }} navigation={navigation} />);

  return { ...view, navigation };
}

async function pressText(value: string | RegExp, occurrence = 0) {
  const matches = screen.getAllByText(value);
  await fireEvent.press(matches[occurrence]);
}

async function pressParentOfText(value: string | RegExp) {
  const node = screen.getByText(value);
  await fireEvent.press(node.parent?.parent ?? node);
}

describe("RecurringBookingScreen", () => {
  let queryResults: Record<string, any>;
  let queryConfigs: any[];

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "setTimeout", "clearTimeout"] });
    jest.setSystemTime(new Date("2026-06-12T08:00:00.000Z"));
    jest.clearAllMocks();

    queryConfigs = [];
    queryResults = {
      "subscription-cook-service": { data: [{ id: 77, serviceId: 77, name: "Home Cook" }], isFetching: false, isError: false },
      "subscription-pricing": { data: [buildPricing()], isFetching: false, isError: false },
      "subscription-price-quote": { data: buildCleaningQuote(), isFetching: false, isError: false },
      "cook-subscription-price-quote": { data: buildCookQuote(), isFetching: false, isError: false },
      "cook-subscription-coverage": { data: { items: [{ name: "Coverage Dal" }, { name: "Coverage Rice" }, { name: "8-10 Rotis" }] }, isFetching: false, isError: false },
      "cook-subscription-coverage-SMALL": { data: { items: [{ name: "Coverage Dal" }, { name: "Coverage Rice" }, { name: "8-10 Rotis" }] }, isFetching: false, isError: false },
      "cook-subscription-coverage-MEDIUM": { data: { items: [{ name: "Coverage Dal" }, { name: "Coverage Rice" }, { name: "12-15 Rotis" }] }, isFetching: false, isError: false },
      "cook-subscription-coverage-LARGE": { data: { items: [{ name: "Coverage Dal" }, { name: "Coverage Rice" }, { name: "18-20 Rotis" }] }, isFetching: false, isError: false },
      "cook-subscription-coverage-XLARGE": { data: { items: [{ name: "Coverage Dal" }, { name: "Coverage Rice" }, { name: "25+ Rotis" }] }, isFetching: false, isError: false },
    };
    mockUseQuery.mockImplementation((options: any) => {
      queryConfigs.push(options);
      const scopedKey = `${String(options.queryKey[0])}-${String(options.queryKey[2] ?? "")}`;
      return queryResults[scopedKey] ?? queryResults[String(options.queryKey[0])] ?? { data: undefined, isFetching: false, isError: false };
    });
    mockUseQueries.mockImplementation(({ queries }: any) => {
      queryConfigs.push(...queries);
      return queries.map((query: any) => ({
        data: buildCookQuote({
          pricePerVisit: { SMALL: 300, MEDIUM: 400, LARGE: 500, XLARGE: 600 }[query.queryKey[2] as string] ?? 0,
          totalPrice: 9000,
        }),
        isFetching: false,
        isError: false,
      }));
    });

    mockGetSubscriptionPricing.mockResolvedValue([buildPricing()] as never);
    mockGetSubscriptionPriceQuote.mockResolvedValue(buildCleaningQuote() as never);
    mockGetPopularCookServices.mockResolvedValue([{ id: 77, serviceId: 77, name: "Home Cook" }] as never);
    mockGetCookCoverage.mockImplementation(async (input: any) => {
      const itemsByFamily: Record<string, Array<{ name: string }>> = {
        SMALL: [{ name: "Coverage Dal" }, { name: "Coverage Rice" }, { name: "8-10 Rotis" }],
        MEDIUM: [{ name: "Coverage Dal" }, { name: "Coverage Rice" }, { name: "12-15 Rotis" }],
        LARGE: [{ name: "Coverage Dal" }, { name: "Coverage Rice" }, { name: "18-20 Rotis" }],
        XLARGE: [{ name: "Coverage Dal" }, { name: "Coverage Rice" }, { name: "25+ Rotis" }],
      };
      return { items: itemsByFamily[input.familySize] ?? itemsByFamily.SMALL } as never;
    });
    mockGetCookSubscriptionPriceQuote.mockImplementation(async (input: any) => {
      const prices: Record<string, number> = { SMALL: 300, MEDIUM: 400, LARGE: 500, XLARGE: 600 };
      const perVisit = prices[input.familySize] ?? 300;
      return buildCookQuote({ pricePerVisit: perVisit, totalPrice: perVisit * input.visits }) as never;
    });
  });

  afterEach(async () => {
    await cleanup();
    await AsyncStorage.clear();
    jest.useRealTimers();
  });

  it("renders the initial cleaning form and loading state with submit disabled", async () => {
    queryResults["subscription-pricing"] = { data: undefined, isFetching: true, isError: false };
    queryResults["subscription-price-quote"] = { data: undefined, isFetching: false, isError: false };

    const { navigation, unmount } = await renderScreen();

    expect(screen.getByText("Repeat Booking")).toBeTruthy();
    expect(screen.getByText("Choose Service Days")).toBeTruthy();
    expect(screen.getByText("Everyday")).toBeTruthy();
    expect(screen.getByText("Loading duration prices...")).toBeTruthy();
    expect(screen.getByText("No duration selected")).toBeTruthy();
    expect(screen.queryByText("Minimum 3 visits required for subscription.")).toBeNull();
    expect(screen.getByText("Continue booking").parent?.props.accessibilityState).toEqual({ disabled: true });
    expect(mockGetSubscriptionPriceQuote).not.toHaveBeenCalled();

    expect(navigation.goBack).not.toHaveBeenCalled();

    unmount();
  });

  it("loads cleaning pricing, creates a quote, tracks analytics, and navigates with the booking payload", async () => {
    const { navigation } = await renderScreen();

    await waitFor(() => expect(screen.getByText("Rs. 250")).toBeTruthy());
    await pressText("1 hr");
    await pressText("7:00 AM");

    await waitFor(() => expect(screen.getByText("Continue booking | Rs. 6750")).toBeTruthy());
    const pricingConfig = queryConfigs.find((config) => config.queryKey[0] === "subscription-pricing");
    const quoteConfig = [...queryConfigs].reverse().find((config) => config.queryKey[0] === "subscription-price-quote");
    await pricingConfig.queryFn();
    await quoteConfig.queryFn();
    expect(mockGetSubscriptionPricing).toHaveBeenCalledWith(42);
    expect(mockGetSubscriptionPriceQuote).toHaveBeenCalledWith({
      serviceId: 42,
      durationHours: 1,
      visits: 30,
    });

    await pressText("Continue booking | Rs. 6750");

    expect(mockTrackSubscriptionPurchased).toHaveBeenCalledWith(expect.objectContaining({
      service_id: 42,
      subscription_type: "CLEANING",
      frequency: "Everyday",
      visits: 30,
      amount: 6750,
      source: "recurring_booking",
    }));
    expect(navigation.navigate).toHaveBeenCalledWith("CartCrud", {
      recurringBooking: expect.objectContaining({
        serviceId: 42,
        serviceName: "Hourly Services",
        subscriptionServiceType: "CLEANING",
        durationHours: 1,
        durationLabel: "1 hr",
        perVisitPrice: 225,
        price: 6750,
        timeSlot: "7:00 AM",
      }),
    });
  });

  it("uses fallback durations and keeps price pending when pricing APIs fail", async () => {
    queryResults["subscription-pricing"] = { data: undefined, isFetching: false, isError: true };
    queryResults["subscription-price-quote"] = { data: undefined, isFetching: false, isError: true };

    const { navigation } = await renderScreen();

    await waitFor(() => expect(screen.getAllByText("Price unavailable")).toHaveLength(4));
    expect(screen.getByText("0.5 hrs")).toBeTruthy();
    expect(screen.getByText("2 hrs")).toBeTruthy();

    await pressText("0.5 hrs");
    await pressText("7:30 AM");

    expect(screen.getByText("Continue booking")).toBeTruthy();
    await pressText("Continue booking");
    expect(navigation.navigate).toHaveBeenCalledWith("CartCrud", {
      recurringBooking: expect.objectContaining({
        durationHours: 0.5,
        durationLabel: "0.5 hrs",
        price: 0,
      }),
    });
  });

  it("validates an empty frequency and supports removing and restoring weekdays", async () => {
    const { navigation } = await renderScreen();
    await waitFor(() => expect(screen.getByText("Rs. 250")).toBeTruthy());

    await pressText("Everyday", 0);
    expect(screen.getByText("Choose Repeat Days")).toBeTruthy();
    await pressText("Everyday", 1);
    await pressText("Proceed");

    expect(screen.getByText("Select days")).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();
    await pressText("1 hr");
    await pressText("8:00 AM");
    expect(screen.getByText(/Continue booking/).parent?.props.accessibilityState).toEqual({ disabled: true });
    expect(navigation.navigate).not.toHaveBeenCalled();

    await pressText("Select days");
    await pressText("Monday");
    await pressText("Tuesday");
    await pressText("Tuesday");
    await pressText("Proceed");

    expect(screen.getByText("Monday")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
  });

  it("updates start and end dates while rejecting an end date before the start date", async () => {
    await renderScreen();
    await waitFor(() => expect(screen.getByText("Rs. 250")).toBeTruthy());

    await pressParentOfText("Start date");
    expect(screen.getByText("Choose Start Date")).toBeTruthy();
    await pressText("20");
    await pressText("Done");
    expect(screen.getByText("Jun 20")).toBeTruthy();

    await pressParentOfText("End date");
    expect(screen.getByText("Choose End Date")).toBeTruthy();
    await fireEvent.press(screen.getByText("19"));
    expect(screen.getByText("Jul 19")).toBeTruthy();
    await pressText("25");
    await pressText("Done");

    expect(screen.getByText("Jul 25")).toBeTruthy();
    expect(screen.getByText("36")).toBeTruthy();
  });

  it("blocks checkout when the schedule results in fewer than 3 visits", async () => {
    const { navigation } = await renderScreen();
    await waitFor(() => expect(screen.getByText("Rs. 250")).toBeTruthy());

    await pressText("Everyday", 0);
    await pressText("Everyday", 1);
    await pressText("Proceed");

    expect(screen.getByText("Minimum 3 visits required for subscription.")).toBeTruthy();

    await pressText("1 hr");
    await pressText("7:00 AM");

    expect(screen.getByText(/Continue booking/).parent?.props.accessibilityState).toEqual({ disabled: true });
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(mockGetSubscriptionPriceQuote).not.toHaveBeenCalledWith(expect.objectContaining({ visits: 2 }));
  });

  it("loads cook prices, resolves a fallback service, and submits a cook subscription", async () => {
    const { navigation } = await renderScreen({ serviceId: 0 });

    await pressText("Cook");

    await waitFor(() => expect(screen.getByText("Rs. 300 / visit")).toBeTruthy());
    expect(screen.getByText("Select family size to view meal coverage.")).toBeTruthy();

    await pressText("1-2 Members");
    expect(screen.getByText("Coverage Dal")).toBeTruthy();
    expect(screen.getByText("Coverage Rice")).toBeTruthy();
    await pressText("9:00 AM");

    await waitFor(() => expect(screen.getByText("Continue booking | Rs. 9000")).toBeTruthy());
    const serviceConfig = [...queryConfigs].reverse().find((config) => config.queryKey[0] === "subscription-cook-service");
    const cookCoverageConfig = [...queryConfigs].reverse().find((config) => config.queryKey[0] === "cook-subscription-coverage");
    const cookQuoteConfig = [...queryConfigs].reverse().find((config) => config.queryKey[0] === "cook-subscription-price-quote");
    await serviceConfig.queryFn();
    await cookCoverageConfig.queryFn();
    await cookQuoteConfig.queryFn();
    expect(mockGetPopularCookServices).toHaveBeenCalledTimes(1);
    expect(mockGetCookCoverage).toHaveBeenCalledWith({
      serviceId: 77,
      familySize: "SMALL",
      subscription: true,
    });
    expect(mockGetCookSubscriptionPriceQuote).toHaveBeenCalledWith(expect.objectContaining({
      serviceId: 77,
      familySize: "SMALL",
      frequency: "Everyday",
      visits: 30,
    }));

    await pressText("Continue booking | Rs. 9000");
    expect(navigation.navigate).toHaveBeenCalledWith("CartCrud", {
      recurringBooking: expect.objectContaining({
        serviceId: 77,
        serviceName: "Cook Subscription",
        subscriptionServiceType: "COOK",
        familySize: "SMALL",
        familySizeLabel: "1-2 Members",
        perVisitPrice: 300,
        price: 9000,
      }),
    });
  });

  it("keeps cook coverage items stable for non-small family sizes", async () => {
    await renderScreen({ serviceId: 77 });

    await pressText("Cook");
    await waitFor(() => expect(screen.getByText("Select family size to view meal coverage.")).toBeTruthy());

    await pressText("1-2 Members");
    expect(screen.getByText("Coverage Dal")).toBeTruthy();
    expect(screen.getByText("Coverage Rice")).toBeTruthy();
    expect(screen.getByText("8-10 Rotis")).toBeTruthy();

    await pressText("3-4 Members");
    expect(screen.getByText("Coverage Dal")).toBeTruthy();
    expect(screen.getByText("Coverage Rice")).toBeTruthy();
    expect(screen.getByText("12-15 Rotis")).toBeTruthy();
    expect(screen.queryByText("8-10 Rotis")).toBeNull();
  });

  it("shows an empty cook coverage state when admin coverage is unavailable", async () => {
    queryResults["cook-subscription-coverage"] = { data: { items: [] }, isFetching: false, isError: false };
    queryResults["cook-subscription-coverage-SMALL"] = { data: { items: [] }, isFetching: false, isError: false };

    await renderScreen({ serviceId: 77 });
    await pressText("Cook");
    await waitFor(() => expect(screen.getByText("Select family size to view meal coverage.")).toBeTruthy());

    await pressText("1-2 Members");
    expect(screen.getByText("No meal coverage available right now.")).toBeTruthy();
  });

  it("renders cook loading and failure fallbacks without enabling submit", async () => {
    queryResults["cook-subscription-price-quote"] = { data: undefined, isFetching: true, isError: false };
    mockUseQueries.mockImplementation(({ queries }: any) => queries.map(() => ({ data: undefined, isFetching: true, isError: false })));

    const { navigation, unmount } = await renderScreen({ serviceId: 77 });
    await pressText("Cook");

    await waitFor(() => expect(screen.getAllByText("Fetching price...")).toHaveLength(4));
    await pressText("3-4 Members");
    await pressText("10:00 AM");
    expect(screen.getAllByText("Fetching price...").length).toBeGreaterThan(0);
    expect(navigation.navigate).not.toHaveBeenCalled();

    unmount();
  });

  it("toggles cook coverage, handles back navigation, and cleans query work on unmount", async () => {
    const navigation = buildNavigation();
    const { unmount } = await renderScreen({ serviceId: 77, navigation });

    await pressText("Cook");
    await waitFor(() => expect(screen.getByText("What can typically be prepared?")).toBeTruthy());
    await pressText("What can typically be prepared?");
    expect(screen.queryByText("Select family size to view meal coverage.")).toBeNull();
    await pressText("What can typically be prepared?");
    expect(screen.getByText("Select family size to view meal coverage.")).toBeTruthy();

    const header = screen.getByText("Repeat Booking").parent;
    const backButton = header?.children[0];
    if (typeof backButton === "string" || backButton == null) throw new Error("Back button was not rendered");
    await fireEvent.press(backButton);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);

    unmount();
    expect(mockGetCookSubscriptionPriceQuote).not.toHaveBeenCalled();
  });
});
