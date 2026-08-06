import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import PaymentHeader from "../payments/PaymentHeader";

describe("PaymentHeader", () => {
  it("renders the title and triggers back navigation", async () => {
    const onBack = jest.fn();
    const view = await render(<PaymentHeader title="Bank Account" onBack={onBack} />);

    expect(view.getByText("Bank Account")).toBeTruthy();

    fireEvent.press(view.getByLabelText("Go back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
