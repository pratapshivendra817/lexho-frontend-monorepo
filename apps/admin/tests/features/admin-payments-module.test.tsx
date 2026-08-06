import { describe, expect, it, vi } from "vitest";

vi.mock("@/navigation/LazyScreen", () => ({
  LazyScreen: ({ component }: { component: unknown }) => ({
    __lazyScreen: true,
    component,
  }),
}));

describe("admin-payments module", () => {
  it("re-exports the module contract through the feature index", async () => {
    const feature = await import("@/features/admin-payments");

    expect(feature).toHaveProperty("adminPaymentsRoutes");
    expect(feature).toHaveProperty("adminPaymentsNavItems");
    expect(feature).toHaveProperty("adminPaymentsRouteMeta");
  });

  it("defines route, nav items, and route metadata", async () => {
    const { adminPaymentsRoutes, adminPaymentsNavItems, adminPaymentsRouteMeta } = await import("@/features/admin-payments/module");

    expect(adminPaymentsNavItems).toEqual([{ path: "/payments", label: "Payments" }]);
    expect(adminPaymentsRouteMeta).toEqual([
      {
        pathPrefix: "/payments",
        title: "Payments",
        breadcrumb: "Finance / Payments",
      },
    ]);
    expect(adminPaymentsRoutes).toHaveLength(1);
    expect(adminPaymentsRoutes[0].path).toBe("/payments");
    expect(adminPaymentsRoutes[0].element).toMatchObject({
      type: expect.any(Function),
      props: {
        component: expect.objectContaining({
          $$typeof: Symbol.for("react.lazy"),
        }),
      },
    });
  });
});
