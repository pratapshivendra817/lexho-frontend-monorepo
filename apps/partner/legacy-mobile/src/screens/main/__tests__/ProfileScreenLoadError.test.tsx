import React from "react";
import { cleanup, render, waitFor } from "@testing-library/react-native";

import ProfileScreen from "../ProfileScreen";
import { getPartnerProfile } from "../../../services/partnerService";
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

describe("ProfileScreen load failure", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockToast.mockReset();
    mockShowLoader.mockReset();
    mockHideLoader.mockReset();
    (getPartnerProfile as jest.Mock).mockRejectedValue(new Error("Unable to load profile data"));
    (canAttemptOnlineAction as jest.Mock).mockReturnValue(true);
    (enqueueProfileUpdate as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("shows load failure toast when initial profile fetch fails", async () => {
    await render(<ProfileScreen navigation={{ navigate: jest.fn() }} />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Unable to load profile data");
    });
    expect(mockHideLoader).toHaveBeenCalled();
  });
});
