import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminThemeProvider, useAdminTheme } from "@/context/AdminThemeProvider";
import {
  DataState,
  DataTable,
  Pagination,
  Skeleton,
  StatCard,
  StatusBadge,
  ThemeToggle,
  TransactionTimeline,
} from "@/components/admin";
import * as adminComponents from "@/components/admin";

describe("admin primitive components", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("re-exports the expected primitives from the admin barrel", () => {
    expect(adminComponents.DataState).toBe(DataState);
    expect(adminComponents.DataTable).toBe(DataTable);
    expect(adminComponents.Pagination).toBe(Pagination);
    expect(adminComponents.ThemeToggle).toBe(ThemeToggle);
    expect(adminComponents.TransactionTimeline).toBe(TransactionTimeline);
    expect(adminComponents.StatusBadge).toBe(StatusBadge);
  });

  it("renders DataState loading, error, retry, empty, and children states", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(
      <DataState isLoading isError={false} isEmpty={false}>
        <div>Loaded child</div>
      </DataState>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    rerender(
      <DataState
        isLoading={false}
        isError
        isEmpty={false}
        errorText="Failed hard"
        onRetry={onRetry}
      >
        <div>Loaded child</div>
      </DataState>,
    );

    expect(screen.getByText("Failed hard")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(
      <DataState isLoading={false} isError isEmpty={false} errorText="Still failed">
        <div>Loaded child</div>
      </DataState>,
    );
    expect(screen.getByText("Still failed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();

    rerender(
      <DataState isLoading={false} isError={false} isEmpty emptyText="Nothing here">
        <div>Loaded child</div>
      </DataState>,
    );

    expect(screen.getByText("Nothing here")).toBeInTheDocument();

    rerender(
      <DataState isLoading={false} isError={false} isEmpty={false}>
        <div>Loaded child</div>
      </DataState>,
    );

    expect(screen.getByText("Loaded child")).toBeInTheDocument();
  });

  it("renders DataTable rows, headers, duplicate display values, and empty bodies", () => {
    const rows = [
      { id: "1", name: "Cleaning", status: "ACTIVE" },
      { id: "2", name: "Cleaning", status: "INACTIVE" },
    ];

    const { rerender } = render(
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        columns={[
          { key: "name", header: "Name", render: (row) => row.name },
          { key: "status", header: "Status", render: (row) => <span>{row.status}</span> },
        ]}
      />,
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getAllByText("Cleaning")).toHaveLength(2);
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    expect(screen.getByText("INACTIVE")).toBeInTheDocument();

    rerender(
      <DataTable
        rows={[]}
        rowKey={(row: { id: string }) => row.id}
        columns={[{ key: "empty", header: "Empty", render: () => "unused" }]}
      />,
    );

    expect(screen.getByText("Empty")).toBeInTheDocument();
    expect(screen.queryByText("unused")).not.toBeInTheDocument();
  });

  it("renders Pagination and handles previous and next boundaries", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const { rerender } = render(
      <Pagination page={1} total={25} limit={10} onPageChange={onPageChange} />,
    );

    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prev" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(<Pagination page={3} total={25} limit={10} onPageChange={onPageChange} />);
    expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prev" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Prev" }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(<Pagination page={4} total={0} limit={10} onPageChange={onPageChange} />);
    expect(screen.getByText("Page 4 of 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("renders StatusBadge fallbacks and supported statuses", () => {
    const { rerender } = render(<StatusBadge status="paid" />);
    expect(screen.getByText("PAID")).toBeInTheDocument();

    rerender(<StatusBadge status="degraded" />);
    expect(screen.getByText("DEGRADED")).toHaveClass("text-amber-200");

    rerender(<StatusBadge status="down" />);
    expect(screen.getByText("DOWN")).toHaveClass("text-red-200");

    rerender(<StatusBadge status="" />);
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();

    rerender(<StatusBadge status={undefined} />);
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();

    rerender(<StatusBadge status="custom-state" />);
    expect(screen.getByText("CUSTOM-STATE")).toBeInTheDocument();
  });

  it("renders StatCard with and without subtitle plus Skeleton default and custom classes", () => {
    const { rerender } = render(<StatCard title="Revenue" value="INR 1000" subtitle="Live" />);

    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("INR 1000")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();

    rerender(<StatCard title="Users" value="42" />);
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.queryByText("Live")).not.toBeInTheDocument();

    const { container, rerender: rerenderSkeleton } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass("h-4", "w-full");

    rerenderSkeleton(<Skeleton className="h-10 w-10 rounded-full" />);
    expect(container.firstChild).toHaveClass("h-10", "w-10", "rounded-full");
  });

  it("renders TransactionTimeline empty state, items, descriptions, and time fallbacks", () => {
    const { rerender } = render(<TransactionTimeline items={[]} />);
    expect(screen.getByText("No transaction history found.")).toBeInTheDocument();

    rerender(
      <TransactionTimeline
        items={[
          {
            id: "1",
            title: "Paid",
            status: "PAID",
            at: "2026-07-15T10:00:00.000Z",
            description: "Customer paid online",
          },
          {
            id: "2",
            title: "Refund Pending",
            status: "PENDING",
          },
        ]}
      />,
    );

    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getByText("Customer paid online")).toBeInTheDocument();
    expect(screen.getByText("Refund Pending")).toBeInTheDocument();
    expect(screen.getByText("Time unavailable")).toBeInTheDocument();
    expect(screen.getByText("PAID")).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });

  it("toggles theme, persists it, and respects saved and system defaults", async () => {
    const user = userEvent.setup();
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal("matchMedia", matchMedia);

    render(
      <AdminThemeProvider>
        <ThemeToggle />
      </AdminThemeProvider>,
    );

    expect(screen.getByRole("button", { name: "Toggle theme" })).toHaveTextContent("Light");
    expect(localStorage.getItem("lexho_admin_theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await user.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(screen.getByRole("button", { name: "Toggle theme" })).toHaveTextContent("Dark");
    expect(localStorage.getItem("lexho_admin_theme")).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("uses the saved theme and throws when the theme hook is used outside the provider", () => {
    localStorage.setItem("lexho_admin_theme", "light");
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));

    render(
      <AdminThemeProvider>
        <ThemeToggle />
      </AdminThemeProvider>,
    );

    expect(screen.getByRole("button", { name: "Toggle theme" })).toHaveTextContent("Dark");

    const BrokenConsumer = () => {
      useAdminTheme();
      return null;
    };

    expect(() => render(<BrokenConsumer />)).toThrow("useAdminTheme must be used within AdminThemeProvider");
  });
});
