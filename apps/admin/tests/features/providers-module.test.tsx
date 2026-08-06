import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/navigation/LazyScreen", () => ({
  LazyScreen: ({ component }: { component: unknown }) => <div data-testid="lazy-screen">{String(component)}</div>,
}));

vi.mock("@/features/providers/pages/ProvidersPage", () => ({
  default: () => <div>providers-page</div>,
}));

vi.mock("@/features/providers/pages/ProviderVerificationPage", () => ({
  default: () => <div>provider-verification-page</div>,
}));

import { partnersNavItems, partnersRouteMeta, partnersRoutes } from "@/features/providers/module";

describe("providers module", () => {
  it("exports routes, nav items and route metadata", () => {
    expect(partnersRoutes).toHaveLength(1);
    expect(partnersRoutes[0].path).toBe("/partners");
    expect(partnersRoutes[0].children).toHaveLength(2);
    expect(partnersNavItems).toEqual([{ path: "/partners", label: "Partners" }]);
    expect(partnersRouteMeta).toEqual([
      { pathPrefix: "/partners/", title: "Partner Details", breadcrumb: "Partners / Details" },
      { pathPrefix: "/partners", title: "Partners", breadcrumb: "partners" },
    ]);
  });

  it("renders the lazy list and detail route elements", () => {
    const { rerender } = render(<>{partnersRoutes[0].children?.[0]?.element}</>);
    expect(screen.getByTestId("lazy-screen")).toBeInTheDocument();

    rerender(<>{partnersRoutes[0].children?.[1]?.element}</>);
    expect(screen.getByTestId("lazy-screen")).toBeInTheDocument();
  });
});
