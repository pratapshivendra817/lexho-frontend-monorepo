import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import StatsCards from "@/features/support/components/StatsCards";
import StatusBadge from "@/features/support/components/StatusBadge";
import TicketDetail from "@/features/support/components/TicketDetail";
import TicketTable from "@/features/support/components/TicketTable";

describe("support components", () => {
  const tickets = [
    {
      id: "1",
      ticketId: "TK-1",
      requesterType: "CUSTOMER",
      userId: "user-1",
      subject: "Payment failed",
      status: "OPEN" as const,
      categoryId: "PAYMENT",
      bookingId: "BK-1",
      priority: "HIGH" as const,
      createdAt: "2026-07-16T09:00:00Z",
      messages: [{ sender: "CUSTOMER" as const, message: "Need help", createdAt: "2026-07-16T09:05:00Z" }],
    },
    {
      id: "2",
      requesterType: "PARTNER",
      subject: "Refund delayed",
      status: "IN_PROGRESS" as const,
      categoryId: "PAYOUT",
      rawCategoryId: "PARTNER:PAYOUT",
      priority: "MEDIUM" as const,
      createdAt: "",
      messages: [{ sender: "ADMIN" as const, message: "Checking this", createdAt: "" }],
    },
    {
      id: "3",
      subject: "Issue resolved",
      status: "RESOLVED" as const,
      priority: "LOW" as const,
      createdAt: "2026-07-15T12:00:00Z",
      messages: [{ sender: "SUPPORT" as const, message: "Resolved", createdAt: "2026-07-15T12:10:00Z" }],
    },
    {
      id: "4",
      subject: "Closed ticket",
      status: "CLOSED" as const,
      priority: "LOW" as const,
      createdAt: "2026-07-14T12:00:00Z",
      messages: [],
    },
  ];

  it("renders stats and badge variants", () => {
    render(
      <>
        <StatsCards tickets={tickets as any} />
        <StatusBadge status="OPEN" />
        <StatusBadge status="IN_PROGRESS" />
        <StatusBadge status="RESOLVED" />
        <StatusBadge status="CLOSED" />
      </>,
    );

    expect(screen.getByText("Open Tickets")).toBeInTheDocument();
    expect(screen.getAllByText("1")).toHaveLength(4);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Resolved")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(screen.getByText("OPEN")).toHaveClass("bg-red-100", "text-red-600");
    expect(screen.getByText("IN_PROGRESS")).toHaveClass("bg-yellow-100", "text-yellow-600");
    expect(screen.getByText("RESOLVED")).toHaveClass("bg-green-100", "text-green-600");
    expect(screen.getByText("CLOSED")).toHaveClass("bg-gray-200", "text-gray-700");
  });

  it("renders the ticket table with richer metadata, selection, and fallback values", () => {
    const onSelect = vi.fn();
    render(<TicketTable tickets={tickets as any} onSelect={onSelect} selectedId="2" />);

    expect(screen.getByText("TK-1")).toBeInTheDocument();
    expect(screen.getByText("user-1")).toBeInTheDocument();
    expect(screen.getByText("CUSTOMER")).toHaveClass("text-fuchsia-200");
    expect(screen.getByText("Booking: BK-1")).toBeInTheDocument();
    expect(screen.getByText("PAYOUT")).toHaveClass("text-emerald-200");
    expect(screen.getByText("Raw: PARTNER:PAYOUT")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toHaveClass("text-orange-200");
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);

    const selectedRow = screen.getByText("Refund delayed").closest("tr");
    expect(selectedRow).toHaveClass("bg-purple-900/30");

    fireEvent.click(screen.getByText("Payment failed"));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "1", subject: "Payment failed" }));
  });

  it("renders empty and populated ticket details, metadata, blocks blank replies, and sends valid replies", () => {
    const onStatusChange = vi.fn();
    const onReply = vi.fn();

    const { rerender } = render(<TicketDetail ticket={null} onStatusChange={onStatusChange} onReply={onReply} />);

    expect(screen.getByText("Select a ticket")).toBeInTheDocument();

    rerender(
      <TicketDetail
        ticket={{
          id: "2",
          ticketId: "TK-2",
          userId: "",
          requesterType: "PARTNER",
          subject: "Refund delayed",
          status: "IN_PROGRESS",
          categoryId: "PAYOUT",
          bookingId: "BK-9",
          priority: "MEDIUM",
          messages: [
            { sender: "CUSTOMER", message: "Any update?", createdAt: "2026-07-16T10:00:00Z" },
            { sender: "ADMIN", message: "Working on it", createdAt: "" },
            { sender: "SUPPORT", message: "Escalated", createdAt: "2026-07-16T10:10:00Z" },
          ],
        } as any}
        onStatusChange={onStatusChange}
        onReply={onReply}
      />,
    );

    expect(screen.getByText("Refund delayed")).toBeInTheDocument();
    expect(screen.getByText("Ticket: TK-2")).toBeInTheDocument();
    expect(screen.getByText(/^User:\s*-/)).toBeInTheDocument();
    expect(screen.getByText("Category: PAYOUT")).toBeInTheDocument();
    expect(screen.getByText("Booking: BK-9")).toBeInTheDocument();
    expect(screen.getByText("PARTNER")).toHaveClass("text-cyan-200");
    expect(screen.getByText("MEDIUM")).toHaveClass("text-yellow-200");
    expect(screen.getAllByText("PAYOUT")[0]).toHaveClass("text-emerald-200");
    expect(screen.getByText("SUPPORT")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(screen.getByRole("button", { name: "In Progress" }));
    fireEvent.click(screen.getByRole("button", { name: "Resolved" }));
    fireEvent.click(screen.getByRole("button", { name: "Closed" }));
    expect(onStatusChange).toHaveBeenCalledWith("OPEN");
    expect(onStatusChange).toHaveBeenCalledWith("IN_PROGRESS");
    expect(onStatusChange).toHaveBeenCalledWith("RESOLVED");
    expect(onStatusChange).toHaveBeenCalledWith("CLOSED");

    fireEvent.change(screen.getByPlaceholderText("Type reply..."), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onReply).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText("Type reply..."), { target: { value: "Please retry payment" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onReply).toHaveBeenCalledWith("Please retry payment");
    expect(screen.getByDisplayValue("")).toBeInTheDocument();
  });
});
