import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import BasicDetailsScreen from "../BasicDetailsScreen";

jest.mock("../../../components/ui/Input", () => {
  const React = require("react");
  const { TextInput } = require("react-native");
  return function MockInput(props: any) {
    return React.createElement(TextInput, props);
  };
});

jest.mock("../../../components/ui/Button", () => {
  const React = require("react");
  const { Text, TouchableOpacity } = require("react-native");
  return function MockButton({ title, onPress }: any) {
    return React.createElement(
      TouchableOpacity,
      { onPress },
      React.createElement(Text, null, title),
    );
  };
});

describe("BasicDetailsScreen", () => {
  it("renders default values, updates inputs, and navigates next", async () => {
    const navigation = { navigate: jest.fn() };
    const view = await render(<BasicDetailsScreen navigation={navigation} />);

    const nameInput = view.getByPlaceholderText("Full Name");
    const serviceInput = view.getByPlaceholderText("Service (Cook/Cleaning)");

    expect(serviceInput.props.value).toBe("Cook");

    fireEvent.changeText(nameInput, "Riya Sharma");
    fireEvent.changeText(serviceInput, "Cleaning");
    fireEvent.press(view.getByText("Next"));

    expect(navigation.navigate).toHaveBeenCalledWith("DocumentUpload");
  });
});
