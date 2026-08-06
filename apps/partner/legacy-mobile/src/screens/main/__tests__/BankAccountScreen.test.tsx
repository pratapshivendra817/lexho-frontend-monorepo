import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import BankAccountScreen, {
  normalizeBankAccountInput,
  normalizeIfscInput,
  validateBankAccountDetails,
} from "../BankAccountScreen";
import { getPartnerBankDetails, updatePartnerBankDetails } from "../../../services/partnerService";

const mockToast = jest.fn();

jest.mock("../../../services/partnerService", () => ({
  getPartnerBankDetails: jest.fn(),
  updatePartnerBankDetails: jest.fn(),
}));

jest.mock("../../../context/AppFeedbackContext", () => ({
  useAppFeedback: () => ({ toast: mockToast }),
}));

jest.mock("../../../components/payments/PaymentHeader", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  return function MockPaymentHeader({ title, onBack }: { title: string; onBack: () => void }) {
    return React.createElement(
      View,
      null,
      React.createElement(TouchableOpacity, { onPress: onBack, accessibilityLabel: "Go back" }, React.createElement(Text, null, "Back")),
      React.createElement(Text, null, title),
    );
  };
});

const mockedGetPartnerBankDetails = getPartnerBankDetails as jest.MockedFunction<typeof getPartnerBankDetails>;
const mockedUpdatePartnerBankDetails = updatePartnerBankDetails as jest.MockedFunction<typeof updatePartnerBankDetails>;

describe("BankAccountScreen", () => {
  beforeEach(() => {
    mockedGetPartnerBankDetails.mockReset();
    mockedUpdatePartnerBankDetails.mockReset();
    mockToast.mockReset();
  });

  it("renders initial saved bank details and back navigation", async () => {
    mockedGetPartnerBankDetails.mockResolvedValueOnce({
      maskedAccountNumber: "XXXXXX1234",
      ifscCode: "HDFC0001234",
      verificationStatus: "APPROVED",
    } as any);

    const navigation = { goBack: jest.fn() };
    const view = await render(<BankAccountScreen navigation={navigation} />);

    await waitFor(() => {
      expect(view.getByText("Bank Account")).toBeTruthy();
    });
    expect(view.getByText("XXXXXX1234")).toBeTruthy();
    expect(view.getByText("IFSC: HDFC0001234")).toBeTruthy();
    expect(view.getByText("Verification: APPROVED")).toBeTruthy();
    expect(view.getByText("Update Bank Account")).toBeTruthy();

    fireEvent.press(view.getByLabelText("Go back"));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it("renders pending banner and add state when no bank account exists", async () => {
    mockedGetPartnerBankDetails.mockResolvedValue(null as any);

    const view = await render(<BankAccountScreen navigation={{ goBack: jest.fn() }} />);

    await waitFor(() => {
      expect(view.getByText("No bank account linked")).toBeTruthy();
    });
    expect(view.getByText("Verification: PENDING")).toBeTruthy();
    expect(view.getByText("Add Bank Account")).toBeTruthy();
    expect(view.queryByText("Action Required")).toBeNull();
  });

  it("shows rejection banner details when verification is not approved", async () => {
    mockedGetPartnerBankDetails.mockResolvedValueOnce({
      maskedAccountNumber: "XXXXXX6789",
      ifscCode: "SBIN0001234",
      verificationStatus: "REJECTED",
      rejectionReason: "Document mismatch",
    } as any);

    const view = await render(<BankAccountScreen navigation={{ goBack: jest.fn() }} />);

    await waitFor(() => {
      expect(view.getByText("Action Required")).toBeTruthy();
    });
    expect(view.getByText("Document mismatch")).toBeTruthy();
  });

  it("shows toast when initial load fails", async () => {
    mockedGetPartnerBankDetails.mockRejectedValue(new Error("Unable to load bank account"));

    const view = await render(<BankAccountScreen navigation={{ goBack: jest.fn() }} />);

    await waitFor(() => {
      expect(view.getByText("No bank account linked")).toBeTruthy();
    });
    expect(mockToast).toHaveBeenCalledWith("Unable to load bank account");
  });

  it("validates and saves bank account details", async () => {
    mockedGetPartnerBankDetails
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce({
        maskedAccountNumber: "XXXXXX1234",
        ifscCode: "HDFC0001234",
        verificationStatus: "PENDING",
      } as any);
    mockedUpdatePartnerBankDetails.mockResolvedValueOnce({
      maskedAccountNumber: "XXXXXX1234",
      ifscCode: "HDFC0001234",
      verificationStatus: "PENDING",
    } as any);

    const view = await render(<BankAccountScreen navigation={{ goBack: jest.fn() }} />);

    await waitFor(() => {
      expect(view.getByText("Save Bank Account")).toBeTruthy();
    });

    fireEvent.changeText(view.getByTestId("bank-account-number-input"), "1234");
    fireEvent.press(view.getByTestId("bank-save-button"));
    expect(mockToast).toHaveBeenCalledWith("Enter a valid bank account number");

    fireEvent.changeText(view.getByTestId("bank-account-number-input"), "123456789");
    fireEvent.changeText(view.getByTestId("bank-ifsc-input"), "hdfc0001234");
    await waitFor(() => {
      expect(view.getByDisplayValue("123456789")).toBeTruthy();
      expect(view.getByDisplayValue("HDFC0001234")).toBeTruthy();
    });
    fireEvent.press(view.getByTestId("bank-save-button"));

    await waitFor(() => {
      expect(mockedUpdatePartnerBankDetails).toHaveBeenCalledWith({
        accountNumber: "123456789",
        ifscCode: "HDFC0001234",
      });
    });
    expect(mockToast).toHaveBeenCalledWith("Bank account updated");
  });

  it("normalizes bank account and ifsc inputs", () => {
    expect(normalizeBankAccountInput("12ab34 56-78901234567890")).toBe("123456789012345678");
    expect(normalizeIfscInput("hdfc-0@00123x")).toBe("HDFC000123X");
  });

  it("validates bank account details and returns normalized payload", () => {
    expect(validateBankAccountDetails("1234", "HDFC0001234")).toEqual({
      error: "Enter a valid bank account number",
      normalizedAccount: "1234",
      normalizedIfsc: "HDFC0001234",
    });

    expect(validateBankAccountDetails("123456789", "bad")).toEqual({
      error: "Enter a valid IFSC code",
      normalizedAccount: "123456789",
      normalizedIfsc: "BAD",
    });

    expect(validateBankAccountDetails("12 34 56 789", " icic0004321 ")).toEqual({
      error: null,
      normalizedAccount: "123456789",
      normalizedIfsc: "ICIC0004321",
    });
  });
});
