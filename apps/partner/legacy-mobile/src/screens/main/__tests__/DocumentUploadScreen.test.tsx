import React from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import DocumentUploadScreen from "../DocumentUploadScreen";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { uploadPartnerDocuments } from "../../../services/partnerService";

const mockToast = jest.fn();
const mockShowLoader = jest.fn();
const mockHideLoader = jest.fn();

jest.mock("react-native-image-picker", () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

jest.mock("../../../services/partnerService", () => ({
  uploadPartnerDocuments: jest.fn(),
}));

jest.mock("../../../context/AppFeedbackContext", () => ({
  useAppFeedback: () => ({
    toast: mockToast,
    showLoader: mockShowLoader,
    hideLoader: mockHideLoader,
  }),
}));

describe("DocumentUploadScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (launchCamera as jest.Mock).mockResolvedValue({
      assets: [{ uri: "file://aadhaar.jpg", type: "image/jpeg", fileName: "aadhaar.jpg", fileSize: 1024 }],
    });
    (launchImageLibrary as jest.Mock).mockResolvedValue({
      assets: [{ uri: "file://pan.png", type: "image/png", fileName: "pan.png", fileSize: 2048 }],
    });
    (uploadPartnerDocuments as jest.Mock).mockImplementation(async (_payload, onProgress) => {
      onProgress(45);
      onProgress(100);
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("validates required documents before upload", async () => {
    const view = await render(<DocumentUploadScreen />);

    fireEvent.press(view.getByText("Upload Documents"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Aadhaar, PAN and selfie are required");
    });
    expect(uploadPartnerDocuments).not.toHaveBeenCalled();
  });

  it("rejects unsupported and oversized files, then uploads successfully", async () => {
    (launchCamera as jest.Mock)
      .mockResolvedValueOnce({
        assets: [{ uri: "file://bad.pdf", type: "application/pdf", fileName: "bad.pdf", fileSize: 1000 }],
      })
      .mockResolvedValueOnce({
        assets: [{ uri: "file://big.jpg", type: "image/jpeg", fileName: "big.jpg", fileSize: 6 * 1024 * 1024 }],
      })
      .mockResolvedValueOnce({
        assets: [{ uri: "file://aadhaar.jpg", type: "image/jpeg", fileName: "aadhaar.jpg", fileSize: 1024 }],
      })
      .mockResolvedValueOnce({
        assets: [{ uri: "file://selfie.jpg", type: "image/jpeg", fileName: "selfie.jpg", fileSize: 1024 }],
      });
    (launchImageLibrary as jest.Mock).mockResolvedValueOnce({
      assets: [{ uri: "file://pan.png", type: "image/png", fileName: "pan.png", fileSize: 2048 }],
    });

    const view = await render(<DocumentUploadScreen />);
    await waitFor(() => {
      expect(view.getAllByText("Camera").length).toBeGreaterThan(0);
    });
    const cameraButtons = view.getAllByText("Camera");
    const galleryButtons = view.getAllByText("Gallery");

    fireEvent.press(cameraButtons[0]);
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Unsupported file. Upload JPG, PNG, or WEBP.");
    });

    fireEvent.press(cameraButtons[0]);
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("File too large. Maximum allowed size is 5 MB.");
    });

    fireEvent.press(cameraButtons[0]);
    fireEvent.press(galleryButtons[1]);
    fireEvent.press(cameraButtons[2]);
    await waitFor(() => {
      expect(view.getByText("aadhaar.jpg")).toBeTruthy();
      expect(view.getByText("pan.png")).toBeTruthy();
      expect(view.getByText("selfie.jpg")).toBeTruthy();
    });
    fireEvent.press(view.getByText("Upload Documents"));

    await waitFor(() => {
      expect(uploadPartnerDocuments).toHaveBeenCalledWith(
        {
          aadhaar: { uri: "file://aadhaar.jpg", type: "image/jpeg", name: "aadhaar.jpg" },
          pan: { uri: "file://pan.png", type: "image/png", name: "pan.png" },
          selfie: { uri: "file://selfie.jpg", type: "image/jpeg", name: "selfie.jpg" },
          certificate: null,
        },
        expect.any(Function),
      );
    });
    expect(mockShowLoader).toHaveBeenCalled();
    expect(mockHideLoader).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith("Documents uploaded successfully");
  });
});
