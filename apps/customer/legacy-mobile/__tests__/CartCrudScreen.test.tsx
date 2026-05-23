import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { Text } from "react-native";
import { CartCrudScreen } from "../src/screens/cart/CartCrudScreen";

let mockState: any;
const mockDispatch = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("react-native-vector-icons/MaterialCommunityIcons", () => {
  return function MockIcon() {
    return null;
  };
});

jest.mock("../src/components/cart/TimePicker", () => ({
  TimePicker: () => null,
}));

jest.mock("../src/api/bookingApi", () => ({
  createBooking: jest.fn(),
}));

jest.mock("../src/api/cartApi", () => ({
  getAvailableTimeSlots: jest.fn(),
}));

jest.mock("../src/redux/hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector(mockState),
}));

function baseState() {
  return {
    cart: {
      items: [
        {
          itemId: 1,
          serviceId: 11,
          name: "AC Service",
          price: 49,
          totalPrice: 49,
          quantity: 1,
          imageUrl: "",
        },
      ],
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
      addresses: [],
      selectedAddressId: null,
      scheduledTime: null,
      loading: false,
      error: null,
    },
    auth: {
      user: {
        name: "S P",
        mobile: "7999700475",
      },
    },
  };
}

function getAllText(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root
    .findAllByType(Text)
    .map((node) => {
      const value = node.props.children;
      if (Array.isArray(value)) return value.join("");
      return typeof value === "string" ? value : "";
    })
    .join(" ");
}

describe("CartCrudScreen CTA and booking details visibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = baseState();
  });

  it("shows Book now when scheduled slot is not confirmed", async () => {
    const navigation = { navigate: jest.fn() };
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<CartCrudScreen navigation={navigation} />);
    });
    const text = getAllText(tree as unknown as ReactTestRenderer.ReactTestRenderer);
    expect(text).toContain("Book now");
  });

  it("shows Booking details and Pay now with amount when scheduled slot is confirmed", async () => {
    mockState.cart.scheduledTime = "2026-05-20T07:00:00.000Z";
    const navigation = { navigate: jest.fn() };
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<CartCrudScreen navigation={navigation} />);
    });
    const text = getAllText(tree as unknown as ReactTestRenderer.ReactTestRenderer);
    expect(text).toContain("Booking details");
    expect(text).toContain("Pay now |");
  });
});
