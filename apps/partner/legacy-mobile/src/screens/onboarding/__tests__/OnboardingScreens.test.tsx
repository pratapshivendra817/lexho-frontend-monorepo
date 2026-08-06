import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react-native";

import BankDetailsScreen from "../BankDetailsScreen";

describe("onboarding screens", () => {
  afterEach(() => {
    cleanup();
  });

  it("collects bank details and submits to status screen", async () => {
    const navigation = { navigate: jest.fn() };
    const view = await render(<BankDetailsScreen navigation={navigation} />);

    fireEvent.changeText(await view.findByPlaceholderText("Account Number"), "123456789");
    fireEvent.changeText(await view.findByPlaceholderText("IFSC Code"), "HDFC0001234");
    fireEvent.press(await view.findByText("Submit"));

    expect(navigation.navigate).toHaveBeenCalledWith("Status");
  });

});
