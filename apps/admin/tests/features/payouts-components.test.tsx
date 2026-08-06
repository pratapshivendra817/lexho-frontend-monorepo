import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PayoutTable, StatCard } from "@/features/payouts";

const payoutRows = [
  {
    id: "p1",
    partnerName: "Partner One",
    providerName: "Fallback Name",
    earnings: 1000,
    platformFee: 100,
    finalPayout: 900,
    status: "PENDING",
  },
  {
    id: "p2",
    providerName: "Provider Two",
    earnings: 2000,
    platformFee: 200,
    finalPayout: 1800,
    status: "SUCCESS",
  },
  {
    id: "p3",
    providerName: "Provider Three",
    earnings: 3000,
    platformFee: 300,
    finalPayout: 2700,
    status: "FAILED",
  },
  {
    id: "p4",
    providerName: "Provider Four",
    earnings: 4000,
    platformFee: 400,
    finalPayout: 3600,
    status: "UNKNOWN",
  },
];

describe("payout components", () => {
  it("renders stat cards", () => {
    render(<StatCard title="Pending Payout" value="INR 900" />);

    expect(screen.getByText("Pending Payout")).toBeInTheDocument();
    expect(screen.getByText("INR 900")).toBeInTheDocument();
  });

  it("renders payout rows and all status badge variants", () => {
    render(<PayoutTable data={payoutRows as any} />);

    expect(screen.getByText("Partner One")).toBeInTheDocument();
    expect(screen.getByText("Provider Two")).toBeInTheDocument();
    expect(screen.getByText("Provider Four")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Release" })).toHaveLength(4);
    expect(screen.getAllByRole("button", { name: "Details" })).toHaveLength(4);

    expect(screen.getByText("PENDING")).toHaveClass("bg-yellow-500/20", "text-yellow-400");
    expect(screen.getByText("SUCCESS")).toHaveClass("bg-green-500/20", "text-green-400");
    expect(screen.getByText("FAILED")).toHaveClass("bg-red-500/20", "text-red-400");
    expect(screen.getByText("UNKNOWN")).toHaveClass("px-2", "py-1", "text-xs", "rounded-full");
  });
});
