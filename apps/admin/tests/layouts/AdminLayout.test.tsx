import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/",
  navigate: vi.fn(),
  clearAccessToken: vi.fn(),
  getAdminRouteMeta: vi.fn(),
  adminNavItems: [
    { path: "/", label: "Dashboard" },
    { path: "/users", label: "Users" },
    { path: "/bookings", label: "Bookings" },
  ],
}));

vi.mock("react-router-dom", () => ({
  Link: ({ to, className, children }: { to: string; className?: string; children: ReactNode }) => (
    <a href={to} data-testid={`nav-link-${to}`} className={className}>
      {children}
    </a>
  ),
  Outlet: () => <div data-testid="layout-outlet">outlet-content</div>,
  useLocation: () => ({ pathname: mocks.pathname }),
  useNavigate: () => mocks.navigate,
}));

vi.mock("react-icons/fi", () => ({
  FiSearch: ({ size }: { size?: number }) => <svg data-testid="search-icon" data-size={String(size ?? "")} />,
}));

vi.mock("@/components/admin", () => ({
  ApiDebugPanel: ({ visible }: { visible?: boolean }) => (
    <div data-testid="api-debug-panel" data-visible={String(Boolean(visible))}>
      api-debug-panel
    </div>
  ),
  ThemeToggle: () => <button type="button">theme-toggle</button>,
}));

vi.mock("@/utils/authSession", () => ({
  clearAccessToken: mocks.clearAccessToken,
}));

vi.mock("@/navigation/adminNavigation", () => ({
  adminNavItems: mocks.adminNavItems,
  getAdminRouteMeta: mocks.getAdminRouteMeta,
}));

import AdminLayout from "@/layouts/AdminLayout";

function renderLayout(pathname = "/", routeMeta = { title: "Dashboard", breadcrumb: "dashboard" }) {
  mocks.pathname = pathname;
  mocks.getAdminRouteMeta.mockReturnValue(routeMeta);
  return render(<AdminLayout />);
}

describe("AdminLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = "/";
    mocks.getAdminRouteMeta.mockReturnValue({ title: "Dashboard", breadcrumb: "dashboard" });
  });

  it("renders the main shell, outlet, theme toggle, api panel, and search input", () => {
    renderLayout("/");

    expect(screen.getByText("LexhoAdmin")).toBeInTheDocument();
    expect(screen.getByText("Home Services Control Center")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("dashboard")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Quick search")).toBeInTheDocument();
    expect(screen.getByTestId("search-icon")).toHaveAttribute("data-size", "14");
    expect(screen.getByRole("button", { name: "theme-toggle" })).toBeInTheDocument();
    expect(screen.getByTestId("layout-outlet")).toBeInTheDocument();
    expect(screen.getByTestId("api-debug-panel")).toHaveAttribute("data-visible", "true");
  });

  it("renders all configured nav items and highlights only the root link on the dashboard route", () => {
    renderLayout("/");

    const dashboardLink = screen.getByTestId("nav-link-/");
    const usersLink = screen.getByTestId("nav-link-/users");

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("href", "/users");
    expect(screen.getByRole("link", { name: "Bookings" })).toHaveAttribute("href", "/bookings");
    expect(dashboardLink.className).toContain("from-blue-600");
    expect(dashboardLink.className).toContain("text-white");
    expect(usersLink.className).toContain("hover:bg-[var(--color-surface-hover)]");
  });

  it("highlights non-root nav items when the current route starts with their path", () => {
    renderLayout("/users/42", { title: "Users", breadcrumb: "users" });

    const usersLink = screen.getByTestId("nav-link-/users");
    const bookingsLink = screen.getByTestId("nav-link-/bookings");

    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByText("users")).toBeInTheDocument();
    expect(usersLink.className).toContain("from-blue-600");
    expect(bookingsLink.className).not.toContain("from-blue-600");
    expect(bookingsLink.className).toContain("hover:text-[var(--color-text)]");
  });

  it("uses the responsive layout containers and shell classes", () => {
    const { container } = renderLayout("/bookings", { title: "Bookings", breadcrumb: "bookings" });

    const outerShell = container.firstElementChild as HTMLElement;
    const aside = container.querySelector("aside");
    const main = container.querySelector("main");

    expect(outerShell.className).toContain("md:pl-72");
    expect(outerShell.className).toContain("min-h-screen");
    expect(aside?.className).toContain("md:fixed");
    expect(aside?.className).toContain("md:w-72");
    expect(main?.className).toContain("md:h-screen");
    expect(main?.className).toContain("md:overflow-y-auto");
  });

  it("clears the auth token and navigates to login on logout", async () => {
    const user = userEvent.setup();
    renderLayout("/users", { title: "Users", breadcrumb: "users" });

    await user.click(screen.getByRole("button", { name: "Logout" }));

    expect(mocks.clearAccessToken).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).toHaveBeenCalledWith("/login", { replace: true });
  });
});
