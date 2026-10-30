import React from "react";
import { Alert, Share } from "react-native";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { ServiceDetailScreen } from "../src/screens/service/ServiceDetailScreen";

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockFetchDetails = jest.fn();
const mockAddToCart = jest.fn((payload) => ({ type: "cart/add", payload }));
const mockSetScheduledTime = jest.fn((payload) => ({ type: "cart/scheduled", payload }));
const mockTrackViewed = jest.fn();
const mockTrackAdded = jest.fn();

let mockCookQuery: any;
let mockCookCoverageQuery: any;
let mockCookCoverageSelectedQuery: any;
let mockCookPriceQuery: any;
let mockPricingQuery: any;
let mockUnwrap: jest.Mock;

jest.mock("react-native-vector-icons/MaterialCommunityIcons", () => {
  const { Text } = require("react-native");
  return ({ name }: any) => <Text accessibilityLabel={`icon-${name}`}>{name}</Text>;
});

jest.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) => {
    if (options.queryKey[0] === "customer-cook-family-sizes") return mockCookQuery;
    if (options.queryKey[0] === "service-detail-cook-coverage" && options.queryKey[2] === "SMALL") return mockCookCoverageQuery;
    if (options.queryKey[0] === "service-detail-cook-coverage") return mockCookCoverageSelectedQuery;
    if (options.queryKey[0] === "service-detail-cook-price") return mockCookPriceQuery;
    return mockPricingQuery;
  },
}));

jest.mock("../src/api/serviceApi", () => ({
  fetchServiceDetails: (...args: any[]) => mockFetchDetails(...args),
}));

jest.mock("../src/api/cookFamilySizeApi", () => ({
  getCookFamilySizes: jest.fn(),
}));

jest.mock("../src/api/cookCoverageApi", () => ({
  getCookCoverage: jest.fn(),
  getDisplayCookCoverageItems: jest.fn(({ baseCoverageItems, selectedCoverageItems }: any) => {
    const normalize = (items: any) =>
      (Array.isArray(items) ? items : [])
        .map((item: any) => {
          const name = typeof item === "string" ? item : item?.name;
          const quantity = typeof item === "string" ? undefined : item?.quantity;
          return name ? { name, quantity } : null;
        })
        .filter(Boolean);
    const format = (item: any) => item.quantity != null ? `${item.name} x${item.quantity}` : item.name;
    const keyOf = (value: string) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const base = normalize(baseCoverageItems);
    const selected = normalize(selectedCoverageItems);
    if (base.length === 0) return selected;
    if (selected.length === 0) return base;
    const selectedByKey = new Map(selected.map((item: any) => [keyOf(item.name), item]));
    const merged = base.map((item: any) => selectedByKey.get(keyOf(item.name)) ?? item);
    const baseKeys = new Set(base.map((item: any) => keyOf(item.name)));
    const extras = selected.filter((item: any) => !baseKeys.has(keyOf(item.name)));
    return [...merged, ...extras].map(format);
  }),
}));

jest.mock("../src/api/subscriptionPricingApi", () => ({
  getCookSubscriptionPriceQuote: jest.fn(),
  getSubscriptionPricing: jest.fn(),
}));

jest.mock("../src/redux/hooks", () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock("../src/redux/cartSlice", () => ({
  addToCartThunk: (payload: any) => mockAddToCart(payload),
  setScheduledTime: (payload: any) => mockSetScheduledTime(payload),
}));

jest.mock("../src/services/customerAnalyticsEvents", () => ({
  trackServiceViewed: (...args: any[]) => mockTrackViewed(...args),
  trackServiceAddedToCart: (...args: any[]) => mockTrackAdded(...args),
}));

const details = {
  serviceId: 55,
  serviceName: "Cook and Clean",
  imageUrl: "detail.png",
  price: 500,
  addons: [
    {
      addonId: 1,
      name: "Required material",
      shortDescription: "Always included",
      price: 50,
      required: true,
      quantityAllowed: false,
      minQuantity: 1,
      maxQuantity: 1,
    },
    {
      addonId: 2,
      name: "Extra dishes",
      shortDescription: "Additional preparation",
      price: 100,
      required: false,
      quantityAllowed: true,
      minQuantity: 1,
      maxQuantity: 2,
    },
  ],
  included: ["Kitchen preparation"],
  excluded: [],
  faqs: [
    "Q: Do I provide groceries?",
    "A: Yes, groceries are provided by the customer.",
    "Standalone question",
    "Standalone answer",
  ],
  instructions: ["Keep the kitchen accessible"],
};

function routeParams(overrides: any = {}) {
  return {
    serviceId: "55",
    serviceName: "Cook and Clean",
    servicePriceLabel: "Rs. 500",
    serviceImageUrl: "detail.png",
    categoryId: "cook",
    categoryName: "Cook Cleaning",
    ...overrides,
  };
}

async function renderScreen(overrides: any = {}) {
  return await render(
    <ServiceDetailScreen
      route={{ params: routeParams(overrides) }}
      navigation={{ navigate: mockNavigate, goBack: mockGoBack }}
    />,
  );
}

describe("ServiceDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchDetails.mockResolvedValue(details);
    mockCookQuery = {
      data: [
        {
          familySizeId: 1,
          familySize: "SMALL",
          label: "1-2 Members",
          subtitle: "Small family",
        },
        {
          familySizeId: 2,
          familySize: "LARGE",
          label: "5-6 Members",
          subtitle: "Large family",
        },
      ],
      isFetching: false,
    };
    mockPricingQuery = {
      data: [
        { id: 1, serviceId: 55, durationHours: 1, perVisitPrice: 350, active: true },
        { id: 2, serviceId: null, durationHours: 2, perVisitPrice: 600, active: true },
        { id: 3, serviceId: null, durationHours: 0, perVisitPrice: 0, active: true },
      ],
      isFetching: false,
    };
    mockCookCoverageQuery = {
      data: {
        items: [{ name: "Dal" }, { name: "Rice" }, { name: "Seasonal Sabzi" }, { name: "8-10 Rotis" }],
      },
      isFetching: false,
    };
    mockCookCoverageSelectedQuery = {
      data: {
        items: [{ name: "Dal" }, { name: "Rice" }, { name: "Seasonal Sabzi" }, { name: "18-20 Rotis" }],
      },
      isFetching: false,
    };
    mockCookPriceQuery = {
      data: {
        pricePerVisit: 700,
        totalPrice: 700,
      },
      isFetching: false,
    };
    mockUnwrap = jest.fn().mockResolvedValue({});
    mockDispatch.mockImplementation((action: any) => {
      if (action?.type === "cart/add") return { unwrap: mockUnwrap };
      return action;
    });
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as any);
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it("renders load success, tracks the view, shares, and closes", async () => {
    const view = await renderScreen({
      showCookCoverage: true,
      showCleaningCoverage: true,
    });

    expect(await view.findByText("Cook and Clean")).toBeTruthy();
    expect(view.getByText("Cook Coverage")).toBeTruthy();
    expect(view.getByText("Time Based")).toBeTruthy();
    expect(view.getAllByText("Rs. 700").length).toBeGreaterThan(0);
    expect(view.getByText("Dal")).toBeTruthy();
    expect(view.getByText("Rice")).toBeTruthy();
    expect(view.getByText("Required material")).toBeTruthy();
    expect(view.getByText("Kitchen preparation")).toBeTruthy();
    expect(mockTrackViewed).toHaveBeenCalledWith({
      service_id: 55,
      service_name: "Cook and Clean",
      source: "service_detail",
    });

    await fireEvent.press(view.getByLabelText("icon-share-variant-outline"));
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Cook and Clean",
        message: expect.stringContaining("Service ID: 55"),
      }),
    );

    await fireEvent.press(view.getByLabelText("icon-chevron-left"));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it.each(["Vehicle Wash", "Vehical Wash", "Fitness & Wellness"])(
    "selects Time Based duration and passes it to cart for %s",
    async categoryName => {
      mockFetchDetails.mockResolvedValue({ ...details, serviceName: "Standard service" });
      const view = await renderScreen({ categoryName, categoryId: "other", serviceName: "Standard service" });
      await view.findByText("Standard service");
      expect(view.getByText("Time Based")).toBeTruthy();
      await fireEvent.press(view.getByText("2 hrs"));
      expect(view.getAllByText("Rs. 600").length).toBeGreaterThan(0);
      await fireEvent.press(view.getByText("Book Now"));
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("CartCrud", expect.objectContaining({
        serviceId: 55, categoryName, durationHours: 2, durationLabel: "2 hrs",
      })));
    },
  );

  it("selects coverage and add-ons, expands sections, and creates a scheduled cart payload", async () => {
    mockFetchDetails.mockResolvedValue({
      ...details,
      serviceName: "Deep Cleaning",
    });
    const view = await renderScreen({
      source: "schedule_booking_wizard",
      bookingMode: "SCHEDULED",
      scheduleMode: "FIXED",
      serviceName: "Deep Cleaning",
      categoryName: "Cleaning",
      showCookCoverage: false,
      showCleaningCoverage: true,
    });
    await view.findByText("Deep Cleaning");

    await fireEvent.press(view.getByText("1 hr"));
    await fireEvent.press(view.getByText("Extra dishes"));

    expect(view.getAllByText("Rs. 350").length).toBeGreaterThan(0);
    expect(view.getByText("Rs. 150")).toBeTruthy();
    expect(view.getByText("Rs. 500")).toBeTruthy();

    await fireEvent.press(view.getByText("Show All"));
    expect(view.getByText("Keep the kitchen accessible")).toBeTruthy();
    expect(view.getByText("No exclusions")).toBeTruthy();
    expect(view.getByText("Hide All")).toBeTruthy();

    await fireEvent.press(view.getByText("Q: Do I provide groceries?"));
    expect(view.getByText("A: Yes, groceries are provided by the customer.")).toBeTruthy();

    await fireEvent.press(view.getByLabelText("Go to cart"));
    await waitFor(() => expect(mockUnwrap).toHaveBeenCalled());

    expect(mockAddToCart).toHaveBeenCalledWith({
      serviceId: 55,
      categoryId: "cook",
      categoryName: "Cleaning",
      quantity: 1,
      addons: [
        { addonId: 1, quantity: 1 },
        { addonId: 2, quantity: 1 },
      ],
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "cart/scheduled",
      payload: null,
    });
    expect(mockTrackAdded).toHaveBeenCalledWith(
      expect.objectContaining({
        service_id: 55,
        booking_mode: "SCHEDULED",
        schedule_mode: "FIXED",
        source: "schedule_booking_wizard",
      }),
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      "CartCrud",
      expect.objectContaining({
        recurringBooking: null,
        categoryName: "Cleaning",
        bookingMode: "SCHEDULED",
        scheduleMode: "FIXED",
        durationHours: 1,
        durationLabel: "1 hr",
      }),
    );
  });

  it("guards missing cook and cleaning coverage selections", async () => {
    let view = await renderScreen({
      categoryName: "Cook",
      showCookCoverage: true,
      showCleaningCoverage: false,
    });
    await view.findByText("Cook Coverage");
    await fireEvent.press(view.getByLabelText("Add service to cart"));
    expect(Alert.alert).toHaveBeenCalledWith(
      "Select family size",
      "Please select a family size in Cook Coverage before going to cart.",
    );

    await cleanup();
    mockFetchDetails.mockResolvedValue({
      ...details,
      serviceName: "Deep Cleaning",
    });
    view = await renderScreen({
      serviceName: "Deep Cleaning",
      categoryName: "Cleaning",
      showCookCoverage: false,
      showCleaningCoverage: true,
    });
    await view.findByText("Time Based");
    await fireEvent.press(view.getByLabelText("Add service to cart"));
    expect(Alert.alert).toHaveBeenLastCalledWith(
      "Select duration",
      "Please select a time based duration before going to cart.",
    );
  });

  it("keeps cook coverage items stable for non-small family sizes", async () => {
    const view = await renderScreen({
      showCookCoverage: true,
      showCleaningCoverage: false,
    });
    await view.findByText("Cook Coverage");

    await fireEvent.press(view.getByText("5-6 Members"));

    expect(view.getByText("Dal")).toBeTruthy();
    expect(view.getByText("Rice")).toBeTruthy();
    expect(view.getByText("Seasonal Sabzi")).toBeTruthy();
    expect(view.getByText("18-20 Rotis")).toBeTruthy();
    expect(view.getByText("8-10 Rotis")).toBeTruthy();
  });

  it("shows an empty cook coverage state when admin coverage is unavailable", async () => {
    mockCookCoverageQuery = {
      data: {
        items: [],
      },
      isFetching: false,
    };
    mockCookCoverageSelectedQuery = {
      data: {
        items: [],
      },
      isFetching: false,
    };
    mockCookPriceQuery = {
      data: undefined,
      isFetching: false,
    };
    const view = await renderScreen({
      showCookCoverage: true,
      showCleaningCoverage: false,
    });

    await view.findByText("Cook Coverage");
    expect(view.getByText("No meal coverage available right now.")).toBeTruthy();
  });

  it("shows invalid-id and API failure states and supports retry expansion", async () => {
    let view = await render(
      <ServiceDetailScreen
        route={{ params: { serviceId: "invalid" } }}
        navigation={{ navigate: mockNavigate, goBack: mockGoBack }}
      />,
    );
    expect(await view.findByText("Invalid service id")).toBeTruthy();
    await fireEvent.press(view.getByText("Retry"));

    await cleanup();
    mockFetchDetails.mockRejectedValueOnce(new Error("Details unavailable"));
    view = await renderScreen();
    expect(await view.findByText("Details unavailable")).toBeTruthy();
  });

  it("shows cook coverage automatically for breakfast services", async () => {
    mockFetchDetails.mockResolvedValueOnce({
      ...details,
      serviceName: "Breakfast At Home",
      addons: [],
    });
    mockCookCoverageQuery = {
      data: {
        items: [{ name: "Poha", quantity: 1 }, { name: "Tea", quantity: 1 }],
      },
      isFetching: false,
    };
    mockCookCoverageSelectedQuery = {
      data: {
        items: [{ name: "Poha", quantity: 2 }, { name: "Tea", quantity: 1 }, { name: "Sandwich", quantity: 1 }],
      },
      isFetching: false,
    };
    mockCookPriceQuery = {
      data: {
        pricePerVisit: 320,
        totalPrice: 320,
      },
      isFetching: false,
    };

    const view = await renderScreen({
      serviceName: "Breakfast At Home",
      categoryName: "Breakfast At Home",
      showCookCoverage: false,
      showCleaningCoverage: false,
    });

    expect(await view.findByText("Breakfast At Home")).toBeTruthy();
    expect(view.getByText("Cook Coverage")).toBeTruthy();
    expect(view.queryByText("Time Based")).toBeNull();
    expect(view.getByText("Poha x2")).toBeTruthy();
    expect(view.getByText("Tea x1")).toBeTruthy();
    expect(view.getByText("Sandwich x1")).toBeTruthy();
    expect(view.getByText("No add-ons available for this service right now.")).toBeTruthy();
    expect(view.getAllByText("Rs. 320").length).toBeGreaterThan(0);
    expect(view.getByText("Rs. 0")).toBeTruthy();
  });

  it("shows add-to-cart errors and does not navigate", async () => {
    mockUnwrap.mockRejectedValueOnce(new Error("Cart unavailable"));
    mockFetchDetails.mockResolvedValueOnce({
      ...details,
      serviceName: "General Service",
    });
    const view = await renderScreen({
      serviceName: "General Service",
      categoryName: "General",
      showCookCoverage: false,
      showCleaningCoverage: false,
    });
    await view.findByText("General Service");

    await fireEvent.press(view.getByLabelText("Add service to cart"));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Unable to add service",
        "Cart unavailable",
      ),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("ignores a resolved request after unmount", async () => {
    let resolveDetails!: (value: typeof details) => void;
    mockFetchDetails.mockReturnValueOnce(
      new Promise(resolve => {
        resolveDetails = resolve;
      }),
    );
    const view = await renderScreen();
    await view.unmount();
    resolveDetails(details);
    await Promise.resolve();

    expect(mockTrackViewed).not.toHaveBeenCalled();
  });
});
