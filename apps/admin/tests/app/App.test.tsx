import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hasAdminSession: vi.fn(),
  initializeAdminPushNotifications: vi.fn(),
}));

vi.mock("@/utils/authSession", () => ({
  hasAdminSession: mocks.hasAdminSession,
}));

vi.mock("@/services/adminPushNotifications", () => ({
  initializeAdminPushNotifications: mocks.initializeAdminPushNotifications,
}));

vi.mock("@/components/admin", () => ({
  ErrorFeedbackProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="error-feedback-provider">{children}</div>
  ),
}));

vi.mock("@/features/auth", () => ({
  AdminLoginScreen: () => {
    const { useLocation } = require("react-router-dom") as typeof import("react-router-dom");
    const location = useLocation();
    const fromPath = (location.state as { from?: string } | null)?.from ?? "none";

    return (
      <div>
        <div>admin-login-screen</div>
        <div data-testid="login-from">{fromPath}</div>
      </div>
    );
  },
}));

vi.mock("@/layouts/AdminLayout", () => ({
  default: () => {
    const { Outlet } = require("react-router-dom") as typeof import("react-router-dom");
    return (
      <div data-testid="admin-layout">
        admin-layout
        <Outlet />
      </div>
    );
  },
}));

vi.mock("react-hot-toast", () => ({
  Toaster: () => <div data-testid="toaster">toaster</div>,
}));

vi.mock("@/navigation/adminRoutes", () => ({
  adminRoutes: [{ path: "/", label: "Dashboard" }],
}));

vi.mock("@/navigation/routeUtils", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    renderRouteConfig: vi.fn(() => <actual.Route index element={<div data-testid="route-screen">route-screen</div>} />),
  };
});

import App from "@/App";

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.initializeAdminPushNotifications.mockResolvedValue(true);
  });

  it("renders the public login route when no admin session exists", () => {
    mocks.hasAdminSession.mockReturnValue(false);

    renderAt("/login");

    expect(screen.getByTestId("error-feedback-provider")).toBeInTheDocument();
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
    expect(screen.getByText("Admin Login")).toBeInTheDocument();
    expect(screen.getByText("admin-login-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-layout")).not.toBeInTheDocument();
    expect(mocks.initializeAdminPushNotifications).not.toHaveBeenCalled();
  });

  it("redirects protected routes to login and preserves the source path in router state", async () => {
    mocks.hasAdminSession.mockReturnValue(false);

    renderAt("/bookings/123");

    expect(await screen.findByText("Admin Login")).toBeInTheDocument();
    expect(screen.getByTestId("login-from")).toHaveTextContent("/bookings/123");
    expect(screen.queryByText("404 - Page Not Found")).not.toBeInTheDocument();
  });

  it("redirects authenticated users away from login and bootstraps admin push notifications", async () => {
    mocks.hasAdminSession.mockReturnValue(true);

    renderAt("/login");

    expect(await screen.findByTestId("admin-layout")).toBeInTheDocument();
    expect(screen.getByTestId("route-screen")).toBeInTheDocument();
    await waitFor(() =>
      expect(mocks.initializeAdminPushNotifications).toHaveBeenCalledWith({ interactive: false }),
    );
    expect(screen.queryByText("Admin Login")).not.toBeInTheDocument();
  });

  it("renders the not found route for authenticated users when no admin child route matches", async () => {
    mocks.hasAdminSession.mockReturnValue(true);

    renderAt("/missing-page");

    expect(await screen.findByText("404 - Page Not Found")).toBeInTheDocument();
    expect(screen.getByTestId("admin-layout")).toBeInTheDocument();
  });

  it("swallows push bootstrap failures so the admin shell still renders", async () => {
    mocks.hasAdminSession.mockReturnValue(true);
    mocks.initializeAdminPushNotifications.mockRejectedValueOnce(new Error("push setup failed"));

    renderAt("/");

    expect(await screen.findByTestId("admin-layout")).toBeInTheDocument();
    await waitFor(() =>
      expect(mocks.initializeAdminPushNotifications).toHaveBeenCalledWith({ interactive: false }),
    );
    expect(screen.getByTestId("route-screen")).toBeInTheDocument();
  });
});
