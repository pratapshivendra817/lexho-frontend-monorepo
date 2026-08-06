import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

type MockRouteProps = {
  path?: string;
  index?: boolean;
  element?: ReactNode;
  children?: ReactNode;
};

vi.mock("react-router-dom", () => ({
  Route: ({ path, index, element, children }: MockRouteProps) => ({
    __mockRoute: true,
    path,
    index: Boolean(index),
    element,
    children,
  }),
}));

import { renderRouteConfig } from "@/navigation/routeUtils";
import type { AdminRouteConfig } from "@/navigation/types";

describe("renderRouteConfig", () => {
  it("renders index routes without a path and uses the default parent key", () => {
    const routes: AdminRouteConfig[] = [{ index: true, element: "dashboard" }];

    const rendered = renderRouteConfig(routes);

    expect(rendered).toHaveLength(1);
    expect(rendered[0].key).toBe("route-index-0");
    expect(rendered[0].props).toMatchObject({
      index: true,
      element: "dashboard",
    });
    expect(rendered[0].props.path).toBeUndefined();
  });

  it("renders path routes and recurses into children with stable nested keys", () => {
    const routes: AdminRouteConfig[] = [
      {
        path: "/services",
        element: "services-layout",
        children: [
          { index: true, element: "services-home" },
          { path: ":serviceId", element: "service-detail" },
        ],
      },
    ];

    const rendered = renderRouteConfig(routes, "admin");
    const parent = rendered[0];
    const children = parent.props.children as ReturnType<typeof renderRouteConfig>;

    expect(parent.key).toBe("admin-/services-0");
    expect(parent.props.path).toBe("/services");
    expect(parent.props.element).toBe("services-layout");
    expect(children).toHaveLength(2);
    expect(children[0].key).toBe("admin-/services-0-index-0");
    expect(children[0].props).toMatchObject({ index: true, element: "services-home" });
    expect(children[1].key).toBe("admin-/services-0-:serviceId-1");
    expect(children[1].props).toMatchObject({ path: ":serviceId", element: "service-detail" });
  });

  it("uses node as the fallback identity for non-index routes without a path", () => {
    const rendered = renderRouteConfig([{ element: "pathless-layout" }], "layout");

    expect(rendered[0].key).toBe("layout-node-0");
    expect(rendered[0].props).toMatchObject({
      path: undefined,
      element: "pathless-layout",
    });
  });

  it("returns an empty array for empty route collections", () => {
    expect(renderRouteConfig([])).toEqual([]);
  });
});
