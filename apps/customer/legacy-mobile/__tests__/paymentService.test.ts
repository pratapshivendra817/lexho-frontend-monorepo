const mockRazorpayOpen = jest.fn();

jest.mock("react-native-razorpay", () => ({
  __esModule: true,
  default: {
    open: (...args: unknown[]) => mockRazorpayOpen(...args),
  },
}));

import { openRazorpayCheckout } from "../src/services/paymentService";

const validOptions = {
  key: "rzp_test_key",
  order_id: "order_123",
  amount: 49900,
  currency: "INR" as const,
  name: "Lexho",
  description: "Home service booking",
  method: "upi" as const,
  prefill: {
    contact: "9999999999",
    email: "customer@example.com",
  },
  theme: {
    color: "#06132D",
  },
};

describe("paymentService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes Razorpay with the exact options and returns all success fields", async () => {
    mockRazorpayOpen.mockResolvedValueOnce({
      razorpay_order_id: "order_123",
      razorpay_payment_id: "pay_123",
      razorpay_signature: "signature_123",
    });

    await expect(openRazorpayCheckout(validOptions)).resolves.toEqual({
      success: true,
      orderId: "order_123",
      paymentId: "pay_123",
      signature: "signature_123",
    });

    expect(mockRazorpayOpen).toHaveBeenCalledTimes(1);
    expect(mockRazorpayOpen).toHaveBeenCalledWith(validOptions);
  });

  it("initializes checkout without debug logging in production mode", async () => {
    const runtime = globalThis as typeof globalThis & { __DEV__: boolean };
    const originalDev = runtime.__DEV__;
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    runtime.__DEV__ = false;
    mockRazorpayOpen.mockResolvedValueOnce({
      razorpay_payment_id: "pay_production",
    });

    try {
      await expect(openRazorpayCheckout(validOptions)).resolves.toMatchObject({
        success: true,
        paymentId: "pay_production",
      });
      expect(logSpy).not.toHaveBeenCalled();
    } finally {
      runtime.__DEV__ = originalDev;
      logSpy.mockRestore();
    }
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["empty object", {}],
  ])("handles a successful %s gateway response", async (_label, result) => {
    mockRazorpayOpen.mockResolvedValueOnce(result);

    await expect(openRazorpayCheckout(validOptions)).resolves.toEqual({
      success: true,
      orderId: undefined,
      paymentId: undefined,
      signature: undefined,
    });
  });

  it.each([
    ["empty", {}],
    ["null", null],
    ["undefined", undefined],
    ["malformed", { amount: "not-a-number", currency: "USD" }],
  ])("forwards %s checkout input unchanged to the gateway", async (_label, input) => {
    mockRazorpayOpen.mockResolvedValueOnce({});

    await openRazorpayCheckout(input as unknown as typeof validOptions);

    expect(mockRazorpayOpen).toHaveBeenCalledWith(input);
  });

  it("maps nested Razorpay failure details with snake-case metadata", async () => {
    const gatewayFailure = {
      error: {
        code: "BAD_REQUEST_ERROR",
        description: "Payment failed",
        reason: "payment_failed",
        metadata: {
          order_id: "order_failed",
          payment_id: "pay_failed",
        },
      },
    };
    mockRazorpayOpen.mockRejectedValueOnce(gatewayFailure);

    await expect(openRazorpayCheckout(validOptions)).resolves.toEqual({
      success: false,
      error: "Payment failed",
      failure: {
        code: "BAD_REQUEST_ERROR",
        description: "Payment failed",
        reason: "payment_failed",
        orderId: "order_failed",
        paymentId: "pay_failed",
        raw: gatewayFailure.error,
      },
    });
  });

  it("supports camel-case metadata and trims gateway values", async () => {
    const nestedFailure = {
      code: "  GATEWAY_ERROR  ",
      description: "  Bank declined the payment  ",
      reason: "  bank_declined  ",
      metadata: {
        orderId: "  order_camel  ",
        paymentId: "  pay_camel  ",
      },
    };
    mockRazorpayOpen.mockRejectedValueOnce({ error: nestedFailure });

    await expect(openRazorpayCheckout(validOptions)).resolves.toEqual({
      success: false,
      error: "Bank declined the payment",
      failure: {
        code: "GATEWAY_ERROR",
        description: "Bank declined the payment",
        reason: "bank_declined",
        orderId: "order_camel",
        paymentId: "pay_camel",
        raw: nestedFailure,
      },
    });
  });

  it("uses direct order and payment identifiers when metadata is absent", async () => {
    const failure = {
      code: "PAYMENT_ERROR",
      description: "Direct identifiers",
      order_id: "order_direct",
      payment_id: "pay_direct",
    };
    mockRazorpayOpen.mockRejectedValueOnce(failure);

    await expect(openRazorpayCheckout(validOptions)).resolves.toMatchObject({
      success: false,
      error: "Direct identifiers",
      failure: {
        orderId: "order_direct",
        paymentId: "pay_direct",
        raw: failure,
      },
    });
  });

  it("falls back to the top-level description for nested malformed errors", async () => {
    const failure = {
      description: "Top-level payment failure",
      error: {
        code: "MALFORMED_GATEWAY_ERROR",
        metadata: null,
      },
    };
    mockRazorpayOpen.mockRejectedValueOnce(failure);

    await expect(openRazorpayCheckout(validOptions)).resolves.toMatchObject({
      success: false,
      error: "Top-level payment failure",
      failure: {
        code: "MALFORMED_GATEWAY_ERROR",
        description: "Top-level payment failure",
        orderId: undefined,
        paymentId: undefined,
        raw: failure.error,
      },
    });
  });

  it("maps a gateway timeout rejection without throwing", async () => {
    const timeoutFailure = {
      error: {
        code: "ETIMEDOUT",
        description: "Payment gateway timed out",
        reason: "timeout",
      },
    };
    mockRazorpayOpen.mockRejectedValueOnce(timeoutFailure);

    await expect(openRazorpayCheckout(validOptions)).resolves.toMatchObject({
      success: false,
      error: "Payment gateway timed out",
      failure: {
        code: "ETIMEDOUT",
        description: "Payment gateway timed out",
        reason: "timeout",
      },
    });
  });

  it("uses an Error message for gateway cancellation", async () => {
    const cancellation = new Error("User cancelled checkout");
    mockRazorpayOpen.mockRejectedValueOnce(cancellation);

    await expect(openRazorpayCheckout(validOptions)).resolves.toEqual({
      success: false,
      error: "User cancelled checkout",
      failure: {
        code: undefined,
        description: undefined,
        reason: undefined,
        orderId: undefined,
        paymentId: undefined,
        raw: cancellation,
      },
    });
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["string", "cancelled"],
    ["number", 408],
    ["empty object", {}],
  ])("returns the cancellation fallback for a %s rejection", async (_label, error) => {
    mockRazorpayOpen.mockRejectedValueOnce(error);

    await expect(openRazorpayCheckout(validOptions)).resolves.toMatchObject({
      success: false,
      error: "Payment cancelled",
      failure: {
        code: undefined,
        description: undefined,
        reason: undefined,
        orderId: undefined,
        paymentId: undefined,
        raw: error,
      },
    });
  });

  it("handles a synchronous gateway initialization failure", async () => {
    const initializationError = new Error("Razorpay SDK unavailable");
    mockRazorpayOpen.mockImplementationOnce(() => {
      throw initializationError;
    });

    await expect(openRazorpayCheckout(validOptions)).resolves.toEqual({
      success: false,
      error: "Razorpay SDK unavailable",
      failure: {
        code: undefined,
        description: undefined,
        reason: undefined,
        orderId: undefined,
        paymentId: undefined,
        raw: initializationError,
      },
    });
  });
});
