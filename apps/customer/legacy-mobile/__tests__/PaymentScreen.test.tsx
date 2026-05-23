import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { Text } from "react-native";
import { PaymentScreen } from "../src/screens/payment/PaymentScreen";

const mockUseQuery = jest.fn();
const mockMutate = jest.fn();
const mockUseAppSelector = jest.fn();

jest.mock("react-native-vector-icons/MaterialCommunityIcons", () => {
  return function MockIcon() {
    return null;
  };
});

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: () => ({
    isPending: false,
    mutate: mockMutate,
  }),
}));

jest.mock("../src/redux/hooks", () => ({
  useAppSelector: (selector: any) => mockUseAppSelector(selector),
}));

jest.mock("../src/api/paymentApi", () => ({
  getPaymentOptions: jest.fn(),
  initiatePayment: jest.fn(),
}));

jest.mock("../src/services/paymentService", () => ({
  openRazorpayCheckout: jest.fn(),
}));

function getRenderedText(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root
    .findAllByType(Text)
    .map((node) => {
      const value = node.props.children;
      if (Array.isArray(value)) return value.join("");
      return typeof value === "string" ? value : "";
    })
    .join(" ");
}

describe("PaymentScreen dynamic flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppSelector.mockImplementation((selector: any) =>
      selector({
        cart: { cartId: 44, toPay: 51.46, currency: "INR" },
        auth: { user: { mobile: "7999700475", email: "test@example.com" } },
      }),
    );
    mockUseQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        options: [
          { id: "upi", mode: "UPI", label: "Pay by Any UPI app", description: "Use any UPI app on your phone to pay" },
          { id: "card", mode: "CARD", label: "Cards", description: "Credit / Debit cards" },
        ],
      },
      error: null,
    });
  });

  it("renders dynamic amount and options from query response", async () => {
    const navigation = { navigate: jest.fn() };
    const route = { params: { amount: 51.46, currency: "INR" } };
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<PaymentScreen navigation={navigation} route={route} />);
    });
    const text = getRenderedText(tree as unknown as ReactTestRenderer.ReactTestRenderer);
    expect(text).toContain("Payment Options");
    expect(text).toContain("To Pay:");
    expect(text).toContain("Pay by Any UPI app");
    expect(text).toContain("Cards");
  });

  it("proceeds with selected dynamic payment mode", async () => {
    const navigation = { navigate: jest.fn() };
    const route = { params: { amount: 51.46, currency: "INR" } };
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<PaymentScreen navigation={navigation} route={route} />);
    });

    const pressables = tree.root.findAll((node: any) => typeof node.props?.onPress === "function");
    const upiOption = pressables[0];
    expect(upiOption).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      upiOption?.props.onPress?.();
    });

    const updatedPressables = tree.root.findAll((node: any) => typeof node.props?.onPress === "function");
    const proceedBtn = updatedPressables[updatedPressables.length - 1];
    expect(proceedBtn).toBeTruthy();
    expect(proceedBtn?.props.disabled).toBe(false);

    await ReactTestRenderer.act(async () => {
      proceedBtn?.props.onPress?.();
    });

    expect(mockMutate).toHaveBeenCalledWith("UPI");
  });
});
