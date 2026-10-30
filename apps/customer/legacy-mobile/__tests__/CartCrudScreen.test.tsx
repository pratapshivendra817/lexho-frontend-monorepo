import React from "react";
import { Alert } from "react-native";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { CartCrudScreen } from "../src/screens/cart/CartCrudScreen";
import { DEFAULT_CART_POLICY } from "../src/constants/cartPolicy";

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockCreateBooking = jest.fn();
const mockApplyCoupon = jest.fn();
const mockGetCartCoupons = jest.fn();
const mockCouponQueryOptions = jest.fn();
jest.mock("../src/api/couponApi", () => ({
  applyCoupon: (...args: unknown[]) => mockApplyCoupon(...args),
  getCartCoupons: (...args: unknown[]) => mockGetCartCoupons(...args),
}));
const mockCreateSubscriptionBooking = jest.fn();
const mockGetAvailableTimeSlots = jest.fn();
const mockGetCookFamilySizes = jest.fn();
const mockGetSubscriptionPricing = jest.fn();
const mockTrackBookingCreated = jest.fn();

let mockState: ReturnType<typeof buildState>;
let focusCleanup: undefined | (() => void);
let mockQueryResults: Record<string, any>;
let mockThunkOutcomes: Record<string, unknown>;

const thunk = (type: string, payload?: unknown, unwrapValue: unknown = {}) => ({
  type,
  payload,
  unwrap: jest.fn(() => {
    const outcome = mockThunkOutcomes[type];
    return outcome instanceof Error ? Promise.reject(outcome) : Promise.resolve(outcome ?? unwrapValue);
  }),
});

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => undefined | (() => void)) => {
    focusCleanup = callback();
  },
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey, enabled = true, queryFn }: any) => {
    if (queryKey[0] === "cart-coupons") mockCouponQueryOptions({ queryKey, enabled, queryFn });
    if (enabled === false) {
      return { data: undefined, isLoading: false, isError: false, error: null };
    }
    const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    return mockQueryResults[key] ?? { data: undefined, isLoading: false, isError: false, error: null };
  },
  useMutation: (options: any) => ({
    isPending: false,
    mutate: async (variables: unknown) => {
      try {
        const data = await options.mutationFn(variables);
        await options.onSuccess?.(data, variables);
      } catch (error) {
        await options.onError?.(error, variables);
      }
    },
  }),
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@react-native-firebase/analytics", () => () => ({
  logEvent: jest.fn(),
  setUserId: jest.fn(),
  setUserProperties: jest.fn(),
}));

jest.mock("@react-native-firebase/crashlytics", () => () => ({
  log: jest.fn(),
  recordError: jest.fn(),
  setAttribute: jest.fn(),
  setAttributes: jest.fn(),
  setUserId: jest.fn(),
}));

jest.mock("../src/services/firebaseAnalytics", () => ({
  logAnalyticsEvent: jest.fn(),
  setAnalyticsUserId: jest.fn(),
  setAnalyticsUserProperties: jest.fn(),
}));

jest.mock("../src/services/firebaseCrashlytics", () => ({
  logCrashlyticsMessage: jest.fn(),
  recordNonFatalError: jest.fn(),
  setCrashlyticsAttribute: jest.fn(),
  setCrashlyticsAttributes: jest.fn(),
  setCrashlyticsUserId: jest.fn(),
}));

jest.mock("../src/services/monitoring", () => ({
  captureFrontendError: jest.fn(),
}));

jest.mock("../src/services/customerAnalyticsEvents", () => ({
  trackBookingCreated: (...args: any[]) => mockTrackBookingCreated(...args),
}));

jest.mock("react-native-vector-icons/MaterialCommunityIcons", () => "MaterialCommunityIcon");
jest.mock("react-native-linear-gradient", () => "LinearGradient");

jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return {
    SafeAreaView: ({ children }: any) => <View>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock("../src/components/cart/TimePicker", () => {
  const { Pressable, Text, View } = require("react-native");
  return {
    TimePicker: ({ onChange, showError }: any) => (
      <View>
        {showError ? <Text>Select a time slot</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Confirm mocked time slot"
          onPress={() => onChange("2099-05-21T07:00:00")}
        >
          <Text>Mock TimePicker</Text>
        </Pressable>
      </View>
    ),
  };
});

jest.mock("../src/api/bookingApi", () => ({
  createBooking: (...args: any[]) => mockCreateBooking(...args),
}));

jest.mock("../src/api/cartApi", () => ({
  getAvailableTimeSlots: (...args: any[]) => mockGetAvailableTimeSlots(...args),
}));

jest.mock("../src/api/cookFamilySizeApi", () => ({
  getCookFamilySizes: (...args: any[]) => mockGetCookFamilySizes(...args),
}));

jest.mock("../src/api/subscriptionPricingApi", () => ({
  getSubscriptionPricing: (...args: any[]) => mockGetSubscriptionPricing(...args),
}));

jest.mock("../src/api/subscriptionBookingApi", () => ({
  createSubscriptionBooking: (...args: any[]) => mockCreateSubscriptionBooking(...args),
}));

jest.mock("../src/redux/cartSlice", () => ({
  fetchCustomerAddressesThunk: () => thunk("cart/fetchAddresses"),
  fetchCustomerCartThunk: () => thunk("cart/fetch"),
  fetchCartPolicyThunk: () => thunk("cart/fetchPolicy"),
  lockCartUntilPayment: (payload: unknown) => ({ type: "cart/lockUntilPayment", payload }),
  removeCartItemThunk: (payload: unknown) => thunk("cart/removeItem", payload),
  restoreCartSnapshotThunk: () => thunk("cart/restoreSnapshot"),
  setScheduledTime: (payload: unknown) => ({ type: "cart/setScheduledTime", payload }),
  updateCartItemThunk: (payload: unknown) => thunk("cart/updateItem", payload),
  updateCartMetaThunk: (payload: unknown) => thunk("cart/updateMeta", payload),
}));

jest.mock("../src/redux/hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector(mockState),
}));

function cartItem(overrides: Record<string, unknown> = {}) {
  return {
    itemId: 1,
    serviceId: 11,
    name: "AC Service",
    price: 49,
    totalPrice: 49,
    quantity: 1,
    imageUrl: "",
    serviceActive: true,
    addonActive: true,
    areaAvailable: true,
    ...overrides,
  };
}

function address(overrides: Record<string, unknown> = {}) {
  return {
    id: 101,
    fullAddress: "Flat 10, Lexho Tower",
    city: "Indore",
    pincode: "452001",
    latitude: 22.72,
    longitude: 75.86,
    default: true,
    ...overrides,
  };
}

function buildState(overrides: Partial<any> = {}) {
  const savedAddress = address();
  return {
    cart: {
      cartId: 44,
      items: [cartItem()],
      grandTotal: 51.46,
      itemTotal: 49,
      gstAmount: 0,
      serviceFee: 2.46,
      taxAmount: 0,
      toPay: 51.46,
      totalSaved: 0,
      currency: "INR",
      contactName: "S P",
      contactPhone: "7999700475",
      addresses: [savedAddress],
      selectedAddressId: savedAddress.id,
      scheduledTime: null,
      loading: false,
      error: null,
      policy: DEFAULT_CART_POLICY,
      paymentLock: {
        active: false,
        bookingId: null,
        itemsSnapshot: [],
      },
      ...overrides.cart,
    },
    auth: {
      token: "token-123",
      user: {
        id: 7,
        name: "S P",
        mobile: "7999700475",
      },
      ...overrides.auth,
    },
    location: {
      selectedAddress: savedAddress,
      currentAddress: savedAddress,
      ...overrides.location,
    },
  };
}

async function renderCart(props: Record<string, any> = {}) {
  return await render(
    <CartCrudScreen
      navigation={{ navigate: mockNavigate, replace: jest.fn(), ...props.navigation as any }}
      route={props.route}
    />,
  );
}

async function pressText(view: Awaited<ReturnType<typeof renderCart>>, matcher: string | RegExp) {
  await fireEvent.press(view.getByText(matcher));
}

async function pressLabel(view: Awaited<ReturnType<typeof renderCart>>, label: string) {
  await fireEvent.press(view.getByLabelText(label));
}

jest.mock("../src/api/homeApi", () => ({ getCategories: jest.fn() }));

describe("CartCrudScreen", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2099-05-20T06:00:00").getTime());
    jest.clearAllMocks();
    await cleanup();
    focusCleanup = undefined;
    mockThunkOutcomes = {};
    mockQueryResults = {
      "cart-cleaning-duration-pricing": {
        data: [
          { serviceId: 11, durationHours: 0.5, perVisitPrice: 49 },
          { serviceId: 11, durationHours: 1, perVisitPrice: 89 },
        ],
        isLoading: false,
        isError: false,
        error: null,
      },
      "cart-cook-family-sizes": {
        data: [
          { familySizeId: 1, familySize: "SMALL", label: "Small family", subtitle: "1-2 people" },
          { familySizeId: 2, familySize: "LARGE", label: "Large family", subtitle: "3-5 people" },
        ],
        isLoading: false,
        isError: false,
        error: null,
      },
    };
    mockState = buildState();
    mockDispatch.mockImplementation((action) => action);
    mockCreateBooking.mockResolvedValue({ data: { id: "BKG-101" } });
    mockCreateSubscriptionBooking.mockResolvedValue({ bookingId: "SUB-101", subscriptionId: "PLAN-5" });
    mockGetAvailableTimeSlots.mockResolvedValue([
      { slot: "06:15-06:30", available: true, instantEligible: true, etaMinutes: 15 },
      { slot: "07:00-07:15", available: true, instantEligible: false, etaMinutes: 60 },
    ]);
    mockGetCookFamilySizes.mockResolvedValue([]);
    mockGetSubscriptionPricing.mockResolvedValue([]);
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(async () => {
    focusCleanup?.();
    await cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("does not show an empty coupon message before the list succeeds", async () => {
    const view = await renderCart();
    expect(view.queryByText("No coupons available right now.")).toBeNull();
  });

  it("lets customers refresh a successfully loaded empty coupon list", async () => {
    const refetch = jest.fn();
    mockQueryResults["cart-coupons"] = { data: [], isSuccess: true, isLoading: false, isError: false, refetch };
    const view = await renderCart();
    expect(view.getByText("No coupons available right now.")).toBeTruthy();
    await pressLabel(view, "Refresh available coupons");
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("passes the selected service and category when validating a coupon", async () => {
    mockState = buildState({ cart: { items: [cartItem({ categoryId: "3" })] } });
    mockApplyCoupon.mockResolvedValue({ valid: false, message: "Not eligible" });
    const view = await renderCart();
    await fireEvent.changeText(view.getByLabelText("Coupon code"), "DIWALI20");
    await pressLabel(view, "Apply coupon");
    expect(mockApplyCoupon).toHaveBeenCalledWith(expect.objectContaining({ code: "DIWALI20", planId: 11, categoryId: 3, bookingType: "INSTANT" }));
  });

  it("lists campaigns and applies the validated discount to the cart total", async () => {
    mockState = buildState({ cart: { items: [cartItem({ categoryId: "3" })] } });
    mockQueryResults["cart-coupons"] = { data: [{ code: "CAMPAIGN50", title: "Campaign offer", description: "Limited time offer", discountType: "PERCENTAGE", discountValue: 20, minimumPurchaseAmount: 10 }], isLoading: false, isError: false };
    mockApplyCoupon.mockResolvedValue({ valid: true, couponCode: "CAMPAIGN50", discountAmount: 10, finalAmount: 41.46 });
    const view = await renderCart();
    expect(view.getByText("Campaign offer")).toBeTruthy();
    expect(view.getByText("Limited time offer")).toBeTruthy();
    expect(view.getByText("20% off")).toBeTruthy();
    const options = mockCouponQueryOptions.mock.calls.at(-1)?.[0];
    expect(options.enabled).toBe(true);
    await options.queryFn();
    expect(mockGetCartCoupons).toHaveBeenCalledWith();
    await pressLabel(view, "Apply CAMPAIGN50");
    expect(mockApplyCoupon).toHaveBeenCalledWith({ planId: 11, categoryId: 3, bookingType: "INSTANT", amount: 51.46, code: "CAMPAIGN50" });
    expect(view.getByText("Applied")).toBeTruthy();
    expect(view.getAllByText(/41\.46/).length).toBeGreaterThan(0);
    expect(view.getByText("Coupon discount")).toBeTruthy();
  });

  it.each([101, "b5f02d8a-b64b-4329-89f7-a7daa1f67ef5"])("books with saved address %s without asking for details again", async addressId => {
    mockState.cart.addresses = mockState.cart.addresses.map((address: any) => ({ ...address, id: addressId }));
    mockState.cart.selectedAddressId = addressId;
    const view = await renderCart();

    expect(view.getByText("My Cart")).toBeTruthy();
    expect(view.getByText("AC Service")).toBeTruthy();
    expect(view.getByText("Booking details")).toBeTruthy();
    expect(view.getByText("Bill details")).toBeTruthy();
    expect(view.getByText(/To Pay/)).toBeTruthy();
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "cart/restoreSnapshot" }));
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "cart/fetchPolicy" }));
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "cart/fetch" }));
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "cart/fetchAddresses" }));

    await pressText(view, /Book now|Pay now|Select time slot/);

    await waitFor(() =>
      expect(mockCreateBooking).toHaveBeenCalledWith(expect.objectContaining({
        serviceId: "11",
        addressId: String(addressId),
        latitude: 22.72,
        longitude: 75.86,
      })),
    );
    expect(mockTrackBookingCreated).toHaveBeenCalledWith(expect.objectContaining({
      booking_id: "BKG-101",
      booking_mode: "INSTANT",
      source: "cart_checkout",
    }));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "cart/lockUntilPayment",
      payload: { bookingId: "BKG-101" },
    });
    expect(mockNavigate).toHaveBeenCalledWith("Payment", expect.objectContaining({
      bookingId: "BKG-101",
      bookingMode: "INSTANT",
    }));
  });

  it("renders loading, error, empty, disabled, and navigation states", async () => {
    mockState = buildState({
      cart: {
        items: [],
        loading: true,
        error: "Unable to load cart",
        itemTotal: 0,
        grandTotal: 0,
        toPay: 0,
        serviceFee: 0,
      },
    });
    const view = await renderCart();

    expect(view.getByText("Loading cart...")).toBeTruthy();
    expect(view.queryByText("Unable to load cart")).toBeNull();
    expect(view.getByText("Add services to start booking.")).toBeTruthy();
    expect(view.getByLabelText("Book now").props.accessibilityState).toEqual({ disabled: true });

    await pressText(view, "Location");
    expect(mockNavigate).toHaveBeenCalledWith("Address");
  });

  it("updates quantity, removes minimum quantity items, and refreshes after mutation failures", async () => {
    const view = await renderCart();

    await pressLabel(view, "Increase quantity for AC Service");
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
        type: "cart/updateItem",
        payload: { itemId: 1, quantity: 2 },
      })),
    );

    await pressLabel(view, "Decrease quantity for AC Service");
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
        type: "cart/removeItem",
        payload: 1,
      })),
    );

    mockThunkOutcomes["cart/updateItem"] = new Error("update failed");
    await pressLabel(view, "Increase quantity for AC Service");
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "cart/fetch" })),
    );
  });

  it("blocks quantity above policy maximum", async () => {
    mockState = buildState({
      cart: {
        items: [cartItem({ quantity: DEFAULT_CART_POLICY.maxOtherServiceQuantity })],
      },
    });
    const view = await renderCart();

    await pressLabel(view, "Increase quantity for AC Service");

    expect(Alert.alert).toHaveBeenCalledWith(
      "Quantity exceeded",
      `Maximum ${DEFAULT_CART_POLICY.maxOtherServiceQuantity} allowed per service.`,
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: "cart/updateItem" }));
  });

  it("steps cleaning duration, calculates time-based totals, and removes at minimum duration", async () => {
    mockState = buildState({
      cart: {
        items: [cartItem({ name: "Home Cleaning", categoryName: "Cleaning", price: 20, totalPrice: 20 })],
        itemTotal: 999,
        gstAmount: 5,
        serviceFee: 2,
        taxAmount: 3,
        toPay: 999,
        grandTotal: 999,
        totalSaved: 25,
      },
    });
    const view = await renderCart();

    await waitFor(() => expect(view.getByText("0.5 hrs")).toBeTruthy());
    expect(view.getAllByText("₹49.00").length).toBeGreaterThan(0);
    expect(view.getByText("₹25.00 saved on the total!")).toBeTruthy();

    await pressLabel(view, "Increase quantity for Home Cleaning duration");
    expect(view.getByText("1 hr")).toBeTruthy();
    expect(view.getAllByText("₹89.00").length).toBeGreaterThan(0);

    await pressLabel(view, "Decrease quantity for Home Cleaning duration");
    expect(view.getByText("0.5 hrs")).toBeTruthy();
    await pressLabel(view, "Decrease quantity for Home Cleaning duration");
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
        type: "cart/removeItem",
        payload: 1,
      })),
    );
  });

  it("opens the cook family-size editor and updates the selected option", async () => {
    mockState = buildState({
      cart: {
        items: [cartItem({
          name: "Cook At Home",
          categoryName: "Cook",
          familySizeId: 1,
          familySize: "SMALL",
          familySizeLabel: "Small family",
          addons: [{ id: 1 }],
        })],
      },
    });
    const view = await renderCart();

    expect(view.getByText("Family Size: Small family")).toBeTruthy();
    expect(view.getByText("1 add-ons selected")).toBeTruthy();
    await pressLabel(view, "Change family size for Cook At Home");
    expect(view.getAllByText("Change Family Size").length).toBeGreaterThan(0);
    expect(view.getByText("1-2 people")).toBeTruthy();

    await pressText(view, "Large family");
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
        type: "cart/updateItem",
        payload: {
          itemId: 1,
          familySizeId: 2,
          familySize: "LARGE",
          familySizeLabel: "Large family",
        },
      })),
    );
  });

  it("shows family-size update errors and closes the selector", async () => {
    mockState = buildState({
      cart: {
        items: [cartItem({
          name: "Cook At Home",
          categoryName: "Cook",
          familySizeId: 1,
          familySize: "SMALL",
          familySizeLabel: "Small family",
        })],
      },
    });
    mockThunkOutcomes["cart/updateItem"] = new Error("Family option unavailable");
    const view = await renderCart();

    await pressLabel(view, "Change family size for Cook At Home");
    await pressText(view, "Large family");
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Unable to update family size",
        "Family option unavailable",
      ),
    );
    await pressLabel(view, "Close family size selector");
    expect(view.queryAllByText("Change Family Size")).toHaveLength(1);
  });

  it.each([
    ["inactive service", cartItem({ serviceActive: false }), "Service unavailable", /no longer active/],
    ["unavailable area", cartItem({ areaAvailable: false }), "Service unavailable", /not available in your selected area/],
    ["inactive add-on", cartItem({ addonActive: false }), "Add-on unavailable", /no longer available/],
    [
      "missing cook family size",
      cartItem({ name: "Cook At Home", categoryName: "Cook", familySizeId: undefined, familySize: undefined, familySizeLabel: undefined }),
      "Select family size",
      /Please select a family size/,
    ],
  ])("blocks checkout for %s", async (_name, item, title, message) => {
    mockState = buildState({ cart: { items: [item] } });
    const view = await renderCart();

    await pressText(view, /Book now/);

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith(title, expect.stringMatching(message)));
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  it("blocks checkout when cart policy validation or latest-cart validation fails", async () => {
    mockState = buildState({
      cart: {
        items: [
          cartItem({ itemId: 1 }),
          cartItem({ itemId: 2 }),
        ],
        policy: { ...DEFAULT_CART_POLICY, maxCartItems: 1 },
      },
    });
    let view = await renderCart();
    await pressText(view, /Book now/);
    expect(Alert.alert).toHaveBeenCalledWith("Cart limit exceeded", "Maximum 1 services allowed.");

    await cleanup();
    jest.clearAllMocks();
    mockState = buildState();
    mockThunkOutcomes["cart/fetch"] = new Error("network failure");
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    view = await renderCart();
    await pressText(view, /Book now/);
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Service unavailable",
        "Unable to validate latest cart. Please retry.",
      ),
    );
  });

  it("prompts for a complete saved address and navigates from the alert action", async () => {
    const detected = address({ id: 999, addressLine: "Near Central Park" });
    mockState = buildState({
      cart: { addresses: [], selectedAddressId: null },
      location: { selectedAddress: detected, currentAddress: detected },
    });
    const view = await renderCart();

    await pressText(view, /Book now/);
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Complete address required",
        expect.stringContaining("flat/building details"),
        expect.any(Array),
      ),
    );
    const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2];
    buttons[0].onPress();
    expect(mockNavigate).toHaveBeenCalledWith("AddAddressDetails", {
      pickedLocation: { latitude: 22.72, longitude: 75.86 },
      pickedAddressLine: "Near Central Park",
    });
  });

  it.each(["Cook At Home", "CookAt home", "Cleaning Service", "Breakfast At Home", "COOK", "CLEANING", "BREAKFAST_AT_HOME"])(
    "shows only Instant and Scheduled for regular %s cart items",
    async categoryName => {
      mockState = buildState({ cart: { items: [cartItem({ categoryName })] } });
      const view = await renderCart({ route: { params: { bookingMode: "SUBSCRIPTION" } } });
      expect(view.queryByLabelText("Subscription")).toBeNull();
      expect(view.getByLabelText("Instant").props.accessibilityState).toEqual({ selected: true, disabled: false });
      await pressLabel(view, "Scheduled");
      expect(view.getByLabelText("Scheduled").props.accessibilityState).toEqual({ selected: true, disabled: false });
      expect(view.getByText("Mock TimePicker")).toBeTruthy();
    },
  );

  it.each([
    { name: "Chicken Curry Special Cook", familySize: "1-2 Members" },
    { name: "Kitchen Cleaning" },
    { name: "Breakfast preparation" },
  ])("hides Subscription for $name when category metadata is missing", async item => {
    mockState = buildState({ cart: { items: [cartItem(item)] } });
    const view = await renderCart();
    expect(view.queryByLabelText("Subscription")).toBeNull();
    expect(view.getByLabelText("Instant")).toBeTruthy();
    expect(view.getByLabelText("Scheduled")).toBeTruthy();
  });

  it("resolves category IDs when cart responses omit category names", async () => {
    mockState = buildState({ cart: { items: [cartItem({ categoryId: "42" })] } });
    mockQueryResults["cart-service-categories"] = { data: [{ id: "42", name: "Breakfast At Home" }] };
    const view = await renderCart();
    expect(view.queryByLabelText("Subscription")).toBeNull();
    expect(view.getByLabelText("Instant")).toBeTruthy();
    expect(view.getByLabelText("Scheduled")).toBeTruthy();
  });

  it("uses the category passed from service details when cart metadata is missing", async () => {
    const view = await renderCart({ route: { params: { categoryName: "Cook At Home" } } });
    expect(view.queryByLabelText("Subscription")).toBeNull();
  });

  it.each(["Cook At Home", "Cleaning Service", "Breakfast At Home"])(
    "clears a previous repeat selection when adding a regular %s service",
    async categoryName => {
      const view = await renderCart({ route: { params: { recurringBooking: {
        serviceId: 91, serviceName: "Existing repeat service", subscriptionServiceType: "CLEANING",
        durationHours: 1, visits: 5, price: 1500,
      } } } });
      expect(view.getByLabelText("Subscription").props.accessibilityState.selected).toBe(true);
      await view.rerender(<CartCrudScreen navigation={{ navigate: mockNavigate }} route={{ params: {
        recurringBooking: null, categoryName,
      } }} />);
      expect(view.queryByLabelText("Subscription")).toBeNull();
      expect(view.queryByText("Existing repeat service")).toBeNull();
      expect(view.getByLabelText("Instant").props.accessibilityState.selected).toBe(true);
      expect(view.getByLabelText("Scheduled")).toBeTruthy();
    },
  );

  it.each([
    ["Cook At Home", "COOK"],
    ["Cleaning Service", "CLEANING"],
    ["Vehicle Wash", "VEHICLE_WASH"],
    ["Fitness & Wellness", "FITNESS_WELLNESS"],
  ])("shows only Subscription for %s from Repeat Booking despite a previous scheduled mode", async (categoryName, subscriptionServiceType) => {
    mockState = buildState({ cart: { items: [cartItem({ categoryName })], scheduledTime: "2099-05-21T07:00:00" } });
    const view = await renderCart({ route: { params: { categoryName, bookingMode: "SCHEDULED", recurringBooking: {
      serviceId: 91, serviceName: "Repeat service", subscriptionServiceType,
      durationHours: 1, visits: 5, price: 1500,
    } } } });
    expect(view.getByLabelText("Subscription").props.accessibilityState.selected).toBe(true);
    expect(view.queryByLabelText("Instant")).toBeNull();
    expect(view.queryByLabelText("Scheduled")).toBeNull();
  });

  it.each(["Cook At Home", "Cleaning Service", "Breakfast At Home", "Vehicle Wash", "Fitness & Wellness", "Party Services", "Other service"])(
    "shows only Scheduled for %s from the Scheduled Booking flow",
    async categoryName => {
      mockState = buildState({ cart: { items: [cartItem({ categoryName })] } });
      const view = await renderCart({ route: { params: {
        categoryName, bookingMode: "SCHEDULED", scheduleMode: "FIXED", recurringBooking: null,
      } } });
      expect(view.queryByLabelText("Instant")).toBeNull();
      expect(view.queryByLabelText("Subscription")).toBeNull();
      expect(view.getByLabelText("Scheduled").props.accessibilityState).toEqual({ selected: true, disabled: false });
      expect(view.getByText("Mock TimePicker")).toBeTruthy();
    },
  );

  it("switches booking modes and persists a confirmed scheduled slot", async () => {
    const view = await renderCart();

    await pressLabel(view, "Scheduled");
    expect(view.getByText("Mock TimePicker")).toBeTruthy();

    await pressLabel(view, "Confirm mocked time slot");
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "cart/setScheduledTime",
      payload: "2099-05-21T07:00:00",
    });
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: "cart/updateMeta",
      payload: { addressId: 101, scheduledTime: "2099-05-21T07:00:00" },
    }));

    await pressLabel(view, "Subscription");
    expect(mockNavigate).toHaveBeenCalledWith("RecurringBooking");
    await pressLabel(view, "Instant");
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "cart/setScheduledTime" }));
  });

  it.each(["Vehicle Wash", "Fitness & Wellness", "VEHICLE_WASH", "Fitness and Wellness"])(
    "hides Instant and defaults to Scheduled for %s, retaining Subscription",
    async categoryName => {
      mockState = buildState({ cart: { items: [cartItem({ categoryName })] } });
      const view = await renderCart();

      expect(view.queryByLabelText("Instant")).toBeNull();
      expect(view.getByLabelText("Scheduled").props.accessibilityState).toEqual({ selected: true, disabled: false });
      expect(view.getByText("Mock TimePicker")).toBeTruthy();
      expect(mockCreateBooking).not.toHaveBeenCalled();
      await pressLabel(view, "Subscription");
      expect(mockNavigate).toHaveBeenCalledWith("RecurringBooking");
      expect(view.getByLabelText("Subscription").props.accessibilityState.selected).toBe(true);
    },
  );

  it("hides Instant when a restricted service is added to a mixed cart", async () => {
    mockState = buildState({ cart: { items: [cartItem(), cartItem({ itemId: 22, serviceId: 22, categoryName: "Vehicle Wash" })] } });
    const view = await renderCart();
    expect(view.queryByLabelText("Instant")).toBeNull();
    expect(view.getByLabelText("Scheduled").props.accessibilityState.selected).toBe(true);
  });

  it("uses the route category before cart category details are available", async () => {
    const view = await renderCart({ route: { params: { categoryName: "Fitness & Wellness" } } });
    expect(view.queryByLabelText("Instant")).toBeNull();
    expect(view.getByLabelText("Scheduled").props.accessibilityState.selected).toBe(true);
  });

  it("disables instant and subscription modes for party bookings", async () => {
    mockState = buildState({
      cart: {
        items: [cartItem({ categoryName: "Birthday Party" })],
      },
    });
    const view = await renderCart({ route: { params: { categoryName: "Party" } } });

    expect(view.getByLabelText("Instant").props.accessibilityState).toEqual({ selected: false, disabled: true });
    expect(view.getByLabelText("Subscription").props.accessibilityState).toEqual({ selected: false, disabled: true });
    expect(view.getByLabelText("Scheduled").props.accessibilityState).toEqual({ selected: true, disabled: false });
  });

  it("creates a scheduled booking after verifying the selected slot", async () => {
    mockState = buildState({
      cart: { scheduledTime: "2099-05-21T07:00:00" },
    });
    mockGetAvailableTimeSlots.mockResolvedValue([
      { slot: "07:00-07:15", available: true, instantEligible: false, etaMinutes: 60 },
    ]);
    const view = await renderCart({ route: { params: { bookingMode: "SCHEDULED" } } });

    await pressLabel(view, "Confirm mocked time slot");
    await pressText(view, /Pay now/);

    await waitFor(() =>
      expect(mockCreateBooking).toHaveBeenCalledWith(expect.objectContaining({
        serviceId: "11",
        addressId: "101",
        date: "2099-05-21",
        slot: "07:00-07:15",
      })),
    );
    expect(mockNavigate).toHaveBeenCalledWith("Payment", expect.objectContaining({
      bookingId: "BKG-101",
      bookingMode: "SCHEDULED",
    }));
  });

  it.each([
    ["unavailable slot", () => Promise.resolve([]), "Selected slot is no longer available. Please reselect slot."],
    ["slot network failure", () => Promise.reject(new Error("offline")), "Unable to verify latest slots. Please retry and confirm slot again."],
  ])("handles scheduled %s", async (_name, slotsFactory, expectedMessage) => {
    mockState = buildState({ cart: { scheduledTime: "2099-05-21T07:00:00" } });
    mockGetAvailableTimeSlots.mockImplementationOnce(slotsFactory);
    const view = await renderCart({ route: { params: { bookingMode: "SCHEDULED" } } });

    await pressLabel(view, "Confirm mocked time slot");
    await pressText(view, /Pay now/);

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith("Booking failed", expectedMessage),
    );
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  it("handles booking API failures and missing booking IDs", async () => {
    mockCreateBooking.mockRejectedValueOnce(new Error("SLOT_NOT_AVAILABLE"));
    let view = await renderCart();
    await pressText(view, /Book now/);
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Booking failed",
        "SLOT_NOT_AVAILABLE",
      ),
    );

    await cleanup();
    jest.clearAllMocks();
    mockState = buildState();
    mockCreateBooking.mockResolvedValueOnce({ data: {} });
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    view = await renderCart();
    await pressText(view, /Book now/);
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("Main", { screen: "Bookings" }),
    );
  });

  it("creates subscriptions, handles missing IDs and API errors, and removes recurring items", async () => {
    const recurringBooking = {
      serviceId: 91,
      serviceName: "Cook Subscription",
      subscriptionServiceType: "COOK",
      familySize: "SMALL",
      familySizeLabel: "1-2 Members",
      frequencyDays: ["Monday"],
      frequencyLabel: "Monday",
      startDate: "2099-05-20",
      endDate: "2099-06-20",
      visits: 5,
      timeSlot: "07:00",
      price: 1500,
    };
    mockState = buildState({ cart: { items: [] } });
    let view = await renderCart({ route: { params: { recurringBooking } } });

    expect(view.getByText("Family Size: 1-2 Members")).toBeTruthy();
    expect(view.getByText("Frequency: Monday")).toBeTruthy();
    await pressText(view, /Pay now/);
    await waitFor(() =>
      expect(mockCreateSubscriptionBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: 91,
          familySize: "SMALL",
          addressId: 101,
        }),
        expect.any(String),
      ),
    );
    expect(mockNavigate).toHaveBeenCalledWith("Payment", expect.objectContaining({
      bookingId: "SUB-101",
      subscriptionId: "PLAN-5",
      bookingMode: "SUBSCRIPTION",
    }));

    await cleanup();
    jest.clearAllMocks();
    mockState = buildState({ cart: { items: [] } });
    mockCreateSubscriptionBooking.mockResolvedValueOnce({ id: "PLAN-5", subscriptionId: "PLAN-5" });
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    view = await renderCart({ route: { params: { recurringBooking } } });
    await pressText(view, /Pay now/);
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Booking failed",
        "Unable to start subscription payment. Booking id missing.",
      ),
    );

    await act(() => jest.advanceTimersByTimeAsync(1200));
    mockCreateSubscriptionBooking.mockRejectedValueOnce(new Error("SUBSCRIPTION_NOT_AVAILABLE"));
    await pressText(view, /Pay now/);
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Booking failed",
        "SUBSCRIPTION_NOT_AVAILABLE",
      ),
    );

    await pressLabel(view, "Remove recurring booking");
    expect(view.queryByText("Cook Subscription")).toBeNull();
  });

  it("does not block repeat booking checkout on regular cart refresh", async () => {
    const recurringBooking = {
      serviceId: 91,
      serviceName: "Cleaning Subscription",
      subscriptionServiceType: "CLEANING",
      frequencyDays: ["Monday"],
      startDate: "2099-06-01",
      endDate: "2099-06-30",
      visits: 4,
      durationHours: 2,
      timeSlot: "10:00",
      price: 4500,
    };
    mockState = buildState({ cart: { items: [] } });
    mockThunkOutcomes["cart/fetch"] = new Error("regular cart endpoint unavailable");
    mockCreateSubscriptionBooking.mockResolvedValueOnce({ data: { bookingId: "SUB-91" } });

    const view = await renderCart({ route: { params: { recurringBooking } } });
    await pressText(view, /Pay now/);

    await waitFor(() => expect(mockCreateSubscriptionBooking).toHaveBeenCalled());
    expect(Alert.alert).not.toHaveBeenCalledWith(
      "Service unavailable",
      "Unable to validate latest cart. Please retry.",
    );
  });

  it("renders image and null-field edge cases without crashing", async () => {
    mockState = buildState({
      cart: {
        items: [
          cartItem({
            itemId: 8,
            name: undefined,
            price: undefined,
            totalPrice: undefined,
            quantity: undefined,
            imageUrl: "https://cdn.lexho.com/service.png",
          }),
        ],
        currency: undefined,
        contactName: "",
        contactPhone: "",
      },
      auth: { token: "", user: { name: "", mobile: "" } },
    });
    const view = await renderCart();

    expect(view.getByText("Contact")).toBeTruthy();
    expect(view.getByText("Add phone number")).toBeTruthy();
    expect(view.getByText("My Cart")).toBeTruthy();
  });

  it("cleans timers and focus listeners on unmount", async () => {
    const view = await renderCart();
    view.unmount();
    focusCleanup?.();
    jest.clearAllTimers();
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });
});
