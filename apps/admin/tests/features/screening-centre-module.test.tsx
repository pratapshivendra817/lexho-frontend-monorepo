import { describe, expect, it, vi } from "vitest";

vi.mock("@/navigation/LazyScreen", () => ({
  LazyScreen: ({ component }: { component: unknown }) => ({
    __lazyScreen: true,
    component,
  }),
}));

describe("screening centre module", () => {
  it("re-exports the feature contract through the barrel", async () => {
    const feature = await import("@/features/screening-centre");

    expect(feature).toHaveProperty("screeningCentreRoutes");
    expect(feature).toHaveProperty("screeningCentreNavItems");
    expect(feature).toHaveProperty("screeningCentreRouteMeta");
    expect(feature.defaultAdminScreeningCentre.name).toBe("");
  });

  it("defines route, nav item, and route metadata", async () => {
    const { screeningCentreRoutes, screeningCentreNavItems, screeningCentreRouteMeta } =
      await import("@/features/screening-centre/module");

    expect(screeningCentreNavItems).toEqual([
      { path: "/screening-centre", label: "Screening Centre" },
    ]);
    expect(screeningCentreRouteMeta).toEqual([
      {
        pathPrefix: "/screening-centre",
        title: "Screening Centre",
        breadcrumb: "Configuration / Screening Centre",
      },
    ]);
    expect(screeningCentreRoutes).toHaveLength(1);
    expect(screeningCentreRoutes[0].path).toBe("/screening-centre");
    expect(screeningCentreRoutes[0].element).toMatchObject({
      type: expect.any(Function),
      props: {
        component: expect.objectContaining({
          $$typeof: Symbol.for("react.lazy"),
        }),
      },
    });
  });
});
