import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CategoryCard from "@/features/services/components/CategoryCard";
import ServiceTable from "@/features/services/components/ServiceTable";

describe("services components", () => {
  it("renders category card details and manage button", () => {
    render(
      <CategoryCard
        title="Cleaning"
        services={12}
        bookings={48}
        color="border-cyan-500"
        bg="from-cyan-300 to-cyan-500"
        icon={<span data-testid="category-icon">C</span>}
      />,
    );

    expect(screen.getByText("Cleaning")).toBeInTheDocument();
    expect(screen.getByText("12 Services")).toBeInTheDocument();
    expect(screen.getByText("48 Bookings")).toBeInTheDocument();
    expect(screen.getByTestId("category-icon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manage" })).toBeInTheDocument();
  });

  it("renders service table rows with active and inactive statuses", () => {
    render(
      <ServiceTable
        data={[
          {
            name: "Bathroom Clean",
            category: "Cleaning",
            price: 199,
            rating: 4.9,
            bookings: 684,
            status: "Active",
          },
          {
            name: "Non-Veg Cook",
            category: "Cook",
            price: 249,
            rating: 4.6,
            bookings: 120,
            status: "Inactive",
          },
        ]}
      />,
    );

    expect(screen.getByText(/Top Services by Bookings/i)).toBeInTheDocument();
    expect(screen.getByText("Bathroom Clean")).toBeInTheDocument();
    expect(screen.getByText("Non-Veg Cook")).toBeInTheDocument();
    expect(screen.getByText("Cleaning")).toBeInTheDocument();
    expect(screen.getByText("Cook")).toBeInTheDocument();
    expect(screen.getByText("684")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit / Toggle" })).toHaveLength(2);
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("renders table headers and handles an empty data set without crashing", () => {
    render(<ServiceTable data={[]} />);

    expect(screen.getByText("Service Name")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Price")).toBeInTheDocument();
    expect(screen.getByText("Rating")).toBeInTheDocument();
    expect(screen.getByText("Total Bookings")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit / Toggle" })).not.toBeInTheDocument();
  });
});
