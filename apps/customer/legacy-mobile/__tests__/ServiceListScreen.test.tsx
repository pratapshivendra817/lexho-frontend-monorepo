import React from "react";
import { Linking } from "react-native";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { ServiceListScreen } from "../src/screens/service/ServiceListScreen";

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockPush = jest.fn();
const mockGoBack = jest.fn();
const mockGetToken = jest.fn();
const mockFetchServices = jest.fn((payload) => ({ type: "service/fetch", payload }));
const mockFetchBanners = jest.fn((payload) => ({ type: "banner/fetch", payload }));

let mockState: any;

jest.mock("react-native-vector-icons/MaterialCommunityIcons", () => {
  const { Text } = require("react-native");
  return ({ name }: any) => <Text accessibilityLabel={`icon-${name}`}>{name}</Text>;
});

jest.mock("../src/redux/hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector(mockState),
}));

jest.mock("../src/redux/serviceSlice", () => ({
  fetchServicesByCategory: (payload: any) => mockFetchServices(payload),
  fetchBannersByCategory: (payload: any) => mockFetchBanners(payload),
}));

jest.mock("../src/utils/storage", () => ({
  getToken: () => mockGetToken(),
}));

jest.mock("../src/components/service/ServiceCard", () => ({
  ServiceCard: ({ item, onPress, onAdd, imageRequestHeaders }: any) => {
    const { Pressable, Text: NativeText, View } = require("react-native");
    return (
      <View>
        <NativeText>{item.name}</NativeText>
        <NativeText>{item.discountedPriceLabel}</NativeText>
        <NativeText>{item.ratingLabel}</NativeText>
        <NativeText>{JSON.stringify(imageRequestHeaders)}</NativeText>
        <Pressable accessibilityLabel={`open-${item.name}`} onPress={() => onPress(item.id)}>
          <NativeText>Open</NativeText>
        </Pressable>
        <Pressable accessibilityLabel={`add-${item.name}`} onPress={() => onAdd(item.id)}>
          <NativeText>Add</NativeText>
        </Pressable>
      </View>
    );
  },
}));

jest.mock("../src/components/service/BannerCarousel", () => ({
  BannerCarousel: ({ banners, onPressBanner, imageRequestHeaders }: any) => {
    const { Pressable, Text: NativeText, View } = require("react-native");
    return (
      <View>
        <NativeText>{JSON.stringify(imageRequestHeaders)}</NativeText>
        {banners.map((banner: any) => (
          <Pressable
            key={banner.id}
            accessibilityLabel={`banner-${banner.id}`}
            onPress={() => onPressBanner(banner)}
          >
            <NativeText>{banner.title || "Banner"}</NativeText>
          </Pressable>
        ))}
      </View>
    );
  },
}));

function serviceState(overrides: any = {}) {
  return {
    service: {
      services: [
        {
          id: "svc-20",
          serviceName: "Premium Clean",
          discountedPrice: "Rs 500",
          originalPrice: 700,
          rating: "4.8",
          totalReviews: 12,
          imageUrl: "clean.png",
          isNew: true,
        },
        {
          serviceId: 10,
          name: "Basic Clean",
          price: 200,
          rating: 3.5,
          reviewsCount: 2,
        },
        { id: "invalid", name: "Invalid" },
      ],
      loading: false,
      refreshing: false,
      loadingMore: false,
      hasMore: true,
      page: 1,
      error: null,
      banners: [],
      bannersLoading: false,
      bannersError: null,
      ...overrides,
    },
    auth: { token: "redux-token" },
  };
}

async function renderScreen(params: any = { categoryId: 7, categoryName: "Cleaning" }) {
  return await render(
    <ServiceListScreen
      route={{ params }}
      navigation={{ navigate: mockNavigate, push: mockPush, goBack: mockGoBack }}
    />,
  );
}

describe("ServiceListScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockImplementation((action) => action);
    mockGetToken.mockResolvedValue("stored-token");
    mockState = serviceState();
    jest.spyOn(Linking, "canOpenURL").mockResolvedValue(true);
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined as never);
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it("loads, renders, sorts, opens a service, refreshes, paginates, and goes back", async () => {
    const view = await renderScreen();

    expect(view.getByText("Available Services")).toBeTruthy();
    expect(view.getByText("Premium Clean")).toBeTruthy();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "service/fetch",
      payload: { categoryId: 7, page: 0, size: 20, append: false },
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "banner/fetch",
      payload: { categoryId: 7 },
    });

    await fireEvent.press(view.getByText("Price Low"));
    await fireEvent.press(view.getByText("Price High"));
    await fireEvent.press(view.getByText("Top Rated"));
    await fireEvent.press(view.getByText("Quick Picks"));
    await fireEvent.press(view.getByText("Popular"));

    await fireEvent.press(view.getByLabelText("open-Premium Clean"));
    expect(mockNavigate).toHaveBeenCalledWith(
      "ServiceDetail",
      expect.objectContaining({
        serviceId: "20",
        categoryId: "7",
        categoryName: "Cleaning",
        showCleaningCoverage: true,
        showCookCoverage: false,
      }),
    );

    const list = view.container.queryAll(
      node => typeof node.props.onRefresh === "function",
    )[0];
    await fireEvent(list, "refresh");
    await fireEvent(list, "endReached");
    expect(mockFetchServices).toHaveBeenCalledWith({
      categoryId: 7,
      page: 2,
      size: 20,
      append: true,
    });

    await fireEvent.press(view.getByLabelText("icon-chevron-left"));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it("renders loading, errors, retry, banner error, empty state, and footer loading", async () => {
    mockState = serviceState({
      services: [],
      loading: true,
      bannersLoading: true,
      loadingMore: true,
    });
    let view = await renderScreen();
    expect(view.queryByText("No services available in this category right now.")).toBeNull();

    await cleanup();
    mockState = serviceState({
      services: [],
      error: "Services unavailable",
      bannersError: "banner failure",
    });
    view = await renderScreen();
    expect(view.getByText("Services unavailable")).toBeTruthy();
    expect(view.getByText("Promotional banners unavailable right now.")).toBeTruthy();
    await fireEvent.press(view.getByText("Retry"));
    expect(mockFetchServices).toHaveBeenCalledWith({
      categoryId: 7,
      page: 0,
      size: 20,
      append: false,
    });

    await cleanup();
    mockState = serviceState({ services: [] });
    view = await renderScreen();
    expect(view.getByText("No services available in this category right now.")).toBeTruthy();
  });

  it("handles category, service, external, invalid, and blocked banner redirects", async () => {
    mockState = serviceState({
      banners: [
        { id: 1, title: "Cook", redirectType: "CATEGORY", redirectValue: 9 },
        { id: 2, title: "Service", redirectType: "SERVICE", redirectValue: 42 },
        { id: 3, title: "Web", redirectType: "EXTERNAL", redirectUrl: "https://lexho.test" },
        { id: 4, title: "Invalid", redirectType: "SERVICE", redirectValue: "bad" },
      ],
    });
    const view = await renderScreen();

    await fireEvent.press(view.getByLabelText("banner-1"));
    expect(mockPush).toHaveBeenCalledWith("ServiceList", {
      categoryId: 9,
      categoryName: "Cook",
    });

    await fireEvent.press(view.getByLabelText("banner-2"));
    expect(mockNavigate).toHaveBeenCalledWith("ServiceDetail", { serviceId: "42" });

    await fireEvent.press(view.getByLabelText("banner-3"));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith("https://lexho.test"));

    await fireEvent.press(view.getByLabelText("banner-4"));
    expect(mockNavigate).toHaveBeenCalledTimes(1);

    (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false);
    await fireEvent.press(view.getByLabelText("banner-3"));
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
  });

  it("falls back to storage token and tolerates storage failure", async () => {
    mockState.auth.token = "";
    let view = await renderScreen();
    await waitFor(() =>
      expect(view.getAllByText(/stored-token/).length).toBeGreaterThan(0),
    );

    await cleanup();
    mockGetToken.mockRejectedValueOnce(new Error("storage unavailable"));
    view = await renderScreen();
    await waitFor(() => expect(view.getByText("Available Services")).toBeTruthy());
  });

  it("skips load and pagination without a category or when requests are busy", async () => {
    mockState = serviceState({ loadingMore: true, refreshing: true, hasMore: false });
    const view = await renderScreen({ categoryName: "Cook" });
    const list = view.container.queryAll(
      node => typeof node.props.onEndReached === "function",
    )[0];

    await fireEvent(list, "refresh");
    await fireEvent(list, "endReached");
    expect(mockFetchServices).not.toHaveBeenCalled();
  });
});
