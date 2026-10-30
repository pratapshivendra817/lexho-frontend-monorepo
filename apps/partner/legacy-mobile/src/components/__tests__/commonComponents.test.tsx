import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { GlobalLoader } from "../common/GlobalLoader";
import { OfflineBanner } from "../common/OfflineBanner";
import { OrderLifecycleTimeline } from "../common/OrderLifecycleTimeline";
import { ToastMessage } from "../common/ToastMessage";

describe("common components", () => {
  it("renders toast content only when visible and closes on press", async () => {
    const onClose = jest.fn();
    const hiddenView = await render(<ToastMessage visible={false} message="Saved" onClose={onClose} />);
    expect(hiddenView.queryByText("Saved")).toBeNull();

    const view = await render(<ToastMessage visible message="Saved successfully" onClose={onClose} />);
    fireEvent.press(view.getByText("Saved successfully"));

    expect(view.getByText("Saved successfully")).toBeTruthy();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows offline banner only when requested", async () => {
    const hiddenView = await render(<OfflineBanner visible={false} />);
    expect(hiddenView.queryByText("You are offline. Some actions may be delayed.")).toBeNull();

    const view = await render(<OfflineBanner visible />);
    expect(view.getByText("You are offline. Some actions may be delayed.")).toBeTruthy();
  });

  it("shows global loader overlay only when visible", async () => {
    const hiddenView = await render(<GlobalLoader visible={false} />);
    expect(hiddenView.toJSON()).toBeNull();

    const view = await render(<GlobalLoader visible />);
    expect(view.toJSON()).toBeTruthy();
  });

  it("renders audit events with remarks, actors, and timestamp fallbacks", async () => {
    const view = await render(
      <OrderLifecycleTimeline
        order={{
          timeline: [
            {
              id: "1",
              fromStatus: "NEW",
              toStatus: "ACCEPTED",
              remarks: "Accepted quickly",
              actorType: "PARTNER",
              actorId: "42",
              timestamp: "2026-07-06T08:00:00.000Z",
            },
            {
              id: "2",
              fromStatus: "",
              toStatus: "COMPLETED",
              timestamp: "not-a-date",
            },
          ],
        } as any}
      />,
    );

    expect(view.getByText("Order Timeline")).toBeTruthy();
    expect(view.getByText("NEW -> ACCEPTED")).toBeTruthy();
    expect(view.getByText("Accepted quickly")).toBeTruthy();
    expect(view.getByText(/PARTNER #42/)).toBeTruthy();
    expect(view.getByText(/System \| not-a-date/)).toBeTruthy();
    expect(view.getByText("COMPLETED")).toBeTruthy();
  });

  it("renders lifecycle steps with pending timestamps for incomplete orders", async () => {
    const view = await render(
      <OrderLifecycleTimeline
        order={{
          status: "accepted",
          createdAt: "2026-07-06T07:30:00.000Z",
          acceptedAt: "2026-07-06T07:45:00.000Z",
        } as any}
      />,
    );

    expect(view.getByText("Order Created")).toBeTruthy();
    expect(view.getByText("Accepted")).toBeTruthy();
    expect(view.getByText("Arrived")).toBeTruthy();
    expect(view.getByText("In Progress")).toBeTruthy();
    expect(view.getByText("Completed")).toBeTruthy();
    expect(view.getAllByText("Pending")).toHaveLength(2);
  });

  it("renders rejected state and falls back to new status for unknown values", async () => {
    const rejectedView = await render(
      <OrderLifecycleTimeline
        order={{
          status: "REJECTED",
          rejectedAt: "2026-07-06T09:00:00.000Z",
        } as any}
      />,
    );

    expect(rejectedView.getByText("Rejected")).toBeTruthy();

    const unknownStatusView = await render(
      <OrderLifecycleTimeline
        order={{
          status: "mystery",
        } as any}
      />,
    );

    expect(unknownStatusView.getAllByText("Pending").length).toBeGreaterThanOrEqual(3);
  });

  it("uses default new-order fallbacks when no order payload is provided", async () => {
    const view = await render(<OrderLifecycleTimeline order={null} />);

    expect(view.getByText("Order Created")).toBeTruthy();
    expect(view.getAllByText("Pending")).toHaveLength(5);
    expect(view.queryByText("Rejected")).toBeNull();
  });
});
