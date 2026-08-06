import React from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { InstantBookingWizardScreen } from "../src/screens/booking/InstantBookingWizardScreen";

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockFetchHomeData = jest.fn(() => ({ type: "home/fetch" }));
const mockFetchServices = jest.fn();

let mockState: any;
let mockQuery: any;

jest.mock("react-native-vector-icons/MaterialCommunityIcons", () => {
  const { Text } = require("react-native");
  return ({ name }: any) => <Text accessibilityLabel={`icon-${name}`}>{name}</Text>;
});

jest.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) => {
    mockFetchServices.mockImplementation(options.queryFn);
    return mockQuery;
  },
}));

jest.mock("../src/redux/hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector(mockState),
}));

jest.mock("../src/redux/homeSlice", () => ({
  fetchHomeData: () => mockFetchHomeData(),
}));

jest.mock("../src/api/serviceApi", () => ({
  fetchCustomerServicesByCategory: jest.fn(),
}));

async function renderScreen() {
  return await render(
    <InstantBookingWizardScreen
      navigation={{ navigate: mockNavigate, goBack: mockGoBack }}
    />,
  );
}

describe("InstantBookingWizardScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockImplementation((action) => action);
    mockState = {
      home: {
        loading: false,
        categories: [
          { categoryId: 10, categoryName: "Cleaning", categoryImage: "clean.png" },
          { id: 20, name: "Cook & Chef" },
          { id: null, name: "" },
        ],
      },
    };
    mockQuery = {
      data: [
        {
          serviceId: 101,
          serviceName: "Deep Cleaning",
          description: "Kitchen and bathroom",
          imageUrl: "service.png",
          discountedPrice: 499,
          rating: 4.56,
        },
        {
          id: 102,
          name: "Basic Cleaning",
          price: 200.5,
        },
        { id: 0, name: "Invalid" },
      ],
      isFetching: false,
    };
  });

  afterEach(async () => cleanup());

  it("renders categories and services, navigates back, and opens service details", async () => {
    const view = await renderScreen();

    expect(view.getByText("Instant Booking")).toBeTruthy();
    expect(view.getByText("Cleaning services")).toBeTruthy();
    expect(view.getByText("Deep Cleaning")).toBeTruthy();
    expect(view.getByText("Rs. 499")).toBeTruthy();
    expect(view.getByText("4.6")).toBeTruthy();

    await fireEvent.press(view.getByLabelText("Open Deep Cleaning details"));

    expect(mockNavigate).toHaveBeenCalledWith("ServiceDetail", {
      serviceId: "101",
      serviceName: "Deep Cleaning",
      servicePriceLabel: "Rs. 499",
      serviceImageUrl: "service.png",
      source: "instant_booking_wizard",
      bookingMode: "INSTANT",
      categoryId: "10",
      categoryName: "Cleaning",
      showCookCoverage: false,
    });

    await fireEvent.press(view.getByLabelText("icon-arrow-left"));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it("switches category, clears search, and marks cook coverage", async () => {
    const view = await renderScreen();
    const input = view.getByPlaceholderText("Search Cleaning");

    await fireEvent.changeText(input, "deep");
    expect(view.queryByText("Basic Cleaning")).toBeNull();

    await fireEvent.press(view.getByText("Cook & Chef"));
    expect(view.getByPlaceholderText("Search Cook & Chef").props.value).toBe("");

    await fireEvent.press(view.getByLabelText("Open Deep Cleaning details"));
    expect(mockNavigate).toHaveBeenLastCalledWith(
      "ServiceDetail",
      expect.objectContaining({
        categoryId: "20",
        categoryName: "Cook & Chef",
        showCookCoverage: true,
      }),
    );
  });

  it("shows loading, empty category, and empty service states", async () => {
    mockState.home = { loading: true, categories: [] };
    let view = await renderScreen();
    expect(view.queryByText("No categories available")).toBeNull();

    await cleanup();
    mockState.home = { loading: false, categories: [] };
    view = await renderScreen();
    expect(view.getByText("No categories available")).toBeTruthy();
    expect(mockDispatch).toHaveBeenCalledWith({ type: "home/fetch" });

    await cleanup();
    mockState.home = {
      loading: false,
      categories: [{ id: 1, name: "Cleaning" }],
    };
    mockQuery = { data: [], isFetching: false };
    view = await renderScreen();
    expect(view.getByText("No services found")).toBeTruthy();
  });

  it("renders the fetching state and handles malformed API data", async () => {
    mockQuery = { data: { malformed: true }, isFetching: true };
    const view = await renderScreen();

    expect(view.queryByText("No services found")).toBeNull();
    await waitFor(() => expect(view.getByText("Cleaning services")).toBeTruthy());
  });
});
