import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import KycStatusScreen from "../KycStatusScreen";
import { getPartnerProfile } from "../../../services/partnerService";

jest.mock("../../../services/partnerService", () => ({
  getPartnerProfile: jest.fn(),
}));

jest.mock("../../../components/payments/PaymentHeader", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  return function MockPaymentHeader({ title, onBack }: { title: string; onBack: () => void }) {
    return React.createElement(View, null,
      React.createElement(TouchableOpacity, { onPress: onBack, accessibilityLabel: "Go back" }, React.createElement(Text, null, "Back")),
      React.createElement(Text, null, title),
    );
  };
});

const mockedGetPartnerProfile = getPartnerProfile as jest.MockedFunction<typeof getPartnerProfile>;

describe("KycStatusScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state before profile arrives", async () => {
    let resolve!: (value: any) => void;
    const promise = new Promise((res) => { resolve = res; });
    mockedGetPartnerProfile.mockReturnValueOnce(promise as any);
    const view = await render(<KycStatusScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

    expect(view.getByTestId("kyc-status-scroll").props.refreshControl.props.refreshing).toBe(true);

    await act(async () => {
      resolve({ kycStatus: "APPROVED" });
      await promise;
    });
  });

  it("renders approved state without upload action", async () => {
    mockedGetPartnerProfile.mockResolvedValueOnce({ kycStatus: "APPROVED" });
    const navigation = { goBack: jest.fn(), navigate: jest.fn() };
    const view = await render(<KycStatusScreen navigation={navigation} />);

    expect(await view.findByText("Approved")).toBeTruthy();
    expect(view.queryByText("Upload Documents")).toBeNull();

    fireEvent.press(view.getByLabelText("Go back"));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it("renders rejected state and navigates to document upload", async () => {
    mockedGetPartnerProfile.mockResolvedValueOnce({ kycStatus: "REJECTED", kycRejectionReason: "Photo blurry" });
    const navigation = { goBack: jest.fn(), navigate: jest.fn() };
    const view = await render(<KycStatusScreen navigation={navigation} />);

    expect(await view.findByText("Rejected")).toBeTruthy();
    expect(view.getByText("Action Required")).toBeTruthy();
    expect(view.getByText("Photo blurry")).toBeTruthy();

    fireEvent.press(view.getByText("Re-upload Documents"));

    expect(navigation.navigate).toHaveBeenCalledWith("DocumentUpload");
  });

  it("renders pending state upload CTA", async () => {
    mockedGetPartnerProfile.mockResolvedValueOnce({ kycStatus: "PENDING" });
    const navigation = { goBack: jest.fn(), navigate: jest.fn() };
    const view = await render(<KycStatusScreen navigation={navigation} />);

    expect(await view.findByText("Pending")).toBeTruthy();
    fireEvent.press(view.getByText("Upload Documents"));
    expect(navigation.navigate).toHaveBeenCalledWith("DocumentUpload");
  });

  it("shows retry state on error and retries successfully", async () => {
    mockedGetPartnerProfile
      .mockRejectedValueOnce(new Error("bad"))
      .mockResolvedValueOnce({ kycStatus: "UNDER_REVIEW" });
    const view = await render(<KycStatusScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

    expect(await view.findByText("bad")).toBeTruthy();

    fireEvent.press(view.getByText("Retry"));

    await waitFor(() => {
      expect(view.getByText("Under Review")).toBeTruthy();
    });
  });
});
