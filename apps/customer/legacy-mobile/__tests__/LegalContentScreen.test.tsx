import React from "react";
import { Linking } from "react-native";
import { act, cleanup, fireEvent, render } from "@testing-library/react-native";

import { LegalContentScreen } from "../src/screens/profile/LegalContentScreen";

const mockGoBack = jest.fn();
const mockGetCustomerProfileContent = jest.fn();

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 8, bottom: 12, left: 0, right: 0 }),
}));

jest.mock("../src/api/customerProfileApi", () => ({
  getCustomerProfileContent: (...args: any[]) => mockGetCustomerProfileContent(...args),
}));

describe("LegalContentScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined as never);
    mockGetCustomerProfileContent.mockRejectedValue(new Error("missing"));
  });

  afterEach(async () => {
    await cleanup();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  async function renderLegal(name: string, content?: string, lastUpdated?: string) {
    return await render(
      <LegalContentScreen
        route={{ name, params: { content, lastUpdated } }}
        navigation={{ goBack: mockGoBack }}
      />,
    );
  }

  async function finishSkeleton() {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(350);
    });
  }

  it("renders normalized headings, lists, quote, emphasis, and metadata", async () => {
    const view = await renderLegal(
      "TermsOfService",
      [
        "<h1>Main Terms</h1>",
        "## Scope",
        "<p>Use <strong>carefully</strong> and <em>responsibly</em>.</p>",
        "<li>First item</li>",
        "1. Numbered item",
        "> Important notice",
        "CONTACT:",
      ].join("\n"),
      "June 13, 2026",
    );
    await finishSkeleton();

    expect(view.getByText("Terms of Service")).toBeTruthy();
    expect(view.getByText("Main Terms")).toBeTruthy();
    expect(view.getByText("Scope")).toBeTruthy();
    expect(view.getByText("carefully")).toBeTruthy();
    expect(view.getByText("responsibly")).toBeTruthy();
    expect(view.getByText("First item")).toBeTruthy();
    expect(view.getByText("Numbered item")).toBeTruthy();
    expect(view.getByText("Important notice")).toBeTruthy();
    expect(view.getByText("CONTACT")).toBeTruthy();
    expect(view.getByText("Last updated: June 13, 2026")).toBeTruthy();
  });

  it.each([
    ["https://lexho.test/legal", "https://lexho.test/legal"],
    ["www.lexho.test", "https://www.lexho.test"],
    ["support@lexho.test", "mailto:support@lexho.test"],
    ["+91 98765 43210", "tel:+919876543210"],
  ])("opens detected link %s", async (token, target) => {
    const view = await renderLegal("PrivacyPolicy", `<p>Contact ${token}</p>`);
    await finishSkeleton();

    await fireEvent.press(view.getByText(token));
    expect(Linking.openURL).toHaveBeenCalledWith(target);
  });

  it("shows missing-content error, retries, and navigates back", async () => {
    const view = await renderLegal("AboutUs", "");
    await finishSkeleton();

    expect(view.getByText("About Us")).toBeTruthy();
    expect(view.getByText("Content not available")).toBeTruthy();

    await fireEvent.press(view.getByText("Retry"));
    expect(view.queryByText("Content not available")).toBeNull();
    await finishSkeleton();
    expect(view.getByText("Content not available")).toBeTruthy();

    await fireEvent.press(view.getByText("Back"));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it("fetches fallback content when route params are empty", async () => {
    mockGetCustomerProfileContent.mockResolvedValueOnce({
      aboutUs: "Fetched about text",
      termsOfService: "Fetched terms text",
      privacyPolicy: "Fetched privacy text",
    });

    const view = await renderLegal("AboutUs", "");
    await finishSkeleton();

    expect(view.getByText("Fetched about text")).toBeTruthy();
  });

  it("clears the loading timer on unmount", async () => {
    const clearTimeoutSpy = jest.spyOn(globalThis, "clearTimeout");
    const view = await renderLegal("PrivacyPolicy", "Privacy text");
    await view.unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
