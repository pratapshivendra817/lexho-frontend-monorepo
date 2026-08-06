import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { FloatingSOSButton } from "../src/modules/sos/components/FloatingSOSButton";

describe("FloatingSOSButton", () => {
  it("requires long press and confirmation", async () => { const confirmed = jest.fn(); const screen = await render(<FloatingSOSButton onConfirmed={confirmed} />); await act(async () => { fireEvent(screen.getByLabelText("SOS emergency"), "onLongPress"); }); expect(screen.getByText("Send emergency SOS?")).toBeTruthy(); await act(async () => { fireEvent.press(screen.getByText("Send SOS")); }); expect(confirmed).toHaveBeenCalledTimes(1); });
  it("does not render while hidden", async () => { const screen = await render(<FloatingSOSButton visible={false} onConfirmed={jest.fn()} />); expect(screen.queryByLabelText("SOS emergency")).toBeNull(); });
  it("allows confirmation to be cancelled", async () => { const confirmed = jest.fn(); const screen = await render(<FloatingSOSButton onConfirmed={confirmed} />); await act(async () => { fireEvent(screen.getByLabelText("SOS emergency"), "onLongPress"); }); await act(async () => { fireEvent.press(screen.getByText("Cancel")); }); expect(screen.queryByText("Send emergency SOS?")).toBeNull(); expect(confirmed).not.toHaveBeenCalled(); });
});
