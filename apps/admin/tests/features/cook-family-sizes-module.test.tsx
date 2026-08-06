import { describe, expect, it, vi } from "vitest";

vi.mock("@/navigation/LazyScreen", () => ({
  LazyScreen: ({ component }: { component: unknown }) => <div data-testid="lazy-screen">{String(component)}</div>,
}));

vi.mock("@/features/cook-family-sizes/pages/CookFamilySizesPage", () => ({
  default: () => <div>cook-family-sizes-page</div>,
}));

import {
  cookFamilySizesNavItems,
  cookFamilySizesRouteMeta,
  cookFamilySizesRoutes,
} from "@/features/cook-family-sizes";

describe("cook-family-sizes module", () => {
  it("exports the configured route, nav item, and route metadata", () => {
    expect(cookFamilySizesRoutes).toHaveLength(1);
    expect(cookFamilySizesRoutes[0].path).toBe("/cook-family-sizes");
    expect(cookFamilySizesRoutes[0].element).toBeTruthy();

    expect(cookFamilySizesNavItems).toEqual([
      {
        path: "/cook-family-sizes",
        label: "Cook Family Sizes",
      },
    ]);

    expect(cookFamilySizesRouteMeta).toEqual([
      {
        pathPrefix: "/cook-family-sizes",
        title: "Cook Family Sizes",
        breadcrumb: "catalog / cook family sizes",
      },
    ]);
  });
});
