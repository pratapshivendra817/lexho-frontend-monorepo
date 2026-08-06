import { describe, expect, it, vi } from "vitest";

vi.mock("@/navigation/LazyScreen", () => ({
  LazyScreen: ({ component: Component }: { component: () => JSX.Element }) => <Component />,
}));

vi.mock("@/features/dashboard/pages/DashboardPage", () => ({
  default: () => <div>dashboard-page-stub</div>,
}));

describe("dashboard module", () => {
  it("exposes route, nav, and route meta config", async () => {
    const feature = await import("@/features/dashboard/module");

    expect(feature.dashboardNavItems).toEqual([{ path: "/", label: "Dashboard" }]);
    expect(feature.dashboardRouteMeta).toEqual([{ pathPrefix: "/", title: "Dashboard", breadcrumb: "dashboard" }]);
    expect(feature.dashboardRoutes).toHaveLength(1);
    expect(feature.dashboardRoutes[0]?.path).toBe("/");
  });

  it("re-exports the page, data, and component contracts", async () => {
    const feature = await import("@/features/dashboard");
    const pages = await import("@/features/dashboard/pages");

    expect(pages.DashboardPage).toBeTypeOf("function");
    expect(feature.stats).toHaveLength(4);
    expect(feature.monthlyData).toHaveLength(6);
    expect(feature.pieData).toHaveLength(4);
    expect(feature.DashboardCard).toBeTypeOf("function");
    expect(feature.RevenueChart).toBeTypeOf("function");
    expect(feature.ServicePieChart).toBeTypeOf("function");
  });
});
