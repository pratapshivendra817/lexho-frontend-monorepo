import React from "react";
import { Text, TouchableOpacity } from "react-native";
import ReactTestRenderer, { act } from "react-test-renderer";

import PayoutsScreen from "../PayoutsScreen";
import { getPartnerPayouts } from "../../../services/partnerService";

const mockToast = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock("react-native/Libraries/Lists/FlatList", () => {
  const React = require("react");
  const { View } = require("react-native");

  const MockFlatList = ({ data = [], renderItem, ListEmptyComponent, testID = "payouts-list", ...props }: any) => {
    const empty = typeof ListEmptyComponent === "function" ? React.createElement(ListEmptyComponent) : ListEmptyComponent;

    return React.createElement(
      View,
      { testID, ...props },
      data.length === 0
        ? empty
        : data.map((item: any, index: number) =>
            React.createElement(View, { key: props.keyExtractor ? props.keyExtractor(item, index) : `${index}` }, renderItem({ item, index })),
          ),
    );
  };

  return { __esModule: true, default: MockFlatList };
});

jest.mock("../../../context/AppFeedbackContext", () => ({
  useAppFeedback: () => ({ toast: mockToast }),
}));

jest.mock("../../../services/partnerService", () => ({
  getPartnerPayouts: jest.fn(),
}));

jest.mock("../../../components/payments/PaymentHeader", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  return function MockPaymentHeader({ title, onBack }: any) {
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      React.createElement(TouchableOpacity, { onPress: onBack }, React.createElement(Text, null, "Back")),
    );
  };
});

jest.mock("react-native-vector-icons/MaterialCommunityIcons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ name }: any) => React.createElement(Text, null, `icon:${name}`);
});

describe("PayoutsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getTextValues = (tree: ReactTestRenderer.ReactTestRenderer) =>
    tree.root.findAllByType(Text).map((node) => {
      const children = node.props.children;
      return Array.isArray(children) ? children.join("") : String(children ?? "");
    });

  it("renders empty state and supports back navigation", async () => {
    (getPartnerPayouts as jest.Mock).mockResolvedValueOnce([]);
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<PayoutsScreen navigation={{ goBack: mockGoBack, navigate: mockNavigate }} />);
    });

    expect(getTextValues(tree)).toContain("Payout History");
    expect(getTextValues(tree)).toContain("No payouts available.");

    await act(async () => {
      tree.root.findAllByType(TouchableOpacity)[0].props.onPress();
    });
    expect(mockGoBack).toHaveBeenCalled();

    await act(async () => {
      tree.unmount();
    });
  });

  it("renders payout rows and navigates to payout details", async () => {
    (getPartnerPayouts as jest.Mock).mockResolvedValueOnce([
      { id: "p1", netAmount: 1200, createdAt: "2026-07-01T00:00:00Z", status: "PAID" },
    ]);
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<PayoutsScreen navigation={{ goBack: mockGoBack, navigate: mockNavigate }} />);
    });

    expect(getTextValues(tree)).toContain("Payout #p1");
    expect(getTextValues(tree)).toContain("INR 1200.00");
    expect(getTextValues(tree)).toContain("icon:chevron-right");

    await act(async () => {
      tree.root.findAllByType(TouchableOpacity)[1].props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith("PayoutDetail", { payoutId: "p1" });

    await act(async () => {
      tree.unmount();
    });
  });

  it("shows toast when the payouts api fails", async () => {
    (getPartnerPayouts as jest.Mock).mockRejectedValueOnce(new Error("Unable to load payouts"));
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<PayoutsScreen navigation={{ goBack: mockGoBack, navigate: mockNavigate }} />);
    });

    expect(mockToast).toHaveBeenCalledWith("Unable to load payouts");

    await act(async () => {
      tree.unmount();
    });
  });

  it("reloads payouts when pull to refresh is triggered", async () => {
    (getPartnerPayouts as jest.Mock)
      .mockResolvedValueOnce([{ id: "p1", netAmount: 1200, createdAt: "2026-07-01T00:00:00Z", status: "PAID" }])
      .mockResolvedValueOnce([{ id: "p2", netAmount: 800, createdAt: "2026-07-02T00:00:00Z", status: "PROCESSING" }]);

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<PayoutsScreen navigation={{ goBack: mockGoBack, navigate: mockNavigate }} />);
    });

    await act(async () => {
      await tree.root.findByProps({ testID: "payouts-list" }).props.refreshControl.props.onRefresh();
    });

    expect(getPartnerPayouts).toHaveBeenCalledTimes(2);
    expect(getTextValues(tree)).toContain("Payout #p2");

    await act(async () => {
      tree.unmount();
    });
  });
});
