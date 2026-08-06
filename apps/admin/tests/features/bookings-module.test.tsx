import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hasRequiredRole: vi.fn(),
}));

vi.mock("@/utils/authSession", () => ({
  hasRequiredRole: mocks.hasRequiredRole,
}));

vi.mock("react-router-dom", () => ({
  Navigate: ({ to, replace }: { to: string; replace?: boolean }) => <div>{`navigate:${to}:${String(replace)}`}</div>,
}));

vi.mock("@/navigation/LazyScreen", () => ({
  LazyScreen: ({ component }: { component: unknown }) => <div data-testid="lazy-screen">{String(component)}</div>,
}));

vi.mock("@/features/bookings/pages/BookingsPage", () => ({
  default: () => <div>bookings-page</div>,
}));

vi.mock("@/features/bookings/pages/BookingDetailsPage", () => ({
  default: () => <div>booking-details-page</div>,
}));

vi.mock("@/features/bookings/pages/EditBookingPage", () => ({
  default: () => <div>edit-booking-page</div>,
}));

import { bookingsNavItems, bookingsRouteMeta, bookingsRoutes } from "@/features/bookings/module";

describe("bookings module", () => {
  it("exports routes, nav items and route metadata", () => {
    expect(bookingsRoutes).toHaveLength(2);
    expect(bookingsRoutes[0].path).toBe("/bookings");
    expect(bookingsRoutes[1].path).toBe("/admin/bookings");
    expect(bookingsRoutes[0].children).toHaveLength(3);
    expect(bookingsNavItems).toEqual([{ path: "/bookings", label: "Bookings" }]);
    expect(bookingsRouteMeta).toHaveLength(6);
  });

  it("renders protected lazy routes when access is allowed", () => {
    mocks.hasRequiredRole.mockReturnValue(true);
    const listRoute = bookingsRoutes[0].children?.[0];
    const editRoute = bookingsRoutes[0].children?.[1];
    const detailsRoute = bookingsRoutes[0].children?.[2];

    const { rerender } = render(<>{listRoute?.element}</>);
    expect(screen.getByTestId("lazy-screen")).toBeInTheDocument();

    rerender(<>{editRoute?.element}</>);
    expect(screen.getByTestId("lazy-screen")).toBeInTheDocument();

    rerender(<>{detailsRoute?.element}</>);
    expect(screen.getByTestId("lazy-screen")).toBeInTheDocument();
  });

  it("redirects to home when bookings access is denied", () => {
    mocks.hasRequiredRole.mockReturnValue(false);
    render(<>{bookingsRoutes[0].children?.[0]?.element}</>);
    expect(screen.getByText("navigate:/:true")).toBeInTheDocument();
  });
});
