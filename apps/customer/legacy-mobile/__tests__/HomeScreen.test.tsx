import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Image } from "react-native";
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { HomeScreen } from "../src/screens/home/HomeScreen";

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockParentNavigate = jest.fn();
const mockFetchHomeData = jest.fn(() => ({ type: "home/fetch" }));
const mockFetchCustomerCartThunk = jest.fn(() => ({ type: "cart/fetch" }));
const mockFetchCustomerAddressesThunk = jest.fn(() => ({ type: "cart/addresses" }));
const mockFetchAllAddressesThunk = jest.fn((payload) => ({ type: "location/addresses", payload }));
const mockAddToCartThunk = jest.fn();
const mockFetchCatalog = jest.fn();
const mockFetchByCategory = jest.fn();
const mockSearchServices = jest.fn();
const mockGetToken = jest.fn();
const mockTrackServiceAdded = jest.fn();

let mockState: ReturnType<typeof buildHomeState>;
let mockUnreadQuery: { data?: unknown; isLoading: boolean; isError: boolean };

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void) => {
    callback();
  },
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: () => mockUnreadQuery,
}));

jest.mock("react-native-linear-gradient", () => "LinearGradient");
jest.mock("react-native-vector-icons/MaterialCommunityIcons", () => {
  const { Text } = require("react-native");
  return ({ name }: { name: string }) => <Text accessibilityLabel={`icon-${name}`}>{name}</Text>;
});

jest.mock("react-native-paper", () => {
  const { Pressable, Text, TextInput, View } = require("react-native");
  return {
    Text,
    Button: ({ children, onPress, disabled }: any) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={String(children)}
        accessibilityState={{ disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={onPress}
      >
        <Text>{children}</Text>
      </Pressable>
    ),
    Searchbar: ({ placeholder, value, onChangeText, onClearIconPress }: any) => (
      <View>
        <TextInput
          accessibilityLabel={placeholder}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={onClearIconPress}>
          <Text>Clear search</Text>
        </Pressable>
      </View>
    ),
  };
});

jest.mock("../src/components/common/StaggeredFadeIn", () => ({
  StaggeredFadeIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("../src/components/common/SkeletonList", () => {
  const { Text, View } = require("react-native");
  return {
    SkeletonList: ({ rows }: { rows: number }) => (
      <View testID="skeleton-list">
        <Text>{`Skeleton rows ${rows}`}</Text>
      </View>
    ),
  };
});

jest.mock("../src/components/common/EmptyStateCard", () => {
  const { Text, View } = require("react-native");
  return {
    EmptyStateCard: ({ title, subtitle }: { title: string; subtitle?: string }) => (
      <View>
        <Text>{title}</Text>
        {subtitle ? <Text>{subtitle}</Text> : null}
      </View>
    ),
  };
});

jest.mock("../src/components/home/PopularServicesShimmer", () => {
  const { Text } = require("react-native");
  return {
    PopularServicesShimmer: () => <Text>Loading popular services</Text>,
  };
});

jest.mock("../src/components/home/ServiceCard", () => {
  const { Pressable, Text, View } = require("react-native");
  return {
    ServiceCard: ({ item, onPress, onAdd }: any) => (
      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`open-${String(item.name)}`}
          onPress={() => onPress(item.id)}
        >
          <Text>{item.name}</Text>
          <Text>{item.priceLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`add-${String(item.name)}`}
          onPress={() => onAdd(item.id)}
        >
          <Text>{`Add ${String(item.name)}`}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="open-invalid-service" onPress={() => onPress("invalid")}>
          <Text>Open invalid service</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="add-invalid-service" onPress={() => onAdd("invalid")}>
          <Text>Add invalid service</Text>
        </Pressable>
      </View>
    ),
  };
});

jest.mock("../src/components/cards/ServiceCard", () => {
  const { Text, View } = require("react-native");
  return {
    ServiceCard: ({ title, subtitle, price }: any) => (
      <View>
        <Text>{title}</Text>
        {subtitle ? <Text>{subtitle}</Text> : null}
        {price ? <Text>{price}</Text> : null}
      </View>
    ),
  };
});

jest.mock("../src/modules/home/DynamicHomeSections", () => {
  const { Text } = require("react-native");
  return {
    DynamicHomeSections: () => <Text>Dynamic home sections</Text>,
  };
});

jest.mock("../src/components/common/QuickBookingSheet", () => ({
  QuickBookingSheet: () => null,
}));

jest.mock("../src/api/serviceApi", () => ({
  fetchCustomerServicesCatalog: (...args: any[]) => mockFetchCatalog(...args),
  fetchCustomerServicesByCategory: (...args: any[]) => mockFetchByCategory(...args),
}));

jest.mock("../src/api/homeApi", () => ({
  searchServices: (...args: any[]) => mockSearchServices(...args),
}));

jest.mock("../src/api/notificationApi", () => ({
  getUnreadNotificationCount: jest.fn(),
}));

jest.mock("../src/redux/homeSlice", () => ({
  fetchHomeData: () => mockFetchHomeData(),
}));

jest.mock("../src/redux/cartSlice", () => ({
  addToCartThunk: (...args: any[]) => mockAddToCartThunk(...args),
  fetchCustomerAddressesThunk: () => mockFetchCustomerAddressesThunk(),
  fetchCustomerCartThunk: () => mockFetchCustomerCartThunk(),
}));

jest.mock("../src/redux/locationSlice", () => ({
  fetchAllAddressesThunk: (payload: any) => mockFetchAllAddressesThunk(payload),
}));

jest.mock("../src/redux/hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector(mockState),
}));

jest.mock("../src/utils/storage", () => ({
  getToken: () => mockGetToken(),
}));

jest.mock("../src/services/customerAnalyticsEvents", () => ({
  trackServiceAddedToCart: (...args: any[]) => mockTrackServiceAdded(...args),
}));

function serviceBuilder(overrides: Record<string, unknown> = {}) {
  return {
    id: "101",
    serviceId: 101,
    name: "Bathroom Cleaning",
    serviceName: "Bathroom Cleaning",
    categoryId: 11,
    categoryName: "Cleaning",
    price: 499,
    rating: 4.7,
    imageUrl: "https://cdn.lexho.test/bathroom.png",
    description: "Deep cleaning",
    ...overrides,
  };
}

function categoryBuilder(overrides: Record<string, unknown> = {}) {
  return {
    id: 11,
    categoryId: 11,
    name: "Cleaning",
    categoryName: "Cleaning",
    imageUrl: "https://cdn.lexho.test/category.png",
    ...overrides,
  };
}

function bannerBuilder(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    bannerId: 1,
    title: "Home shine",
    subtitle: "Premium cleaning",
    imageUrl: "https://cdn.lexho.test/banner.png",
    redirectType: "cart",
    ctaLabel: "Book now",
    ...overrides,
  };
}

function buildHomeState(overrides: Partial<any> = {}) {
  return {
    home: {
      loading: false,
      error: null,
      banners: [bannerBuilder()],
      categories: [
        categoryBuilder(),
        categoryBuilder({ id: 12, categoryId: 12, name: "Cook", categoryName: "Cook" }),
      ],
      popular: [
        serviceBuilder(),
        serviceBuilder({
          id: "202",
          serviceId: 202,
          name: "Daily Cook",
          serviceName: "Daily Cook",
          categoryId: 12,
          categoryName: "Cook",
          price: 699,
        }),
      ],
      recommended: [
        serviceBuilder({
          id: "303",
          serviceId: 303,
          name: "Sofa Cleaning",
          serviceName: "Sofa Cleaning",
        }),
      ],
      quick: [],
      ...overrides.home,
    },
    auth: {
      token: "auth-token",
      user: { id: 42, mobile: "7999700475" },
      ...overrides.auth,
    },
    cart: {
      items: [{ itemId: 1, serviceId: 101 }],
      ...overrides.cart,
    },
    location: {
      serviceAvailable: true,
      currentAddress: {
        id: "gps-42",
        fullAddress: "Sector 1",
        latitude: 22.7,
        longitude: 75.8,
      },
      ...overrides.location,
    },
  };
}

function renderHome(navigationOverrides: Record<string, unknown> = {}) {
  const navigation = {
    navigate: mockNavigate,
    getParent: jest.fn(() => ({ navigate: mockParentNavigate })),
    ...navigationOverrides,
  };
  return render(<HomeScreen navigation={navigation} />);
}

async function openSearch(view: Awaited<ReturnType<typeof renderHome>>) {
  await fireEvent.press(view.getByLabelText("icon-magnify"));
  return view.getByPlaceholderText("Search services...");
}

async function runSearchDebounce() {
  await act(async () => {
    jest.advanceTimersByTime(350);
    await Promise.resolve();
    await Promise.resolve();
  });
}

function getHeroPressable(view: Awaited<ReturnType<typeof renderHome>>) {
  return view.container.queryAll((node) => node.props.accessible === true)[0];
}

describe("HomeScreen", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    await cleanup();
    mockUnreadQuery = { data: 7, isLoading: false, isError: false };
    mockState = buildHomeState();
    mockDispatch.mockImplementation((action: any) => action);
    mockGetToken.mockResolvedValue("stored-token");
    mockFetchCatalog.mockResolvedValue([
      serviceBuilder({ id: "404", serviceId: 404, name: "Kitchen Cleaning" }),
    ]);
    mockFetchByCategory.mockResolvedValue([]);
    mockSearchServices.mockResolvedValue([
      serviceBuilder({ id: "505", serviceId: 505, name: "Kitchen Cleaning" }),
    ]);
    mockAddToCartThunk.mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({}),
    });
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.spyOn(Image, "prefetch").mockResolvedValue(true as never);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("renders success content, badges, location source, and dispatches bootstrap thunks", async () => {
    const view = await renderHome();

    expect(view.getByText("Explore services by category")).toBeTruthy();
    expect(view.getAllByText("Cleaning").length).toBeGreaterThan(0);
    expect(view.getByText("Bathroom Cleaning")).toBeTruthy();
    expect(view.getByText("Daily Cook")).toBeTruthy();
    expect(view.getByText("Auto-detected")).toBeTruthy();
    expect(view.getByText("7")).toBeTruthy();
    expect(view.getByText("1")).toBeTruthy();
    expect(view.getByText("Dynamic home sections")).toBeTruthy();

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({ type: "home/fetch" }));
    expect(mockDispatch).toHaveBeenCalledWith({ type: "cart/fetch" });
    expect(mockDispatch).toHaveBeenCalledWith({ type: "cart/addresses" });
    expect(mockDispatch).toHaveBeenCalledWith({ type: "location/addresses", payload: { userId: 42 } });
    expect(Image.prefetch).toHaveBeenCalledWith("https://cdn.lexho.test/banner.png");
  });

  it("renders loading, API error, and empty API states", async () => {
    mockState = buildHomeState({
      home: {
        loading: true,
        error: "Home API unavailable",
        banners: null,
        categories: null,
        popular: null,
        recommended: undefined,
        quick: undefined,
      },
    });
    let view = await renderHome();

    expect(view.getAllByText("Skeleton rows 2").length).toBeGreaterThan(0);
    expect(view.getAllByText("Loading popular services").length).toBeGreaterThan(0);
    expect(view.getByText("Home API unavailable")).toBeTruthy();

    await cleanup();
    mockState = buildHomeState({
      home: {
        loading: false,
        error: null,
        banners: [],
        categories: [],
        popular: [],
        recommended: [],
        quick: [],
      },
    });
    view = await renderHome();
    expect(view.getByText("No active categories")).toBeTruthy();
    expect(view.getByText("No popular cleaning services")).toBeTruthy();
    expect(view.getByText("No popular cook services")).toBeTruthy();
    expect(view.getByText("No popular services available")).toBeTruthy();
    expect(view.getByText("No services yet")).toBeTruthy();
  });

  it("navigates from location, booking options, category, services, notifications, and cart", async () => {
    const view = await renderHome();

    await fireEvent.press(view.getByText("Cleaning"));
    expect(mockNavigate).toHaveBeenCalledWith("ServiceList", {
      categoryId: "11",
      categoryName: "Cleaning",
    });

    await fireEvent.press(view.getByLabelText("open-Bathroom Cleaning"));
    expect(mockNavigate).toHaveBeenCalledWith("ServiceDetail", {
      serviceId: "101",
      serviceName: "Bathroom Cleaning",
      servicePriceLabel: "Rs. 499",
      serviceImageUrl: "https://cdn.lexho.test/bathroom.png",
    });

    await fireEvent.press(view.getByText("Instant"));
    await fireEvent.press(view.getByText("Schedule"));
    await fireEvent.press(view.getByText("Subscription"));
    expect(mockParentNavigate).toHaveBeenCalledWith("InstantBookingWizard");
    expect(mockParentNavigate).toHaveBeenCalledWith("ScheduleBookingWizard");
    expect(mockParentNavigate).toHaveBeenCalledWith("RecurringBooking");

    await fireEvent.press(view.getByLabelText("icon-map-marker-radius-outline"));
    await fireEvent.press(view.getByLabelText("icon-bell-outline"));
    await fireEvent.press(view.getByLabelText("icon-cart-outline"));
    expect(mockParentNavigate).toHaveBeenCalledWith("LocationSearch");
    expect(mockNavigate).toHaveBeenCalledWith("Notifications");
    expect(mockNavigate).toHaveBeenCalledWith("CartCrud");
  });

  it("uses direct navigation when parent navigator is unavailable", async () => {
    const view = await renderHome({ getParent: jest.fn(() => null) });

    await fireEvent.press(view.getByText("Instant"));
    await fireEvent.press(view.getByLabelText("icon-map-marker-radius-outline"));

    expect(mockNavigate).toHaveBeenCalledWith("InstantBookingWizard");
    expect(mockNavigate).toHaveBeenCalledWith("LocationSearch");
  });

  it.each([
    ["coupon", undefined, "Coupon"],
    ["offer", undefined, "Coupon"],
    ["cart", undefined, "CartCrud"],
    ["payment", undefined, "PaymentStatus"],
    ["tracking", undefined, "LiveTracking"],
    ["", "ADDRESS", "Address"],
    ["", "REVIEWS", "Reviews"],
  ])("maps banner redirect type %s and value %s to %s", async (redirectType, redirectValue, route) => {
    mockState = buildHomeState({
      home: { banners: [bannerBuilder({ redirectType, redirectValue })] },
    });
    const view = await renderHome();

    await fireEvent.press(getHeroPressable(view)!);

    expect(mockNavigate).toHaveBeenCalledWith(route);
  });

  it("ignores unsupported banner mappings and falls back after banner and category image failures", async () => {
    mockState = buildHomeState({
      home: {
        banners: [
          bannerBuilder({
            redirectType: "unknown",
            redirectValue: "UNKNOWN",
            imageUrl: "https://cdn.lexho.test/images/banner.png",
          }),
        ],
      },
    });
    const view = await renderHome();
    const errorImages = view.container.queryAll(
      (node) => node.type === "Image" && typeof node.props.onError === "function",
    );
    const hero = errorImages[0];
    const categoryImage = errorImages.at(-1)!;

    await fireEvent.press(getHeroPressable(view)!);
    expect(mockNavigate).not.toHaveBeenCalled();

    await fireEvent(hero, "error");
    await fireEvent(hero, "error");
    await fireEvent(categoryImage, "error");

    expect(hero.props.source).toBeTruthy();
  });

  it.each(["Party Services", "Cook At Home", "Cleaning Service", "Breakfast At Home"])("preserves %s category and clears repeat booking when adding from home", async categoryName => {
    mockState = buildHomeState({
      home: {
        popular: [
          serviceBuilder({
            id: "707",
            serviceId: 707,
            name: "Birthday Decoration",
            serviceName: "Birthday Decoration",
            categoryName,
            categoryId: 77,
          }),
        ],
      },
    });
    const view = await renderHome();

    await fireEvent.press(view.getAllByLabelText("add-Birthday Decoration")[0]);

    await waitFor(() =>
      expect(mockAddToCartThunk).toHaveBeenCalledWith({ serviceId: 707, quantity: 1, categoryName }),
    );
    expect(mockTrackServiceAdded).toHaveBeenCalledWith({
      service_id: 707,
      category_name: categoryName,
      quantity: 1,
      source: "home_popular_service",
    });
    expect(mockNavigate).toHaveBeenCalledWith("CartCrud", {
      recurringBooking: null,
      bookingMode: categoryName === "Party Services" ? "SCHEDULED" : undefined,
      categoryName,
    });
  });

  it("guards invalid services, missing authentication, and add-to-cart failures", async () => {
    let view = await renderHome();
    await fireEvent.press(view.getAllByLabelText("open-invalid-service")[0]);
    await fireEvent.press(view.getAllByLabelText("add-invalid-service")[0]);
    expect(Alert.alert).toHaveBeenCalledWith(
      "Invalid service",
      "Service id is invalid. Please try another service.",
    );

    await cleanup();
    mockState = buildHomeState({ auth: { token: "" } });
    view = await renderHome();
    await fireEvent.press(view.getByLabelText("add-Bathroom Cleaning"));
    expect(Alert.alert).toHaveBeenCalledWith(
      "Login Required",
      "Please login again. Authorization token is missing.",
    );

    await cleanup();
    mockState = buildHomeState();
    mockAddToCartThunk.mockReturnValue({
      unwrap: jest.fn().mockRejectedValue(new Error("Cart service offline")),
    });
    view = await renderHome();
    await fireEvent.press(view.getByLabelText("add-Bathroom Cleaning"));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith("Add to cart failed", "Cart service offline"),
    );
  });

  it("searches catalog and keyword APIs, renders results, persists history, and navigates", async () => {
    mockFetchByCategory.mockResolvedValue([
      serviceBuilder({ id: "606", serviceId: 606, name: "Kitchen Deep Clean" }),
    ]);
    const view = await renderHome();
    const searchInput = await openSearch(view);

    await fireEvent.changeText(searchInput, "Kitchen");
    await runSearchDebounce();

    await waitFor(() => expect(view.getAllByText("Kitchen Cleaning").length).toBeGreaterThan(0));
    expect(mockFetchCatalog).toHaveBeenCalledWith({ page: 0, size: 1000 });
    expect(mockFetchCatalog).toHaveBeenCalledWith({ page: 0, size: 100, search: "Kitchen" });
    expect(mockSearchServices).toHaveBeenCalledWith("Kitchen");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@lexho/customer/recent-service-searches",
      JSON.stringify(["Kitchen"]),
    );

    await fireEvent.press(view.getAllByText("Kitchen Cleaning")[0]);
    expect(mockNavigate).toHaveBeenCalledWith(
      "ServiceDetail",
      expect.objectContaining({ serviceId: expect.stringMatching(/404|505/) }),
    );
  });

  it("renders category search matches, fetches category services, and clears search", async () => {
    mockFetchByCategory.mockResolvedValue([
      serviceBuilder({ id: "808", serviceId: 808, name: "Cleaning Package" }),
    ]);
    const view = await renderHome();
    const searchInput = await openSearch(view);

    await fireEvent.changeText(searchInput, "Cleaning");
    await runSearchDebounce();
    await waitFor(() =>
      expect(mockFetchByCategory).toHaveBeenCalledWith({
        categoryId: "11",
        page: 0,
        size: 50,
      }),
    );

    await fireEvent.press(view.getAllByText("Cleaning")[0]);
    expect(mockNavigate).toHaveBeenCalledWith("ServiceList", {
      categoryId: "11",
      categoryName: "Cleaning",
    });

    await fireEvent.press(view.getByLabelText("Clear search"));
    expect(view.getByPlaceholderText("Search services...").props.value).toBe("");
  });

  it("handles rejected search APIs, empty results, and defensive search errors", async () => {
    mockState = buildHomeState({
      home: {
        categories: [],
        popular: [],
        recommended: [],
        quick: [],
      },
    });
    mockFetchCatalog.mockResolvedValue([]);
    mockSearchServices.mockResolvedValue([]);
    const view = await renderHome();
    const searchInput = await openSearch(view);

    await fireEvent.changeText(searchInput, "unknown-service");
    await runSearchDebounce();
    await waitFor(() => expect(view.getByText("No matching services")).toBeTruthy());

    const allSettledSpy = jest
      .spyOn(Promise, "allSettled")
      .mockRejectedValueOnce(new Error("search coordinator failed"));
    await fireEvent.changeText(searchInput, "another-query");
    await runSearchDebounce();
    await waitFor(() => expect(view.getByText("Search failed")).toBeTruthy());
    expect(view.getByText("search coordinator failed")).toBeTruthy();
    allSettledSpy.mockRestore();
  });

  it("loads, selects, deduplicates, and clears recent searches", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(["Kitchen", "", 42, "Cleaning"]),
    );
    const view = await renderHome();

    await waitFor(() => expect(view.getByText("Recent searches")).toBeTruthy());
    await fireEvent.press(view.getByText("Kitchen"));
    await runSearchDebounce();
    expect(view.getAllByText("Kitchen Cleaning").length).toBeGreaterThan(0);

    await fireEvent.press(view.getByText("Clear all"));
    await waitFor(() =>
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        "@lexho/customer/recent-service-searches",
      ),
    );
    expect(view.queryByText("Recent searches")).toBeNull();
  });

  it("ignores invalid recent-search storage and storage failures", async () => {
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce("{invalid-json")
      .mockRejectedValueOnce(new Error("storage unavailable"));
    let view = await renderHome();
    await act(async () => {
      await Promise.resolve();
    });
    expect(view.queryByText("Recent searches")).toBeNull();

    await cleanup();
    view = await renderHome();
    await act(async () => {
      await Promise.resolve();
    });
    expect(view.queryByText("Recent searches")).toBeNull();
  });

  it("uses stored image auth token and tolerates token lookup failure", async () => {
    mockState = buildHomeState({ auth: { token: "" } });
    mockGetToken.mockResolvedValue("storage-token");
    let view = await renderHome();

    await waitFor(() => {
      const source = view.container.queryAll(
        (node) => node.type === "Image" && Boolean(node.props.source),
      )[0].props.source;
      expect(source.headers.Authorization).toBe("Bearer storage-token");
    });

    await cleanup();
    mockGetToken.mockRejectedValue(new Error("token read failed"));
    view = await renderHome();
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      view.container.queryAll(
        (node) => node.type === "Image" && Boolean(node.props.source),
      )[0].props.source,
    ).toBeTruthy();
  });

  it("renders unavailable-location actions and large badge boundaries", async () => {
    mockUnreadQuery = { data: 150, isLoading: false, isError: false };
    mockState = buildHomeState({
      cart: { items: Array.from({ length: 101 }, (_, index) => ({ itemId: index + 1 })) },
      location: {
        serviceAvailable: false,
        currentAddress: { id: "saved-1", fullAddress: "Saved address" },
      },
    });
    const view = await renderHome();

    expect(view.getAllByText("99+")).toHaveLength(2);
    expect(view.queryByText("Auto-detected")).toBeNull();
    expect(view.getByText("WE ARE COMING SOON")).toBeTruthy();
    await fireEvent.press(view.getByLabelText("Notify me"));
    await fireEvent.press(view.getByLabelText("Change location"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Thanks!",
      "We will notify you when services are available in your area.",
    );
    expect(mockParentNavigate).toHaveBeenCalledWith("LocationSearch");
  });

  it("renders other popular sections and view-all navigation", async () => {
    mockState = buildHomeState({
      home: {
        popular: [
          serviceBuilder(),
          serviceBuilder({
            id: "909",
            serviceId: 909,
            name: "AC Repair",
            serviceName: "AC Repair",
            categoryId: 90,
            categoryName: "Appliance",
          }),
          serviceBuilder({
            id: "910",
            serviceId: 910,
            name: "Daily Cook",
            serviceName: "Daily Cook",
            categoryId: 12,
            categoryName: "Cook",
          }),
        ],
      },
    });
    const view = await renderHome();

    expect(view.getByText("Popular services near your location")).toBeTruthy();
    expect(view.getByText("Appliance Popular")).toBeTruthy();
    await fireEvent.press(view.getAllByLabelText("View all").at(-1)!);
    expect(mockNavigate).toHaveBeenCalledWith("ServiceList", {
      categoryId: "90",
      categoryName: "Appliance",
    });
  });
});
