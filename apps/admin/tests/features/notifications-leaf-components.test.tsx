import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.success,
    error: mocks.error,
  },
}));

import NotificationRow from "@/features/notifications/components/NotificationRow";
import TypeBadge from "@/features/notifications/components/TypeBadge";
import * as notificationComponents from "@/features/notifications/components";

describe("notification leaf components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("renders the notification barrel exports", () => {
    expect(notificationComponents.NotificationStatusBadge).toBeTypeOf("function");
    expect(notificationComponents.NotificationsFiltersBar).toBeTypeOf("function");
    expect(notificationComponents.NotificationStatsCards).toBeTypeOf("function");
  });

  it("renders all type badge variants with the expected labels", () => {
    const { rerender } = render(<TypeBadge type="SMS" />);
    expect(screen.getByText("SMS")).toHaveClass("bg-blue-100", "text-blue-700");

    rerender(<TypeBadge type="EMAIL" />);
    expect(screen.getByText("EMAIL")).toHaveClass("bg-green-100", "text-green-700");

    rerender(<TypeBadge type="PUSH" />);
    expect(screen.getByText("PUSH")).toHaveClass("bg-purple-100", "text-purple-700");
  });

  it("renders status variants and completes the resend flow", async () => {
    const baseNotification = {
      id: 1,
      title: "Promo alert",
      type: "PUSH" as const,
      audience: "Customers",
      date: "2026-07-16 10:00",
    };

    const { rerender } = render(
      <table>
        <tbody>
          <NotificationRow data={{ ...baseNotification, status: "SENT" }} />
        </tbody>
      </table>,
    );

    expect(screen.getByText("SENT")).toHaveClass("bg-green-100", "text-green-700");

    rerender(
      <table>
        <tbody>
          <NotificationRow data={{ ...baseNotification, status: "FAILED" }} />
        </tbody>
      </table>,
    );
    expect(screen.getByText("FAILED")).toHaveClass("bg-red-100", "text-red-700");

    rerender(
      <table>
        <tbody>
          <NotificationRow data={{ ...baseNotification, status: "PENDING" }} />
        </tbody>
      </table>,
    );
    expect(screen.getByText("PENDING")).toHaveClass("bg-yellow-100", "text-yellow-700");

    rerender(
      <table>
        <tbody>
          <NotificationRow data={{ ...baseNotification, status: "QUEUED" }} />
        </tbody>
      </table>,
    );
    expect(screen.getByText("QUEUED")).toHaveClass("px-2", "py-1", "text-xs");

    fireEvent.click(screen.getByRole("button", { name: "Resend" }));
    expect(screen.getByRole("button", { name: "Sending..." })).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(mocks.success).toHaveBeenCalledWith("Resent: Promo alert");
    expect(screen.getByRole("button", { name: "Resend" })).not.toBeDisabled();
  });
});
