import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BookingActionsMenu } from "@/features/bookings/components/BookingActionsMenu";
import { BookingsFiltersBar } from "@/features/bookings/components/BookingsFiltersBar";

describe("bookings components", () => {
  it("wires filters bar callbacks and resets/exports", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    const onStatusChange = vi.fn();
    const onServiceTypeChange = vi.fn();
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();
    const onSortByChange = vi.fn();
    const onSortDirChange = vi.fn();
    const onExport = vi.fn();
    const onReset = vi.fn();

    render(
      <BookingsFiltersBar
        search=""
        status=""
        serviceType=""
        startDate=""
        endDate=""
        sortBy="createdAt"
        sortDir="desc"
        onSearchChange={onSearchChange}
        onStatusChange={onStatusChange}
        onServiceTypeChange={onServiceTypeChange}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onSortByChange={onSortByChange}
        onSortDirChange={onSortDirChange}
        onExport={onExport}
        onReset={onReset}
      />,
    );

    await user.type(screen.getByPlaceholderText("Search booking/customer"), "ul");
    expect(onSearchChange).toHaveBeenCalled();

    await user.selectOptions(screen.getByDisplayValue("All status"), "PENDING");
    expect(onStatusChange).toHaveBeenCalledWith("PENDING");

    await user.selectOptions(screen.getByDisplayValue("All services"), "COOK");
    expect(onServiceTypeChange).toHaveBeenCalledWith("COOK");

    await user.selectOptions(screen.getByDisplayValue("Sort by Created"), "amount");
    expect(onSortByChange).toHaveBeenCalledWith("amount");

    await user.selectOptions(screen.getByDisplayValue("Descending"), "asc");
    expect(onSortDirChange).toHaveBeenCalledWith("asc");

    await user.click(screen.getByRole("button", { name: /Reset/i }));
    await user.click(screen.getByRole("button", { name: /Export CSV/i }));
    expect(onReset).toHaveBeenCalled();
    expect(onExport).toHaveBeenCalled();
  });

  it("runs all booking action menu callbacks and busy state", async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    const onEdit = vi.fn();
    const onCancel = vi.fn();
    const onDelete = vi.fn();
    const booking = {
      id: "bk-1",
      customerName: "Aman",
      service: "Cleaning",
      serviceType: "CLEANING" as const,
      partnerName: "Ravi",
      bookingDate: "2026-05-01",
      amount: 999,
      status: "PENDING" as const,
    };

    const { rerender } = render(
      <BookingActionsMenu
        booking={booking}
        onView={onView}
        onEdit={onEdit}
        onCancel={onCancel}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByText("View details"));
    await user.click(screen.getByText("Edit booking"));
    await user.click(screen.getByText("Cancel booking"));
    await user.click(screen.getByText("Delete booking"));

    expect(onView).toHaveBeenCalledWith(booking);
    expect(onEdit).toHaveBeenCalledWith(booking);
    expect(onCancel).toHaveBeenCalledWith(booking);
    expect(onDelete).toHaveBeenCalledWith(booking);

    rerender(
      <BookingActionsMenu
        booking={booking}
        onView={onView}
        onEdit={onEdit}
        onCancel={onCancel}
        onDelete={onDelete}
        isBusy
      />,
    );
    expect(document.querySelector(".animate-spin")).not.toBeNull();
  });
});
