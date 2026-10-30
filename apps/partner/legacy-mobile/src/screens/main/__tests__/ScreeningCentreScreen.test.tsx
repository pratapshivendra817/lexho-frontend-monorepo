import React from "react";
import { Linking } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ScreeningCentreScreen, { ScreeningCentreContent } from "../ScreeningCentreScreen";
import { getPartnerScreeningCentre } from "../../../services/partnerService";

jest.mock("../../../services/partnerService", () => ({
  getPartnerScreeningCentre: jest.fn(),
}));

jest.mock("../../../context/AppLanguageContext", () => ({
  useAppLanguage: () => ({
    t: (key: string) =>
      ({
        "screening_centre.title": "Visit Centre",
        "common.loading": "Loading...",
        "common.retry": "Retry",
        "common.something_went_wrong": "Something went wrong",
        "screening_centre.empty_title": "Screening centre not configured",
        "screening_centre.empty_detail": "Your admin has not configured an active screening centre yet.",
        "screening_centre.open_maps": "Open in Maps",
        "screening_centre.call_support": "Call Support",
      }[key] ?? key),
  }),
}));

const collectText = (node: any): string[] => {
  if (node == null || typeof node === "boolean") return [];
  if (typeof node === "string" || typeof node === "number") return [String(node)];
  if (Array.isArray(node)) return node.flatMap(collectText);
  if (React.isValidElement(node)) return collectText((node as any).props?.children);
  return [];
};

const findElementByTestId = (node: any, testID: string): any | null => {
  if (node == null || typeof node === "boolean") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElementByTestId(child, testID);
      if (match) return match;
    }
    return null;
  }
  if (!React.isValidElement(node)) return null;
  if ((node as any).props?.testID === testID) return node;
  return findElementByTestId((node as any).props?.children, testID);
};

describe("ScreeningCentreScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, "openURL").mockResolvedValue();
  });

  it("renders centre details and wires call support plus maps", async () => {
    (getPartnerScreeningCentre as jest.Mock).mockResolvedValue({
      name: "Lexho Screening Centre",
      address: "Gt-53, Noida Sector-117",
      latitude: 28.5123456,
      longitude: 77.6123456,
      phone: "+919876543210",
      landmark: "Gate Number 03",
      entranceInfo: "Near Automotive Ace Garage",
    });

    const view = await render(<ScreeningCentreScreen navigation={{ goBack: jest.fn() }} />);

    expect(await view.findByText("Lexho Screening Centre")).toBeTruthy();
    expect(view.getByText("Gt-53, Noida Sector-117")).toBeTruthy();
    fireEvent.press(view.getByTestId("screening-centre-call-support-button"));
    expect(Linking.openURL).toHaveBeenCalledWith("tel:+919876543210");
    fireEvent.press(view.getByTestId("screening-centre-open-maps-button"));
    expect(Linking.openURL).toHaveBeenCalledWith(
      "https://www.google.com/maps/search/?api=1&query=28.5123456,77.6123456",
    );
  });

  it("renders empty state when centre is not configured", async () => {
    const tree = ScreeningCentreContent({
      navigation: { goBack: jest.fn() },
      loading: false,
      refreshing: false,
      error: "",
      centre: null,
      onRefresh: jest.fn(),
      onRetry: jest.fn(),
    });

    const renderedText = collectText(tree);
    expect(renderedText).toContain("Screening centre not configured");
    expect(renderedText).toContain("Your admin has not configured an active screening centre yet.");
    expect(findElementByTestId(tree, "screening-centre-empty-state")).toBeTruthy();
  });

  it("renders error state and retries", async () => {
    const onRetry = jest.fn();
    const tree = ScreeningCentreContent({
      navigation: { goBack: jest.fn() },
      loading: false,
      refreshing: false,
      error: "Load failed",
      centre: null,
      onRefresh: jest.fn(),
      onRetry,
    });

    const renderedText = collectText(tree);
    expect(renderedText).toContain("Something went wrong");
    expect(renderedText).toContain("Load failed");

    const retryButton = findElementByTestId(tree, "screening-centre-retry-button");
    expect(retryButton).toBeTruthy();
    retryButton.props.onPress();
    await waitFor(() => expect(onRetry).toHaveBeenCalledTimes(1));
  });
});
