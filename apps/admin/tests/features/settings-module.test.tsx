import { describe, expect, it, vi } from "vitest";

vi.mock("@/navigation/LazyScreen", () => ({
  LazyScreen: ({ component }: { component: unknown }) => ({
    __lazyScreen: true,
    component,
  }),
}));

describe("settings module", () => {
  it("re-exports the module contract through the feature index", async () => {
    const feature = await import("@/features/settings");

    expect(feature).toHaveProperty("settingsRoutes");
    expect(feature).toHaveProperty("settingsNavItems");
    expect(feature).toHaveProperty("settingsRouteMeta");
  });

  it("defines the settings route, hidden nav item list, and route metadata", async () => {
    const { settingsRoutes, settingsNavItems, settingsRouteMeta } = await import("@/features/settings/module");

    expect(settingsNavItems).toEqual([]);
    expect(settingsRouteMeta).toEqual([
      {
        pathPrefix: "/settings",
        title: "Settings",
        breadcrumb: "Configuration / Settings",
      },
    ]);

    expect(settingsRoutes).toHaveLength(1);
    expect(settingsRoutes[0].path).toBe("/settings");
    expect(settingsRoutes[0].element).toMatchObject({
      type: expect.any(Function),
      props: {
        component: expect.objectContaining({
          $$typeof: Symbol.for("react.lazy"),
        }),
      },
    });
  });
});
