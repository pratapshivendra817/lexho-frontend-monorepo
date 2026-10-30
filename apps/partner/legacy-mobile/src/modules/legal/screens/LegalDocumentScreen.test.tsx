import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import LegalDocumentScreen from "./LegalDocumentScreen";
import { getPartnerLegalDocument } from "../api/legalContentApi";

jest.mock("../api/legalContentApi", () => ({
  getPartnerLegalDocument: jest.fn(),
}));

jest.mock("../../../context/AppLanguageContext", () => ({
  useAppLanguage: () => ({
    t: (key: string) =>
      ({
        "common.loading": "Loading...",
        "common.retry": "Retry",
        "common.something_went_wrong": "Something went wrong",
        "legal.empty_title": "Content not available",
        "legal.empty_description": "The latest legal content has not been published yet.",
        "legal.last_updated": "Last updated",
      }[key] ?? key),
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe("LegalDocumentScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders fetched legal content with version metadata", async () => {
    (getPartnerLegalDocument as jest.Mock).mockResolvedValueOnce({
      slug: "terms-and-conditions",
      title: "Terms & Conditions",
      format: "MARKDOWN",
      summary: "Partner terms summary",
      content: "# Main Terms\n\n- First clause",
      version: 2,
      updatedAt: "2026-08-16T10:00:00.000Z",
    });

    const view = await render(
      <LegalDocumentScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { slug: "terms-and-conditions", title: "Terms & Conditions" } }}
      />,
    );

    expect(await view.findByText("Partner terms summary")).toBeTruthy();
    expect(view.getByText("Main Terms")).toBeTruthy();
    expect(view.getByText(/First clause/)).toBeTruthy();
    expect(view.getByText(/Version 2/)).toBeTruthy();
  });

  it("renders error state and retries loading", async () => {
    (getPartnerLegalDocument as jest.Mock)
      .mockRejectedValueOnce(new Error("Load failed"))
      .mockResolvedValueOnce({
        slug: "terms-and-conditions",
        title: "Terms & Conditions",
        format: "MARKDOWN",
        content: "# Retry success",
      });

    const view = await render(
      <LegalDocumentScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { slug: "terms-and-conditions", title: "Terms & Conditions" } }}
      />,
    );

    expect(await view.findByText("Something went wrong")).toBeTruthy();
    fireEvent.press(view.getByText("Retry"));
    await waitFor(() => {
      expect(getPartnerLegalDocument).toHaveBeenCalledTimes(2);
    });
    expect(await view.findByText("Retry success")).toBeTruthy();
  });

  it("renders empty state when content is blank", async () => {
    (getPartnerLegalDocument as jest.Mock).mockResolvedValueOnce({
      slug: "terms-and-conditions",
      title: "Terms & Conditions",
      format: "MARKDOWN",
      content: "   ",
    });

    const view = await render(
      <LegalDocumentScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { slug: "terms-and-conditions", title: "Terms & Conditions" } }}
      />,
    );

    expect(await view.findByText("Content not available")).toBeTruthy();
    expect(view.getByText("The latest legal content has not been published yet.")).toBeTruthy();
  });
});
