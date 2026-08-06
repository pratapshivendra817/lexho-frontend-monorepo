import React from "react";
import { Platform, Text, TextInput } from "react-native";
import ReactTestRenderer, { act } from "react-test-renderer";

import OnboardingSubmitScreen from "../OnboardingSubmitScreen";
import { getPartnerProfile, submitPartnerOnboarding, uploadPartnerDocuments } from "../../../services/partnerService";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";

const mockShowLoader = jest.fn();
const mockHideLoader = jest.fn();
const mockToast = jest.fn();

jest.mock("../../../context/AppFeedbackContext", () => ({
  useAppFeedback: () => ({ showLoader: mockShowLoader, hideLoader: mockHideLoader, toast: mockToast }),
}));

jest.mock("../../../services/partnerService", () => ({
  getPartnerProfile: jest.fn(),
  submitPartnerOnboarding: jest.fn(),
  uploadPartnerDocuments: jest.fn(),
}));

jest.mock("react-native-image-picker", () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ onChange }: any) =>
    React.createElement(Text, {
      onPress: () => onChange({ type: "set" }, new Date("1994-05-20T00:00:00Z")),
    }, "MockDatePicker");
});

describe("OnboardingSubmitScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPartnerProfile as jest.Mock).mockResolvedValue({});
    (submitPartnerOnboarding as jest.Mock).mockResolvedValue(undefined);
    (uploadPartnerDocuments as jest.Mock).mockImplementation((_payload, onProgress) => {
      onProgress(100);
      return Promise.resolve(undefined);
    });
    (launchCamera as jest.Mock).mockResolvedValue({
      assets: [{ uri: "file://camera.jpg", type: "image/jpeg", fileName: "camera.jpg", fileSize: 1024 }],
    });
    (launchImageLibrary as jest.Mock).mockResolvedValue({
      assets: [{ uri: "file://gallery.jpg", type: "image/png", fileName: "gallery.jpg", fileSize: 1024 }],
    });
  });

  const pressText = async (tree: ReactTestRenderer.ReactTestRenderer, label: string, index = 0) => {
    const node = tree.root.findAllByType(Text).filter((item) => {
      const children = item.props.children;
      const value = Array.isArray(children) ? children.join("") : String(children ?? "");
      return value.includes(label);
    })[index];
    let target: any = node;
    while (target && !target.props?.onPress) {
      target = target.parent;
    }
    await act(async () => {
      target?.props?.onPress?.();
    });
  };

  it("prefills matching profile details without requiring duplicate entry", async () => {
    (getPartnerProfile as jest.Mock).mockResolvedValueOnce({
      fullName: "Sonali Gautam",
      email: "sonali.gautam451@example.com",
      phone: "9876543210",
      city: "Delhi",
      pincode: "110001",
      address: "Dwarka Sector 10",
    });

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<OnboardingSubmitScreen />);
    });

    const values = tree.root.findAllByType(TextInput).map((input) => input.props.value);
    expect(values).toEqual(expect.arrayContaining([
      "Sonali Gautam",
      "sonali.gautam451@example.com",
      "9876543210",
      "Delhi",
      "Dwarka Sector 10, 110001",
    ]));
  });

  it("validates required onboarding fields before submit", async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<OnboardingSubmitScreen />);
    });

    await pressText(tree, "Submit Onboarding");
    expect(mockToast).toHaveBeenCalledWith("Full name, email, phone number are required");
  });

  it("requires gender and service type selections before submitting", async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<OnboardingSubmitScreen />);
    });

    const inputs = tree.root.findAllByType(TextInput);
    await act(async () => {
      inputs[0].props.onChangeText("Riya Sharma");
      inputs[1].props.onChangeText("riya@example.com");
      inputs[2].props.onChangeText("9876543210");
    });

    await pressText(tree, "Submit Onboarding");
    expect(mockToast).toHaveBeenCalledWith("Please select gender");

    await pressText(tree, "Select", 0);
    await pressText(tree, "Female");
    await pressText(tree, "Submit Onboarding");

    expect(mockToast).toHaveBeenCalledWith("Please select service type");
  });

  it("submits onboarding successfully with dropdown and date selections", async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<OnboardingSubmitScreen />);
    });

    const inputs = tree.root.findAllByType(TextInput);
    await act(async () => {
      inputs[0].props.onChangeText("Riya Sharma");
      inputs[1].props.onChangeText("riya@example.com");
      inputs[2].props.onChangeText("9876543210");
      inputs[3].props.onChangeText("Delhi");
      inputs[4].props.onChangeText("Delhi");
      inputs[5].props.onChangeText("Dwarka");
      inputs[6].props.onChangeText("1234567890");
      inputs[7].props.onChangeText("HDFC0001234");
    });

    await pressText(tree, "Select", 0);
    await pressText(tree, "Female");
    await pressText(tree, "DATE");
    await pressText(tree, "MockDatePicker");
    await pressText(tree, "Select", 0);
    await pressText(tree, "Both");
    await pressText(tree, "Submit Onboarding");

    expect(submitPartnerOnboarding).toHaveBeenCalledWith(expect.objectContaining({
      fullName: "Riya Sharma",
      email: "riya@example.com",
      phoneNumber: "9876543210",
      gender: "FEMALE",
      dateOfBirth: "1994-05-20",
      serviceAreas: ["Cleaning", "Cook"],
    }));
    expect(mockShowLoader).toHaveBeenCalled();
    expect(mockHideLoader).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith("Onboarding submitted successfully");
  });

  it("validates required docs and uploads selected documents", async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<OnboardingSubmitScreen />);
    });

    await pressText(tree, "Upload Documents", 1);
    expect(mockToast).toHaveBeenCalledWith("Aadhaar, PAN and selfie are required");

    await pressText(tree, "Camera", 0);
    await pressText(tree, "Camera", 1);
    await pressText(tree, "Camera", 2);
    await pressText(tree, "Upload Documents", 1);

    expect(uploadPartnerDocuments).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith("Documents uploaded successfully");
  });

  it("removes a selected document and surfaces upload failures", async () => {
    (uploadPartnerDocuments as jest.Mock).mockRejectedValueOnce("network down");

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<OnboardingSubmitScreen />);
    });

    await pressText(tree, "Camera", 0);
    expect(tree.root.findAllByType(Text).some((node) => {
      const children = node.props.children;
      const value = Array.isArray(children) ? children.join("") : String(children ?? "");
      return value.includes("camera.jpg");
    })).toBe(true);

    await pressText(tree, "Remove");
    expect(tree.root.findAllByType(Text).some((node) => {
      const children = node.props.children;
      const value = Array.isArray(children) ? children.join("") : String(children ?? "");
      return value.includes("camera.jpg");
    })).toBe(false);

    await pressText(tree, "Camera", 0);
    await pressText(tree, "Camera", 1);
    await pressText(tree, "Camera", 2);
    await pressText(tree, "Upload Documents", 1);

    expect(mockShowLoader).toHaveBeenCalled();
    expect(mockHideLoader).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith("Unable to upload documents");
  });

  it("shows file validation and submit failure errors", async () => {
    (launchCamera as jest.Mock).mockResolvedValueOnce({
      assets: [{ uri: "file://bad.pdf", type: "application/pdf", fileName: "bad.pdf", fileSize: 1024 }],
    });
    (launchImageLibrary as jest.Mock).mockResolvedValueOnce({
      assets: [{ uri: "file://huge.jpg", type: "image/jpeg", fileName: "huge.jpg", fileSize: 6 * 1024 * 1024 }],
    });
    (submitPartnerOnboarding as jest.Mock).mockRejectedValueOnce(new Error("Unable to submit onboarding"));
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, "OS", { configurable: true, get: () => "android" });

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<OnboardingSubmitScreen />);
    });

    await pressText(tree, "Camera", 0);
    expect(mockToast).toHaveBeenCalledWith("Unsupported image. Upload JPG, PNG, or WEBP.");

    await pressText(tree, "Gallery", 0);
    expect(mockToast).toHaveBeenCalledWith("File too large. Maximum allowed size is 5 MB.");

    const inputs = tree.root.findAllByType(TextInput);
    await act(async () => {
      inputs[0].props.onChangeText("Riya Sharma");
      inputs[1].props.onChangeText("riya@example.com");
      inputs[2].props.onChangeText("9876543210");
    });
    await pressText(tree, "Select", 0);
    await pressText(tree, "Male");
    await pressText(tree, "Select", 0);
    await pressText(tree, "Cleaning");
    await pressText(tree, "Submit Onboarding");

    expect(mockToast).toHaveBeenCalledWith("Unable to submit onboarding");
    Object.defineProperty(Platform, "OS", { configurable: true, get: () => originalPlatform });
  });
});
