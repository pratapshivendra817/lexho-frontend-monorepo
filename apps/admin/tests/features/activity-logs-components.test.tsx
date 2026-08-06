import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  ActivityBadge,
  ActivityFilters,
  ActivityTable,
  ActivityTimeline,
} from "@/features/activity-logs";

const logs = [
  {
    id: "1",
    adminName: "Shivendra",
    role: "Super Admin",
    action: "Deleted user account",
    module: "User",
    timestamp: "2026-04-21 10:30 AM",
  },
  {
    id: "2",
    adminName: "Amit",
    role: "Support",
    action: "Updated booking status",
    module: "Booking",
    timestamp: "2026-04-21 11:00 AM",
  },
  {
    id: "3",
    adminName: "Neha",
    role: "Finance",
    action: "Processed refund",
    module: "Payment",
    timestamp: "2026-04-20 06:45 PM",
  },
  {
    id: "4",
    adminName: "Guest",
    role: "Guest",
    action: "Viewed dashboard",
    module: "Unknown",
    timestamp: "2026-04-22 09:00 AM",
  },
];

describe("activity-logs components", () => {
  it("renders badge variants including unknown modules", () => {
    const { rerender } = render(<ActivityBadge module="User" />);
    expect(screen.getByText("User")).toHaveClass("bg-blue-100", "text-blue-700");

    rerender(<ActivityBadge module="Booking" />);
    expect(screen.getByText("Booking")).toHaveClass("bg-green-100", "text-green-700");

    rerender(<ActivityBadge module="Payment" />);
    expect(screen.getByText("Payment")).toHaveClass("bg-purple-100", "text-purple-700");

    rerender(<ActivityBadge module="Unknown" />);
    expect(screen.getByText("Unknown")).toHaveClass("px-2", "py-1", "text-xs", "rounded-full");
  });

  it("renders filters and updates the selected role", async () => {
    const user = userEvent.setup();
    const setRole = vi.fn();

    render(<ActivityFilters role="" setRole={setRole} />);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("")).toHaveLength(2);

    await user.selectOptions(screen.getByRole("combobox"), "Finance");
    expect(setRole).toHaveBeenCalledWith("Finance");
  });

  it("renders table and timeline views", () => {
    const { rerender } = render(<ActivityTable data={logs as any} />);

    expect(screen.getByText("Deleted user account")).toBeInTheDocument();
    expect(screen.getByText("Viewed dashboard")).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();

    rerender(<ActivityTimeline data={logs as any} />);
    expect(screen.getByText("Processed refund")).toBeInTheDocument();
    expect(screen.getByText("2026-04-22 09:00 AM")).toBeInTheDocument();
  });
});
