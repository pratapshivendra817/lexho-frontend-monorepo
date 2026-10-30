import React from "react";
import { Alert } from "react-native";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { FavoritesScreen } from "../src/screens/home/FavoritesScreen";
import { BookingDetailScreen } from "../src/screens/booking/BookingDetailScreen";

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockAddFavorite = jest.fn();
const mockRemoveFavorite = jest.fn();
const mockDetailsRefetch = jest.fn();
let mockState: any;
let mockDetailsQuery: any;
let mockPaymentQuery: any;

jest.mock("../src/redux/hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector(mockState),
}));
jest.mock("../src/redux/favoritesSlice", () => ({
  fetchFavorites: () => ({ type: "favorites/fetch" }),
}));
jest.mock("../src/api/favoritesApi", () => ({
  addFavorite: (...args: any[]) => mockAddFavorite(...args),
  removeFavorite: (...args: any[]) => mockRemoveFavorite(...args),
}));
jest.mock("../src/components/Loader", () => ({
  Loader: () => {
    const { Text } = require("react-native");
    return <Text>Creating booking</Text>;
  },
}));
jest.mock("../src/components/ErrorState", () => ({
  ErrorState: ({ message, onRetry }: any) => {
    const { Pressable, Text, View } = require("react-native");
    return <View><Text>{message}</Text><Pressable onPress={onRetry}><Text>Retry booking</Text></Pressable></View>;
  },
}));
jest.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) =>
    options.queryKey[0] === "booking-details" ? mockDetailsQuery : mockPaymentQuery,
}));
jest.mock("../src/components/booking/BookingTimeline", () => ({
  BookingTimeline: () => {
    const { Text } = require("react-native");
    return <Text>Detail timeline</Text>;
  },
}));
jest.mock("../src/components/booking/CustomerReviewCard", () => ({
  CustomerReviewCard: ({ onSubmitted }: any) => {
    const { Pressable, Text } = require("react-native");
    return <Pressable onPress={onSubmitted}><Text>Submit review</Text></Pressable>;
  },
}));

describe("high-impact simple screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockImplementation((action) => action);
    mockState = {
      auth: { user: { id: 7 } },
      location: { currentAddress: { id: "A1" } },
      favorites: {
        list: [{ id: "F1", name: "Deep Clean" }],
        loading: false,
        error: null,
      },
    };
    mockAddFavorite.mockResolvedValue({});
    mockRemoveFavorite.mockResolvedValue({});
    mockDetailsQuery = {
      data: {
        id: "B1",
        serviceName: "Deep Clean",
        status: "COMPLETED",
        createdAt: "2026-06-13T10:00:00",
        bookingType: "INSTANT",
        partnerName: "Amit",
        etaMinutes: 10,
        amount: 400,
        totalAmount: 500,
      },
      isLoading: false,
      refetch: mockDetailsRefetch,
    };
    mockPaymentQuery = {
      data: { data: { status: "SUCCESS", mode: "UPI", transactionId: "TX1" } },
    };
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it("adds and removes favorites and renders loading/error states", async () => {
    const view = await render(<FavoritesScreen />);
    expect(mockDispatch).toHaveBeenCalledWith({ type: "favorites/fetch" });
    await fireEvent.changeText(view.getByTestId("text-input-outlined"), " S2 ");
    await fireEvent.press(view.getByText("Add Favorite"));
    await waitFor(() => expect(mockAddFavorite).toHaveBeenCalledWith({ serviceId: "S2" }));
    await fireEvent.press(view.getByText("Remove"));
    expect(mockRemoveFavorite).toHaveBeenCalledWith("F1");

    await cleanup();
    mockState.favorites = { list: [], loading: true, error: "Favorites failed" };
    const stateView = await render(<FavoritesScreen />);
    expect(stateView.getByText("Loading...")).toBeTruthy();
    expect(stateView.getByText("Favorites failed")).toBeTruthy();
  });

  it("renders booking loading, empty, detail, payment, and review refresh states", async () => {
    mockDetailsQuery = { isLoading: true, data: null, refetch: mockDetailsRefetch };
    let view = await render(<BookingDetailScreen route={{ params: { bookingId: "B1" } }} />);
    expect(view.toJSON()).not.toBeNull();

    await cleanup();
    mockDetailsQuery = { isLoading: false, data: null, refetch: mockDetailsRefetch };
    view = await render(<BookingDetailScreen route={{ params: { bookingId: "B1" } }} />);
    expect(view.getByText("Booking details not available.")).toBeTruthy();

    await cleanup();
    mockDetailsQuery = {
      ...mockDetailsQuery,
      data: {
        id: "B1",
        serviceName: "Deep Clean",
        status: "COMPLETED",
        createdAt: "invalid",
        totalAmount: 500,
      },
    };
    view = await render(<BookingDetailScreen route={{ params: { bookingId: "B1" } }} />);
    expect(view.getByText("Deep Clean")).toBeTruthy();
    expect(view.getByText("Payment Status: SUCCESS")).toBeTruthy();
    expect(view.getByText("Detail timeline")).toBeTruthy();
    await fireEvent.press(view.getByText("Submit review"));
    expect(mockDetailsRefetch).toHaveBeenCalled();
  });
});
