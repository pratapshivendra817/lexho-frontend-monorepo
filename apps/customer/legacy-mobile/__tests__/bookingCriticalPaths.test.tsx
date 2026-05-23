import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { Text } from "react-native";
import { PaymentScreen } from "../src/screens/payment/PaymentScreen";
import { PaymentStatusScreen } from "../src/screens/payment/PaymentStatusScreen";
import { resolveLifecycleTarget } from "../src/hooks/useBookingLifecycleNavigation";

const mockUseQuery = jest.fn();
const mockUseMutation = jest.fn();
const mockUseAppSelector = jest.fn();
const mockDispatch = jest.fn();
const mockInitiatePayment = jest.fn();
const mockOpenRazorpayCheckout = jest.fn();
const mockGetPaymentStatus = jest.fn();

jest.mock("react-native-vector-icons/MaterialCommunityIcons", () => {
  return function MockIcon() {
    return null;
  };
});

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

jest.mock("../src/redux/hooks", () => ({
  useAppSelector: (selector: any) => mockUseAppSelector(selector),
  useAppDispatch: () => mockDispatch,
}));

jest.mock("../src/api/paymentApi", () => ({
  getPaymentOptions: jest.fn(),
  initiatePayment: (...args: any[]) => mockInitiatePayment(...args),
}));

jest.mock("../src/services/paymentService", () => ({
  openRazorpayCheckout: (...args: any[]) => mockOpenRazorpayCheckout(...args),
}));

jest.mock("../src/api/paymentExtrasApi", () => ({
  getPaymentStatus: (...args: any[]) => mockGetPaymentStatus(...args),
  refundPayment: jest.fn(),
}));

describe("Critical booking paths", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppSelector.mockImplementation((selector: any) =>
      selector({
        cart: { cartId: 10, toPay: 1200, currency: "INR" },
        auth: { user: { mobile: "7999700475", email: "qa@lexho.in" } },
      }),
    );
  });

  it("Scheduled + UPI success -> routes to BookingPaymentConfirm", async () => {
    mockUseQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { options: [{ id: "upi", mode: "UPI", label: "UPI", description: "Pay by UPI" }] },
      error: null,
    });

    mockInitiatePayment.mockResolvedValue({
      data: {
        razorpayOptions: {
          amount: 1200,
          currency: "INR",
          name: "Lexho",
          description: "Service payment",
        },
      },
    });
    mockOpenRazorpayCheckout.mockResolvedValue({ success: true });

    mockUseMutation.mockImplementation(({ mutationFn, onSuccess, onError }: any) => ({
      isPending: false,
      mutate: async (mode: string) => {
        try {
          const res = await mutationFn(mode);
          onSuccess?.(res);
        } catch (e) {
          onError?.(e);
        }
      },
    }));

    const navigation = { navigate: jest.fn(), replace: jest.fn() };
    const route = { params: { bookingId: "BKG123", amount: 1200, currency: "INR", postPaymentRoute: "BookingPaymentConfirm" as const } };
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<PaymentScreen navigation={navigation} route={route} />);
    });

    const pressables = tree.root.findAll((node: any) => typeof node.props?.onPress === "function");
    await ReactTestRenderer.act(async () => {
      pressables[0]?.props.onPress?.();
    });
    const updatedPressables = tree.root.findAll((node: any) => typeof node.props?.onPress === "function");
    await ReactTestRenderer.act(async () => {
      updatedPressables[updatedPressables.length - 1]?.props.onPress?.();
    });

    expect(mockInitiatePayment).toHaveBeenCalled();
    expect(mockOpenRazorpayCheckout).toHaveBeenCalled();
    expect(navigation.replace).toHaveBeenCalledWith("BookingPaymentConfirm", { bookingId: "BKG123" });
  });

  it("Scheduled + payment failed -> retry CTA visible and navigates to Payment", async () => {
    mockUseMutation
      .mockImplementationOnce(({ onSuccess }: any) => ({
        isPending: false,
        mutate: () => onSuccess?.({ data: { status: "FAILED" } }),
      }))
      .mockImplementationOnce(() => ({
        isPending: false,
        mutate: jest.fn(),
      }));

    const navigation = { navigate: jest.fn() };
    const route = { params: { bookingId: "BKG_FAIL_1" } };

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<PaymentStatusScreen navigation={navigation} route={route} />);
    });
    const allTapTargets = tree.root.findAll((node: any) => typeof node.props?.onPress === "function");

    await ReactTestRenderer.act(async () => {
      allTapTargets[0]?.props.onPress?.();
    });

    const retryButton = tree.root.findAllByType(Text).find((node: any) => {
      const c = node.props.children;
      return c === "Retry Payment";
    });
    expect(retryButton).toBeTruthy();

    const retryTapTarget = tree.root.find(
      (node: any) => node.props?.mode === "contained-tonal" && typeof node.props?.onPress === "function",
    );
    await ReactTestRenderer.act(async () => {
      retryTapTarget?.props.onPress?.();
    });

    expect(navigation.navigate).toHaveBeenCalledWith("Payment", { bookingId: "BKG_FAIL_1" });
  });

  it("Instant lifecycle flow maps SEARCHING -> ASSIGNED -> IN_PROGRESS -> COMPLETED targets", () => {
    const searchTarget = resolveLifecycleTarget({
      id: "BKG1",
      bookingType: "INSTANT",
      assignmentStatus: "SEARCHING_PARTNER",
    } as any);
    const assignedTarget = resolveLifecycleTarget({
      id: "BKG1",
      bookingType: "INSTANT",
      assignmentStatus: "PARTNER_ASSIGNED",
    } as any);
    const progressTarget = resolveLifecycleTarget({
      id: "BKG1",
      bookingType: "INSTANT",
      assignmentStatus: "IN_PROGRESS",
    } as any);
    const completeTarget = resolveLifecycleTarget({
      id: "BKG1",
      bookingType: "INSTANT",
      assignmentStatus: "COMPLETED",
    } as any);

    expect(searchTarget.name).toBe("InstantBookingStatus");
    expect(["InstantBookingStatus", "LiveTracking"]).toContain(assignedTarget.name);
    expect(progressTarget.name).toBe("ServiceStarted");
    expect(completeTarget.name).toBe("ServiceCompleted");
  });
});
