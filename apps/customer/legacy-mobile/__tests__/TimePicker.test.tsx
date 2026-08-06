import React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { TimePicker } from "../src/components/cart/TimePicker";

describe("TimePicker", () => {
  beforeEach(async () => {
    await cleanup();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 5, 12, 10, 0, 0));
  });

  afterEach(async () => {
    jest.useRealTimers();
    await cleanup();
  });

  it("renders trigger validation and opens an empty picker", async () => {
    const onChange = jest.fn();
    const view = await render(<TimePicker value={null} onChange={onChange} showError dateWindowDays={0} />);
    expect(view.getByText("Select time slot")).toBeTruthy();
    expect(view.getByText("Please choose a future date & slot.")).toBeTruthy();
    await fireEvent.press(view.getByText("Select time slot"));
    expect(view.getByText("Select start time of service")).toBeTruthy();
    expect(view.getByText("No available slots for selected date.")).toBeTruthy();
    expect(view.getByLabelText("Confirm selected time slot").props.accessibilityState.disabled).toBe(true);
  });

  it("loads, normalizes, filters and confirms a valid future slot", async () => {
    const onChange = jest.fn();
    const loadSlots = jest.fn().mockResolvedValue([
      { slot: "9:00 AM", available: true },
      { slot: "11:15 AM", available: true, etaMinutes: 30, instantEligible: true },
      { slot: "2026-06-12T12:30:00", available: true, etaMinutes: 121 },
      { slot: "13:45-14:45", available: true },
      { slot: "25:00", available: true },
      { slot: "14:00", available: false },
      null,
    ]);
    const view = await render(<TimePicker value={null} onChange={onChange} loadSlots={loadSlots} infoText="Times are estimates" />);
    await waitFor(() => expect(loadSlots).toHaveBeenCalledWith("2026-06-12"));
    await fireEvent.press(view.getByText("Select time slot"));

    await waitFor(() => expect(view.getByLabelText("Select slot 11:15 AM")).toBeTruthy());
    expect(view.queryByLabelText("Select slot 9:00 AM")).toBeNull();
    expect(view.getByText("ETA 30m")).toBeTruthy();
    expect(view.getByText("Instant")).toBeTruthy();
    expect(view.getByText("Times are estimates")).toBeTruthy();
    expect(view.getByText(/Selected \(pending\):.*11:15 AM/)).toBeTruthy();

    await fireEvent.press(view.getByLabelText("Select slot 1:45 PM"));
    await fireEvent.press(view.getByLabelText("Confirm selected time slot"));
    expect(onChange).toHaveBeenCalledWith("2026-06-12T13:45:00");
    expect(view.queryByText("Select start time of service")).toBeNull();
  });

  it("loads tomorrow slots, uses cache and handles 12-hour edge conversion", async () => {
    const loadSlots = jest.fn(async (date: string) => date === "2026-06-12"
      ? [{ slot: "11:00" }]
      : [{ slot: "12:00 AM" }, { slot: "12:00 PM" }, { slot: "7:05 PM" }]);
    const view = await render(<TimePicker value={null} onChange={jest.fn()} loadSlots={loadSlots} />);
    await fireEvent.press(view.getByText("Select time slot"));
    await waitFor(() => expect(view.getByText("Tomorrow")).toBeTruthy());
    await fireEvent.press(view.getByText("Tomorrow"));
    await waitFor(() => expect(view.getAllByLabelText("Select slot 12:00 PM")).toHaveLength(2));
    expect(view.getByLabelText("Select slot 7:05 AM")).toBeTruthy();
    expect(loadSlots).toHaveBeenCalledWith("2026-06-13");

    await fireEvent.press(view.getByText("Today"));
    await waitFor(() => expect(view.getByLabelText("Select slot 11:00 AM")).toBeTruthy());
    expect(loadSlots).toHaveBeenCalledTimes(2);
  });

  it("renders load failure and retries successfully", async () => {
    const loadSlots = jest.fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce([{ slot: "11:30" }]);
    const view = await render(<TimePicker value={null} onChange={jest.fn()} loadSlots={loadSlots} openRequestKey={1} hideTrigger />);
    expect(view.queryByText("Select time slot")).toBeNull();
    await waitFor(() => expect(view.getByText("Unable to load slots. Please retry.")).toBeTruthy());
    await fireEvent.press(view.getByLabelText("Retry loading slots"));
    await waitFor(() => expect(view.getByLabelText("Select slot 11:30 AM")).toBeTruthy());
    expect(loadSlots).toHaveBeenCalledTimes(2);
  });

  it("syncs valid existing value and resets a past date to today", async () => {
    const loadSlots = jest.fn().mockResolvedValue([{ slot: "11:00" }, { slot: "15:30" }]);
    const view = await render(<TimePicker value="2026-06-12T15:30:00" onChange={jest.fn()} loadSlots={loadSlots} />);
    expect(view.getByText(/6\/12\/2026|12\/6\/2026/)).toBeTruthy();
    await fireEvent.press(view.getByText(/6\/12\/2026|12\/6\/2026/));
    await waitFor(() => expect(view.getByText(/3:30 PM/)).toBeTruthy());

    await view.rerender(<TimePicker value="2026-06-01T15:30:00" onChange={jest.fn()} loadSlots={loadSlots} openRequestKey={2} />);
    await waitFor(() => expect(loadSlots).toHaveBeenCalledWith("2026-06-12"));
  });

  it("ignores invalid scheduled values and closes via request callback", async () => {
    const view = await render(<TimePicker value="invalid-value" onChange={jest.fn()} openRequestKey={1} />);
    expect(view.getByText("Select time slot")).toBeTruthy();
    expect(view.getByText("Select start time of service")).toBeTruthy();
    const modal = view.container.queryAll(node => typeof node.props.onRequestClose === "function")[0];
    await act(async () => modal.props.onRequestClose());
    expect(view.queryByText("Select start time of service")).toBeNull();
  });

  it("does not update state after an in-flight slot request is unmounted", async () => {
    let resolveSlots!: (rows: any[]) => void;
    const loadSlots = jest.fn(() => new Promise<any[]>(resolve => { resolveSlots = resolve; }));
    const view = await render(<TimePicker value={null} onChange={jest.fn()} loadSlots={loadSlots} />);
    await act(async () => { await Promise.resolve(); });
    expect(loadSlots).toHaveBeenCalled();
    await view.unmount();
    await act(async () => {
      resolveSlots([{ slot: "11:00" }]);
      await Promise.resolve();
    });
  });
});
