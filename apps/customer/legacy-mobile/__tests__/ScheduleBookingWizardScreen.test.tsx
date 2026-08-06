import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react-native";

import { ScheduleBookingWizardScreen } from "../src/screens/booking/ScheduleBookingWizardScreen";

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockFetchHomeData = jest.fn(() => ({ type: "home/fetch" }));

let mockState: any;
let mockQuery: any;

jest.mock("react-native-vector-icons/MaterialCommunityIcons", () => {
  const { Text } = require("react-native");
  return ({ name }: any) => <Text accessibilityLabel={`icon-${name}`}>{name}</Text>;
});

jest.mock("@tanstack/react-query", () => ({
  useQuery: () => mockQuery,
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
    <ScheduleBookingWizardScreen
      navigation={{ navigate: mockNavigate, goBack: mockGoBack }}
    />,
  );
}

describe("ScheduleBookingWizardScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockImplementation((action) => action);
    mockState = {
      home: {
        loading: false,
        categories: [
          { categoryId: "clean", categoryName: "Cleaning", imageUrl: "clean.png" },
          { categoryId: "party", categoryName: "Party Services" },
        ],
      },
    };
    mockQuery = {
      data: [
        {
          serviceId: 31,
          serviceName: "Scheduled Cleaning",
          description: "Two hour service",
          price: 750,
          hourlyRate: 350,
          bookingModes: ["FIXED", "INSTANT"],
          rating: 4,
        },
        {
          id: 32,
          name: "Default Fixed Service",
          bookingModes: null,
        },
        {
          id: 0,
          name: "Invalid",
        },
      ],
      isFetching: false,
    };
  });

  afterEach(async () => cleanup());

  it("renders fixed services and opens scheduled service details", async () => {
    const view = await renderScreen();

    expect(view.getByText("Scheduled Cleaning")).toBeTruthy();
    expect(view.getByText("Rs. 750")).toBeTruthy();
    expect(view.getByText("4.0")).toBeTruthy();
    expect(view.getByText("Price pending")).toBeTruthy();

    await fireEvent.press(view.getByLabelText("Open Scheduled Cleaning details"));
    expect(mockNavigate).toHaveBeenCalledWith("ServiceDetail", {
      serviceId: "31",
      serviceName: "Scheduled Cleaning",
      servicePriceLabel: "Rs. 750",
      serviceImageUrl: undefined,
      source: "schedule_booking_wizard",
      bookingMode: "SCHEDULED",
      scheduleMode: "FIXED",
      categoryId: "clean",
      categoryName: "Cleaning",
      showCookCoverage: false,
    });
  });

  it("filters search results, switches category, and navigates back", async () => {
    const view = await renderScreen();
    await fireEvent.changeText(
      view.getByPlaceholderText("Search Cleaning"),
      "scheduled",
    );
    expect(view.queryByText("Default Fixed Service")).toBeNull();

    await fireEvent.press(view.getByText("Party Services"));
    expect(view.getByPlaceholderText("Search Party Services").props.value).toBe("");

    await fireEvent.press(view.getByLabelText("Open Scheduled Cleaning details"));
    expect(mockNavigate).toHaveBeenLastCalledWith(
      "ServiceDetail",
      expect.objectContaining({
        categoryId: "party",
        categoryName: "Party Services",
        showCookCoverage: true,
      }),
    );

    await fireEvent.press(view.getByLabelText("icon-arrow-left"));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it("dispatches category loading and renders loading and empty states", async () => {
    mockState.home = { loading: false, categories: [] };
    let view = await renderScreen();
    expect(view.getByText("No categories available")).toBeTruthy();
    expect(mockDispatch).toHaveBeenCalledWith({ type: "home/fetch" });

    await cleanup();
    mockState.home = { loading: true, categories: [] };
    view = await renderScreen();
    expect(view.queryByText("No categories available")).toBeNull();

    await cleanup();
    mockState.home = {
      loading: false,
      categories: [{ id: 1, name: "Cleaning" }],
    };
    mockQuery = { data: [], isFetching: false };
    view = await renderScreen();
    expect(view.getByText("No services found")).toBeTruthy();
  });

  it("ignores malformed response data while fetching", async () => {
    mockQuery = { data: undefined, isFetching: true };
    const view = await renderScreen();

    expect(view.getAllByText("Cleaning").length).toBeGreaterThan(0);
    expect(view.queryByText("No services found")).toBeNull();
  });
});
