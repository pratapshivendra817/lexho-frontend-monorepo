import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/navigation/LazyScreen", () => ({
  LazyScreen: ({ component }: { component: unknown }) => <div data-testid="lazy-screen">{String(component)}</div>,
}));

vi.mock("@/features/recommended-addons/pages/RecommendedAddonsPage", () => ({
  default: () => <div>recommended-addons-page</div>,
}));

import {
  recommendedAddonsNavItems,
  recommendedAddonsRouteMeta,
  recommendedAddonsRoutes,
} from "@/features/recommended-addons";

describe("recommended-addons module", () => {
  it("exports routes, nav items and metadata", () => {
    expect(recommendedAddonsRoutes).toHaveLength(1);
    expect(recommendedAddonsRoutes[0].path).toBe("/recommended-addons");
    expect(recommendedAddonsRoutes[0].children).toHaveLength(1);
    expect(recommendedAddonsNavItems).toEqual([{ path: "/recommended-addons", label: "Recommended Add-ons" }]);
    expect(recommendedAddonsRouteMeta).toEqual([
      {
        pathPrefix: "/recommended-addons",
        title: "Recommended Add-ons",
        breadcrumb: "catalog / recommended add-ons",
      },
    ]);
  });

  it("renders the lazy route child element", () => {
    render(<>{recommendedAddonsRoutes[0].children?.[0]?.element}</>);
    expect(screen.getByTestId("lazy-screen")).toBeInTheDocument();
  });
});
