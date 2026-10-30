import React from "react";
import { Share, Text } from "react-native";
import ReactTestRenderer, { act } from "react-test-renderer";

import OrderDetailsScreen from "../OrderDetailsScreen";
import { fetchPartnerRequestById, getCanonicalPartnerOrderId, getPartnerOrderById } from "../../../services/partnerService";

jest.mock("../../../services/partnerService", () => ({
  fetchPartnerRequestById: jest.fn(),
  getCanonicalPartnerOrderId: jest.fn((item) => item.requestId ?? item.id),
  getPartnerOrderById: jest.fn(),
}));

jest.mock("../../../components/common/OrderLifecycleTimeline", () => ({
  OrderLifecycleTimeline: ({ order }: any) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, `Timeline:${order?.status ?? "NONE"}`);
  },
}));

jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as any);

const mockFetchPartnerRequestById = fetchPartnerRequestById as jest.MockedFunction<typeof fetchPartnerRequestById>;
const mockGetCanonicalPartnerOrderId = getCanonicalPartnerOrderId as jest.MockedFunction<typeof getCanonicalPartnerOrderId>;
const mockGetPartnerOrderById = getPartnerOrderById as jest.MockedFunction<typeof getPartnerOrderById>;

describe("OrderDetailsScreen branch coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchPartnerRequestById.mockReset();
    mockGetCanonicalPartnerOrderId.mockImplementation((item) => item.requestId ?? item.id);
    mockGetPartnerOrderById.mockReset();
  });

  const pressText = async (tree: ReactTestRenderer.ReactTestRenderer, label: string) => {
    const node = tree.root.findAllByType(Text).find((item) => {
      const children = item.props.children;
      const value = Array.isArray(children) ? children.join("") : String(children ?? "");
      return value === label;
    }) ?? tree.root.findAll((item) => item.props?.accessibilityLabel === label)[0];
    let target: any = node;
    while (target && !target.props?.onPress) {
      target = target.parent;
    }

    await act(async () => {
      await target?.props?.onPress?.();
    });
  };

  it("shows the generic load error when the api rejects without a message", async () => {
    mockGetPartnerOrderById.mockRejectedValueOnce(undefined);

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<OrderDetailsScreen route={{ params: { orderId: 15 } }} navigation={{ navigate: jest.fn() }} />);
    });

    const texts = tree.root.findAllByType(Text).map((node) => {
      const children = node.props.children;
      return Array.isArray(children) ? children.join("") : String(children ?? "");
    });

    expect(texts).toContain("Unable to load order");
  });

  it("shares fallback order details when optional fields are missing", async () => {
    mockGetPartnerOrderById.mockResolvedValueOnce({
      id: 31,
      status: "STARTED",
      customerName: null,
      customerPhone: undefined,
      address: null,
      serviceType: undefined,
      amount: null,
      createdAt: null,
    } as any);

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<OrderDetailsScreen route={{ params: { orderId: 31 } }} navigation={{ navigate: jest.fn() }} />);
    });

    await pressText(tree, "Share order");

    expect(Share.share).toHaveBeenCalledWith({
      title: "Order #31",
      message: [
        "Order Details #31",
        "Customer: -",
        "Phone: -",
        "Address: -",
        "Service: -",
        "Payable Amount: INR 0",
        "Status: STARTED",
      ].join("\n"),
    });
  });
});
