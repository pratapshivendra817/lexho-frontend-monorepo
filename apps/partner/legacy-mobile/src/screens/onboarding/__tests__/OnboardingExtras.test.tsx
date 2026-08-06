import React from "react";
import { Text, TouchableOpacity } from "react-native";
import ReactTestRenderer, { act } from "react-test-renderer";

import DocumentUploadScreen from "../DocumentUploadScreen";
import StatusScreen from "../StatusScreen";

describe("onboarding extra screens", () => {
  it("renders document upload prompts and pending status", async () => {
    const navigation = { navigate: jest.fn() };
    let uploadTree: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      uploadTree = ReactTestRenderer.create(<DocumentUploadScreen navigation={navigation} />);
    });
    const uploadText = uploadTree!.root.findAllByType(Text).map((node) => {
      const children = node.props.children;
      return Array.isArray(children) ? children.join("") : String(children ?? "");
    }).join(" ");

    expect(uploadText).toContain("Upload Aadhaar");
    expect(uploadText).toContain("Upload Photo");
    expect(uploadText).toContain("Next");

    const uploadButtons = uploadTree!.root.findAllByType(TouchableOpacity);
    await act(async () => {
      uploadButtons[2].props.onPress();
    });
    expect(navigation.navigate).toHaveBeenCalledWith("BankDetails");

    let statusTree: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      statusTree = ReactTestRenderer.create(<StatusScreen />);
    });
    const statusText = statusTree!.root.findAllByType(Text).map((node) => {
      const children = node.props.children;
      return Array.isArray(children) ? children.join("") : String(children ?? "");
    }).join(" ");

    expect(statusText).toContain("Status: PENDING");
    expect(statusText).toContain("Your onboarding is under review.");
  });
});
