import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react-native";

import ProfileScreen from "../ProfileScreen";
import {
  getPartnerProfile,
  updatePartnerProfile,
} from "../../../services/partnerService";
import { canAttemptOnlineAction, enqueueProfileUpdate } from "../../../services/partnerActionQueueService";

const mockToast = jest.fn();
const mockShowLoader = jest.fn();
const mockHideLoader = jest.fn();

jest.mock("../../../context/AppFeedbackContext", () => ({
  useAppFeedback: () => ({ toast: mockToast, showLoader: mockShowLoader, hideLoader: mockHideLoader }),
}));

jest.mock("../../../services/partnerService", () => ({
  getPartnerProfile: jest.fn(),
  getPartnerSkills: jest.fn(),
  getOrderHistory: jest.fn(),
  updatePartnerProfile: jest.fn(),
  updatePartnerSkills: jest.fn(),
  uploadPartnerProfileImage: jest.fn(),
}));

jest.mock("react-native-image-picker", () => ({
  launchImageLibrary: jest.fn(),
}));

jest.mock("../../../services/partnerActionQueueService", () => ({
  canAttemptOnlineAction: jest.fn(),
  enqueueProfileUpdate: jest.fn(),
}));

describe("ProfileScreen validation", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockToast.mockReset();
    mockShowLoader.mockReset();
    mockHideLoader.mockReset();
    (getPartnerProfile as jest.Mock).mockResolvedValue({
      name: "A",
      mobile: "123",
      email: "bad",
      city: "",
      pincode: "12",
      address: "",
    });
    (updatePartnerProfile as jest.Mock).mockResolvedValue(undefined);
    (canAttemptOnlineAction as jest.Mock).mockReturnValue(true);
    (enqueueProfileUpdate as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("shows validation errors and fallback profile values", async () => {
    const view = await render(<ProfileScreen navigation={{ navigate: jest.fn() }} />);

    expect(await view.findByDisplayValue("A")).toBeTruthy();
    expect(view.getByTestId("profile-avatar-placeholder")).toBeTruthy();
    expect(view.queryByText("KYC Status: Pending")).toBeNull();
    expect(view.queryByText("Dispatch Skills")).toBeNull();

    fireEvent.changeText(view.getByLabelText("Full Name"), "A");
    fireEvent.changeText(view.getByLabelText("Phone"), "123");
    fireEvent.changeText(view.getByLabelText("Email"), "bad");
    fireEvent.changeText(view.getByLabelText("City"), "");
    fireEvent.changeText(view.getByLabelText("Pincode"), "12");
    fireEvent.changeText(view.getByLabelText("Address"), "");
    fireEvent.press(view.getByTestId("profile-save-button"));

    expect(updatePartnerProfile).not.toHaveBeenCalled();
  });
});
