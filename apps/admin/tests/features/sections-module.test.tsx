import { describe, expect, it, vi } from "vitest";

vi.mock("@/navigation/LazyScreen", () => ({
  LazyScreen: ({ component }: { component: unknown }) => <div data-testid="lazy-screen">{String(component)}</div>,
}));

vi.mock("@/features/sections/pages/SectionsPage", () => ({
  default: () => <div>sections-page</div>,
}));

import { sectionsNavItems, sectionsRouteMeta, sectionsRoutes } from "@/features/sections";

describe("sections module", () => {
  it("exports the configured route and empty nav items", () => {
    expect(sectionsRoutes).toHaveLength(1);
    expect(sectionsRoutes[0].path).toBe("/sections");
    expect(sectionsRoutes[0].element).toBeTruthy();
    expect(sectionsNavItems).toEqual([]);
  });

  it("exports sections route metadata", () => {
    expect(sectionsRouteMeta).toEqual([
      {
        pathPrefix: "/sections",
        title: "Sections",
        breadcrumb: "sections",
      },
    ]);
  });
});
