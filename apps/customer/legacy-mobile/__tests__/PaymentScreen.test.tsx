import React from "react";
import { Alert } from "react-native";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { PaymentScreen } from "../src/screens/payment/PaymentScreen";

const mockCreatePaymentOrder = jest.fn();
const mockReportPaymentFailure = jest.fn();
const mockVerifyPayment = jest.fn();
const mockOpenRazorpayCheckout = jest.fn();
const mockTrackPaymentInitiated = jest.fn();
const mockTrackPaymentSuccess = jest.fn();
const mockTrackPaymentFailed = jest.fn();
const mockCaptureFrontendError = jest.fn();
const mockSavePendingPaymentBookingId = jest.fn();
const mockClearPendingPaymentBookingId = jest.fn();
const mockGetApiErrorCode = jest.fn();
const mockMutationCall = jest.fn();

let mockState: ReturnType<typeof buildState>;

jest.mock("react-native-vector-icons/MaterialCommunityIcons", () => "MaterialCommunityIcon");

jest.mock("react-native-paper", () => {
  const { Text } = require("react-native");
  return { Text };
});

jest.mock("@tanstack/react-query", () => {
  const ReactModule = require("react");
  return {
    useMutation: (options: any) => {
      const [isPending, setIsPending] = ReactModule.useState(false);
      const runningRef = ReactModule.useRef(false);
      const mutate = async (variables: unknown) => {
        mockMutationCall(variables);
        if (runningRef.current) return;
        runningRef.current = true;
        setIsPending(true);
        try {
          const result = await options.mutationFn(variables);
          await options.onSuccess?.(result);
        } catch (error) {
          options.onError?.(error);
        } finally {
          runningRef.current = false;
          setIsPending(false);
        }
      };
      return { isPending, mutate };
    },
  };
});

jest.mock("../src/redux/hooks", () => ({
  useAppSelector: (selector: any) => selector(mockState),
}));

jest.mock("../src/api/paymentApi", () => ({
  createPaymentOrder: (...args: any[]) => mockCreatePaymentOrder(...args),
  reportPaymentFailure: (...args: any[]) => mockReportPaymentFailure(...args),
  verifyPayment: (...args: any[]) => mockVerifyPayment(...args),
}));

jest.mock("../src/services/paymentService", () => ({
  openRazorpayCheckout: (...args: any[]) => mockOpenRazorpayCheckout(...args),
}));

jest.mock("../src/services/customerAnalyticsEvents", () => ({
  trackPaymentInitiated: (...args: any[]) => mockTrackPaymentInitiated(...args),
  trackPaymentSuccess: (...args: any[]) => mockTrackPaymentSuccess(...args),
  trackPaymentFailed: (...args: any[]) => mockTrackPaymentFailed(...args),
}));

jest.mock("../src/services/monitoring", () => ({
  captureFrontendError: (...args: any[]) => mockCaptureFrontendError(...args),
}));

jest.mock("../src/utils/storage", () => ({
  savePendingPaymentBookingId: (...args: any[]) => mockSavePendingPaymentBookingId(...args),
  clearPendingPaymentBookingId: (...args: any[]) => mockClearPendingPaymentBookingId(...args),
}));

jest.mock("../src/api/client", () => ({
  getApiErrorCode: (...args: any[]) => mockGetApiErrorCode(...args),
}));

function buildState(overrides: Partial<any> = {}) {
  return {
    cart: {
      cartId: 44,
      toPay: 51.46,
      currency: "INR",
      ...overrides.cart,
    },
    auth: {
      user: {
        mobile: "7999700475",
        email: "customer@example.com",
        ...overrides.auth?.user,
      },
      ...overrides.auth,
    },
  };
}

function orderBuilder(overrides: Record<string, unknown> = {}) {
  return {
    keyId: "rzp_test_key",
    razorpayOrderId: "order_101",
    amountInPaise: 5146,
    currency: "INR",
    ...overrides,
  };
}

function checkoutSuccess(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    orderId: "order_101",
    paymentId: "pay_101",
    signature: "signature_101",
    ...overrides,
  };
}

function routeParams(overrides: Record<string, unknown> = {}) {
  return {
    bookingId: "412",
    cartId: 44,
    amount: 51.46,
    currency: "INR",
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function renderPayment(
  params: Record<string, unknown> | null = routeParams(),
  navigationOverrides: Record<string, unknown> = {},
) {
  const navigation = {
    navigate: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
    ...navigationOverrides,
  };
  const view = await render(
    <PaymentScreen
      navigation={navigation}
      route={params === null ? {} : { params }}
    />,
  );
  return { view, navigation };
}

describe("PaymentScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await cleanup();
    jest.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
    jest.spyOn(Math, "random").mockReturnValue(0.123456789);
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    mockState = buildState();
    mockCreatePaymentOrder.mockResolvedValue(orderBuilder());
    mockOpenRazorpayCheckout.mockResolvedValue(checkoutSuccess());
    mockVerifyPayment.mockResolvedValue({ verified: true, paymentStatus: "SUCCESS" });
    mockReportPaymentFailure.mockResolvedValue({ reported: true });
    mockSavePendingPaymentBookingId.mockResolvedValue(undefined);
    mockClearPendingPaymentBookingId.mockResolvedValue(undefined);
    mockGetApiErrorCode.mockReturnValue("");
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it("renders missing route params, fallback copy, and a disabled payment button", async () => {
    const { view } = await renderPayment(null);

    expect(view.getByText("Secure Payment")).toBeTruthy();
    expect(view.getByText("Payment options will open in Razorpay.")).toBeTruthy();
    expect(view.getByText("Booking id missing. Please create booking again.")).toBeTruthy();
    expect(
      view.container.queryAll((node) => node.props.accessibilityState?.disabled === true),
    ).toHaveLength(1);
    expect(mockMutationCall).not.toHaveBeenCalled();
  });

  it("renders route amount, handles an invalid currency, and uses cart id fallback", async () => {
    const pendingOrder = deferred<ReturnType<typeof orderBuilder>>();
    mockCreatePaymentOrder.mockReturnValue(pendingOrder.promise);
    const { view } = await renderPayment(routeParams({
      cartId: undefined,
      amount: 10,
      currency: "INVALID",
    }));

    expect(view.getByText("Amount: INVALID 10.00")).toBeTruthy();
    pendingOrder.resolve(orderBuilder());
    await waitFor(() => expect(mockTrackPaymentInitiated).toHaveBeenCalledWith(
      expect.objectContaining({ cart_id: 44 }),
    ));
  });

  it("shows the loading state and prevents duplicate payment submissions", async () => {
    const pendingOrder = deferred<ReturnType<typeof orderBuilder>>();
    mockCreatePaymentOrder.mockReturnValue(pendingOrder.promise);
    const { view } = await renderPayment();

    await waitFor(() => expect(view.getByText("Opening Razorpay")).toBeTruthy());
    expect(view.queryByText("Proceed to pay")).toBeNull();
    expect(mockMutationCall).toHaveBeenCalledTimes(1);

    pendingOrder.resolve(orderBuilder());
    await waitFor(() => expect(mockVerifyPayment).toHaveBeenCalledTimes(1));
    expect(mockMutationCall).toHaveBeenCalledTimes(1);
  });

  it("creates an order, opens Razorpay, verifies payment, tracks analytics, and navigates", async () => {
    const { navigation } = await renderPayment();

    await waitFor(() => expect(mockVerifyPayment).toHaveBeenCalledWith({
      razorpayOrderId: "order_101",
      razorpayPaymentId: "pay_101",
      razorpaySignature: "signature_101",
    }));
    expect(mockSavePendingPaymentBookingId).toHaveBeenCalledWith("412");
    expect(mockCreatePaymentOrder).toHaveBeenCalledWith(
      { bookingId: "412" },
      expect.stringMatching(/^booking-412-.+/),
    );
    expect(mockOpenRazorpayCheckout).toHaveBeenCalledWith({
      key: "rzp_test_key",
      order_id: "order_101",
      amount: 5146,
      currency: "INR",
      name: "Lexho",
      description: "Service payment",
      prefill: {
        contact: "7999700475",
        email: "customer@example.com",
      },
      theme: expect.any(Object),
    });

    expect(mockTrackPaymentInitiated).toHaveBeenCalledWith(expect.objectContaining({
      booking_id: "412",
      razorpay_order_id: "order_101",
      amount: 51.46,
      currency: "INR",
    }));
    expect(mockTrackPaymentSuccess).toHaveBeenCalledWith(expect.objectContaining({
      razorpay_payment_id: "pay_101",
    }));
    expect(mockClearPendingPaymentBookingId).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith("PaymentStatus", expect.objectContaining({ bookingId: "412" }));
  });

  it("does not report success or navigate until the backend confirms capture", async () => {
    mockVerifyPayment.mockResolvedValue({ verified: true, paymentStatus: "CREATED" });
    const { navigation, view } = await renderPayment();

    await waitFor(() => expect(view.getByText(/Payment has not been confirmed by the server/)).toBeTruthy());
    expect(mockTrackPaymentSuccess).not.toHaveBeenCalled();
    expect(mockClearPendingPaymentBookingId).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("uses backend order amount and default currency after order creation", async () => {
    const pendingCheckout = deferred<ReturnType<typeof checkoutSuccess>>();
    mockCreatePaymentOrder.mockResolvedValue(orderBuilder({
      amountInPaise: 2500,
      currency: "",
    }));
    mockOpenRazorpayCheckout.mockReturnValue(pendingCheckout.promise);
    const { view } = await renderPayment(routeParams({ amount: 1 }));

    await waitFor(() => expect(view.getByText(/Amount:.*25/)).toBeTruthy());
    expect(mockOpenRazorpayCheckout).toHaveBeenCalledWith(expect.objectContaining({
      amount: 2500,
      currency: "INR",
    }));

    pendingCheckout.resolve(checkoutSuccess());
    await waitFor(() => expect(mockVerifyPayment).toHaveBeenCalled());
  });

  it("omits empty customer prefill fields", async () => {
    mockState = buildState({ auth: { user: { mobile: " ", email: "" } } });
    await renderPayment();

    await waitFor(() => expect(mockOpenRazorpayCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        prefill: { contact: undefined, email: undefined },
      }),
    ));
  });

  it.each([
    ["ScheduledBookingStatus", "ScheduledBookingStatus", { bookingId: "412" }],
    ["InstantBookingStatus", "InstantBookingStatus", { bookingId: "412" }],
    [
      "BookingPaymentConfirm",
      "BookingPaymentConfirm",
      { bookingId: "412", bookingMode: "SCHEDULED" },
    ],
    [
      "SubscriptionConfirmed",
      "SubscriptionConfirmed",
      { bookingId: "412", subscriptionId: "72" },
    ],
  ])("replaces navigation after successful %s payment", async (postPaymentRoute, route, expected) => {
    const { navigation } = await renderPayment(routeParams({
      postPaymentRoute,
      subscriptionId: "72",
      bookingMode: "SCHEDULED",
    }));

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(route, expect.objectContaining(expected)));
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it("reports Razorpay cancellation details and tracks failure only once", async () => {
    mockOpenRazorpayCheckout.mockResolvedValue({
      success: false,
      error: "Payment cancelled by user",
      failure: {
        code: "BAD_REQUEST_ERROR",
        description: "Checkout dismissed",
        reason: "payment_cancelled",
        orderId: "order_failure",
        paymentId: "pay_failure",
        raw: { source: "razorpay" },
      },
    });
    const { view } = await renderPayment();

    await waitFor(() => expect(view.getByText("Payment cancelled by user")).toBeTruthy());
    expect(mockReportPaymentFailure).toHaveBeenCalledWith({
      bookingId: "412",
      razorpayOrderId: "order_failure",
      razorpayPaymentId: "pay_failure",
      errorCode: "BAD_REQUEST_ERROR",
      errorDescription: "Checkout dismissed",
      errorReason: "payment_cancelled",
      raw: { source: "razorpay" },
    });
    expect(mockTrackPaymentFailed).toHaveBeenCalledTimes(1);
    expect(mockCaptureFrontendError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ screenName: "PaymentScreen" }),
    );
    expect(view.getByText("Retry Payment")).toBeTruthy();
  });

  it("continues when failure reporting rejects and uses the cancellation fallback", async () => {
    mockOpenRazorpayCheckout.mockResolvedValue({
      success: false,
      failure: {},
    });
    mockReportPaymentFailure.mockRejectedValue(new Error("failure endpoint offline"));
    const { view } = await renderPayment();

    await waitFor(() => expect(view.getByText("Payment cancelled")).toBeTruthy());
    expect(mockTrackPaymentFailed).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ orderId: undefined }, "missing order id"],
    [{ paymentId: undefined }, "missing payment id"],
    [{ signature: undefined }, "missing signature"],
  ])("rejects an incomplete Razorpay response with %s", async (missingField, description) => {
    void description;
    mockOpenRazorpayCheckout.mockResolvedValue(checkoutSuccess(missingField));
    const { view } = await renderPayment();

    await waitFor(() =>
      expect(view.getByText("Payment response incomplete. Please retry payment.")).toBeTruthy(),
    );
    expect(mockVerifyPayment).not.toHaveBeenCalled();
    expect(mockTrackPaymentFailed).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["order API failure", mockCreatePaymentOrder, new Error("Order API offline")],
    ["network failure", mockCreatePaymentOrder, new Error("Network Error")],
    ["timeout", mockCreatePaymentOrder, new Error("timeout of 10000ms exceeded")],
    ["Razorpay exception", mockOpenRazorpayCheckout, new Error("SDK crashed")],
    ["verification failure", mockVerifyPayment, new Error("Signature mismatch")],
  ])("renders and monitors %s", async (_name, dependency, error) => {
    dependency.mockRejectedValueOnce(error);
    const { view, navigation } = await renderPayment();

    await waitFor(() => expect(view.getByText(error.message)).toBeTruthy());
    expect(mockCaptureFrontendError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        apiEndpoint: "/api/payments/create-order|/api/payments/verify",
        errorCode: "PAYMENT_FAILED",
      }),
    );
    expect(mockTrackPaymentFailed).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it.each([null, undefined])("handles invalid order response %p", async (invalidOrder) => {
    mockCreatePaymentOrder.mockResolvedValueOnce(invalidOrder);
    const { view } = await renderPayment();

    await waitFor(() => expect(view.getByText(/Cannot read properties|Payment failed/)).toBeTruthy());
    expect(mockCaptureFrontendError).toHaveBeenCalled();
  });

  it("defensively passes an empty order through checkout with zero-value defaults", async () => {
    mockCreatePaymentOrder.mockResolvedValueOnce({});
    const { view, navigation } = await renderPayment();

    await waitFor(() => expect(mockOpenRazorpayCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        key: undefined,
        order_id: undefined,
        amount: Number.NaN,
        currency: "INR",
      }),
    ));
    expect(view.getByText("Amount: ₹0.00")).toBeTruthy();
    expect(navigation.navigate).toHaveBeenCalledWith("PaymentStatus", expect.objectContaining({ bookingId: "412" }));
  });

  it("retries payment after an API failure and resets failure tracking", async () => {
    mockCreatePaymentOrder
      .mockRejectedValueOnce(new Error("Temporary failure"))
      .mockResolvedValueOnce(orderBuilder());
    const { view, navigation } = await renderPayment();

    await waitFor(() => expect(view.getByText("Retry Payment")).toBeTruthy());
    await fireEvent.press(view.getByText("Retry Payment"));

    await waitFor(() =>
      expect(navigation.navigate).toHaveBeenCalledWith("PaymentStatus", expect.objectContaining({ bookingId: "412" })),
    );
    expect(mockCreatePaymentOrder).toHaveBeenCalledTimes(2);
    expect(mockTrackPaymentFailed).toHaveBeenCalledTimes(1);
  });

  it("rate limits retries and shows the specific API error", async () => {
    const error = new Error("429");
    mockCreatePaymentOrder.mockRejectedValue(error);
    mockGetApiErrorCode.mockReturnValue("RATE_LIMIT_EXCEEDED");
    const { view } = await renderPayment();

    await waitFor(() =>
      expect(view.getByText("Too many requests. Please try again later.")).toBeTruthy(),
    );
    expect(
      view.container.queryAll((node) => node.props.accessibilityState?.disabled === true),
    ).toHaveLength(1);
    await fireEvent.press(view.getByText("Retry Payment"));
    expect(mockCreatePaymentOrder).toHaveBeenCalledTimes(1);
  });

  it("supports the development payment bypass after an error", async () => {
    mockCreatePaymentOrder.mockRejectedValue(new Error("Backend unavailable"));
    const { view, navigation } = await renderPayment(routeParams({
      postPaymentRoute: "InstantBookingStatus",
    }));

    await waitFor(() => expect(view.getByText("Skip Payment for Testing")).toBeTruthy());
    await fireEvent.press(view.getByText("Skip Payment for Testing"));

    expect(navigation.replace).toHaveBeenCalledWith("InstantBookingStatus", expect.objectContaining({
      bookingId: "412",
    }));
  });

  it("does not expose the development bypass when booking id is missing", async () => {
    const { view } = await renderPayment(routeParams({ bookingId: "" }));

    expect(view.queryByText("Skip Payment for Testing")).toBeNull();
    expect(mockCreatePaymentOrder).not.toHaveBeenCalled();
  });
});
