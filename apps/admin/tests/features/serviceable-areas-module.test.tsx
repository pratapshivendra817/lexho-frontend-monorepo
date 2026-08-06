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

vi.mock("@/features/serviceable-areas/pages/ServiceableAreaPage", () => ({
  default: () => <div>serviceable-area-page</div>,
}));

vi.mock("@/features/serviceable-areas/pages/GeoManagementPage", () => ({
  default: () => <div>geo-management-page</div>,
}));

import { serviceableAreaNavItems, serviceableAreaRouteMeta, serviceableAreaRoutes } from "@/features/serviceable-areas";

describe("serviceable-areas module", () => {
  it("exports routes, nav items and route metadata", () => {
    expect(serviceableAreaRoutes).toHaveLength(1);
    expect(serviceableAreaRoutes[0].path).toBe("/serviceable-areas");
    expect(serviceableAreaRoutes[0].children).toHaveLength(2);
    expect(serviceableAreaNavItems).toEqual([{ path: "/serviceable-areas", label: "Serviceable Areas" }]);
    expect(serviceableAreaRouteMeta).toEqual([
      {
        pathPrefix: "/serviceable-areas/geo",
        title: "Geo Cities & Zones",
        breadcrumb: "operations / geo cities & zones",
      },
      {
        pathPrefix: "/serviceable-areas",
        title: "Serviceable Areas",
        breadcrumb: "operations / serviceable areas",
      },
    ]);
  });

  it("creates protected lazy children for index and geo routes", () => {
    mocks.hasRequiredRole.mockReturnValue(true);
    const indexRoute = serviceableAreaRoutes[0].children?.[0];
    const geoRoute = serviceableAreaRoutes[0].children?.[1];

    expect(indexRoute?.index).toBe(true);
    expect(indexRoute?.element).toBeTruthy();
    expect(geoRoute?.path).toBe("geo");
    expect(geoRoute?.element).toBeTruthy();
  });

  it("renders the protected route children when access is allowed", () => {
    mocks.hasRequiredRole.mockReturnValue(true);
    const indexRoute = serviceableAreaRoutes[0].children?.[0];
    const geoRoute = serviceableAreaRoutes[0].children?.[1];

    const { rerender } = render(<>{indexRoute?.element}</>);
    expect(screen.getByTestId("lazy-screen")).toBeInTheDocument();

    rerender(<>{geoRoute?.element}</>);
    expect(screen.getByTestId("lazy-screen")).toBeInTheDocument();
  });

  it("redirects when the user lacks access", () => {
    mocks.hasRequiredRole.mockReturnValue(false);
    const indexRoute = serviceableAreaRoutes[0].children?.[0];

    render(<>{indexRoute?.element}</>);
    expect(screen.getByText("navigate:/:true")).toBeInTheDocument();
  });
});
