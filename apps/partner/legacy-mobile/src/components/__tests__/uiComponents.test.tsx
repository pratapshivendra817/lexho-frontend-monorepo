import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import Button from "../ui/Button";
import Input from "../ui/Input";

describe("ui components", () => {
  it("renders a button title and handles presses when enabled", async () => {
    const onPress = jest.fn();
    const view = await render(<Button title="Submit" onPress={onPress} loading={false} />);

    expect(view.getByText("Submit")).toBeTruthy();

    fireEvent.press(view.getByText("Submit"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows loading label and disables the button while loading", async () => {
    const onPress = jest.fn();
    const view = await render(<Button title="Submit" onPress={onPress} loading />);
    const label = view.getByText("Please wait...");

    fireEvent.press(label);

    expect(label).toBeTruthy();
    expect(onPress).not.toHaveBeenCalled();
  });

  it("passes text input props, custom styles, and change handlers through", async () => {
    const onChangeText = jest.fn();
    const view = await render(
      <Input
        placeholder="Email"
        value="partner@lexho.com"
        onChangeText={onChangeText}
        style={{ marginTop: 8 }}
      />,
    );

    const input = view.getByDisplayValue("partner@lexho.com");
    fireEvent.changeText(input, "ops@lexho.com");

    expect(view.getByPlaceholderText("Email").props.placeholderTextColor).toBeTruthy();
    expect(input.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ marginTop: 8 })]),
    );
    expect(onChangeText).toHaveBeenCalledWith("ops@lexho.com");
  });
});
