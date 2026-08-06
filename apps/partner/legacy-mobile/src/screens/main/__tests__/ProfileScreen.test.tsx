import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ProfileScreen from "../ProfileScreen";
import {
  getPartnerProfile,
  updatePartnerProfile,
  uploadPartnerProfileImage,
} from "../../../services/partnerService";
import { launchImageLibrary } from "react-native-image-picker";
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

describe("ProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPartnerProfile as jest.Mock).mockResolvedValue({
      fullName: "Riya Sharma",
      phone: "9876543210",
      email: "riya@example.com",
      city: "Delhi",
      pincode: "110001",
      address: "Dwarka",
      kycStatus: "APPROVED",
      accountStatus: "ACTIVE",
      profileImageUrl: "https://cdn.example.com/profile.jpg",
    });
    (updatePartnerProfile as jest.Mock).mockResolvedValue(undefined);
    (uploadPartnerProfileImage as jest.Mock).mockResolvedValue({ imageUrl: "https://cdn.example.com/new-profile.jpg" });
    (launchImageLibrary as jest.Mock).mockResolvedValue({ assets: [{ uri: "file://avatar.jpg", type: "image/jpeg", fileName: "avatar.jpg" }] });
    (canAttemptOnlineAction as jest.Mock).mockReturnValue(true);
    (enqueueProfileUpdate as jest.Mock).mockResolvedValue(undefined);
    mockToast.mockReset();
    mockShowLoader.mockReset();
    mockHideLoader.mockReset();
  });

  it("loads profile data and saves profile changes", async () => {
    const navigation = { navigate: jest.fn() };
    const view = await render(<ProfileScreen navigation={navigation} />);

    expect(await view.findByDisplayValue("Riya Sharma")).toBeTruthy();
    expect(view.queryByText("KYC Status: APPROVED")).toBeNull();
    expect(view.queryByText("Account Status: ACTIVE")).toBeNull();
    expect(view.getByLabelText("Email").props.value).toBe("");
    expect(view.getByLabelText("City").props.value).toBe("");
    fireEvent.changeText(view.getByLabelText("Email"), "riya@example.com");
    fireEvent.changeText(view.getByLabelText("City"), "Delhi");
    fireEvent.press(view.getByText("Save Profile"));

    await waitFor(() => {
      expect(updatePartnerProfile).toHaveBeenCalledWith(expect.objectContaining({ fullName: "Riya Sharma" }));
    });

    (canAttemptOnlineAction as jest.Mock).mockReturnValue(false);
    fireEvent.changeText(view.getByLabelText("Email"), "riya@example.com");
    fireEvent.changeText(view.getByLabelText("City"), "Delhi");
    fireEvent.press(view.getByText("Save Profile"));

    await waitFor(() => {
      expect(enqueueProfileUpdate).toHaveBeenCalledWith(expect.objectContaining({ fullName: "Riya Sharma" }));
    });
    expect(mockToast).toHaveBeenCalledWith("Profile update queued. It will sync when internet returns.");
    await waitFor(() => {
      expect(getPartnerProfile).toHaveBeenCalledTimes(3);
    });
    await waitFor(() => {
      expect(mockHideLoader).toHaveBeenCalledTimes(5);
    });

    fireEvent.press(view.getByText("Submit Onboarding"));
    fireEvent.press(view.getByText("KYC Status"));
    fireEvent.press(view.getByText("Bank Verification"));
    fireEvent.press(view.getByText("Ratings & Feedback"));
    fireEvent.press(view.getByText("Shift Settings"));

    expect(navigation.navigate).toHaveBeenCalledWith("OnboardingSubmit");
    expect(navigation.navigate).toHaveBeenCalledWith("KycStatus");
    expect(navigation.navigate).toHaveBeenCalledWith("BankAccount");
    expect(navigation.navigate).toHaveBeenCalledWith("Ratings");
    expect(navigation.navigate).toHaveBeenCalledWith("Shift");
    expect(view.queryByText("Upload Documents")).toBeNull();
    expect(view.queryByText("Performance Dashboard")).toBeNull();
    expect(view.queryByText("Leave Management")).toBeNull();
    expect(view.queryByText("Service Areas")).toBeNull();
    expect(view.queryByText("Warnings")).toBeNull();

    expect(view.queryByText("Dispatch Skills")).toBeNull();
    expect(view.queryByText("Save Skills")).toBeNull();
    fireEvent.press(view.getByTestId("profile-upload-image-button"));
    await waitFor(() => {
      expect(uploadPartnerProfileImage).toHaveBeenCalledWith({ uri: "file://avatar.jpg", type: "image/jpeg", name: "avatar.jpg" });
    });
    await waitFor(() => {
      expect(getPartnerProfile).toHaveBeenCalledTimes(4);
    });

    (launchImageLibrary as jest.Mock).mockResolvedValueOnce({ assets: [] });

    const uploadCallCount = (uploadPartnerProfileImage as jest.Mock).mock.calls.length;
    fireEvent.press(view.getByTestId("profile-upload-image-button"));
    await waitFor(() => {
      expect((uploadPartnerProfileImage as jest.Mock).mock.calls.length).toBe(uploadCallCount);
    });

    (uploadPartnerProfileImage as jest.Mock).mockRejectedValueOnce(new Error("upload failed"));

    fireEvent.press(view.getByTestId("profile-upload-image-button"));
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("upload failed");
    });
  }, 15000);
});
