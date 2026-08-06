import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/navigation/LazyScreen", () => ({
  LazyScreen: ({ component }: { component: unknown }) => <div data-testid="lazy-screen">{String(component)}</div>,
}));

vi.mock("@/features/live-dispatch/pages/LiveDispatchMonitorPage", () => ({
  default: () => <div>live-dispatch-page</div>,
}));

import {
  liveDispatchNavItems,
  liveDispatchRouteMeta,
  liveDispatchRoutes,
} from "@/features/live-dispatch";
import { BookingRouteMap } from "@/features/live-dispatch/components";
import { LiveDispatchMonitorPage } from "@/features/live-dispatch/pages";

describe("live-dispatch module", () => {
  it("exports routes, nav items and metadata", () => {
    expect(liveDispatchRoutes).toHaveLength(1);
    expect(liveDispatchRoutes[0].path).toBe("/live-dispatch");
    expect(liveDispatchNavItems).toEqual([{ path: "/live-dispatch", label: "Live Dispatch" }]);
    expect(liveDispatchRouteMeta).toEqual([
      {
        pathPrefix: "/live-dispatch",
        title: "Live Dispatch Monitor",
        breadcrumb: "Operations / Live Dispatch",
      },
    ]);
    expect(typeof BookingRouteMap).toBe("function");
    expect(typeof LiveDispatchMonitorPage).toBe("function");
  });

  it("renders the lazy route element", () => {
    render(<>{liveDispatchRoutes[0].element}</>);
    expect(screen.getByTestId("lazy-screen")).toBeInTheDocument();
  });
});
