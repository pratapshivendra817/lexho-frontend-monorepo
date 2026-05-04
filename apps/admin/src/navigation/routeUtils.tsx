import { Route } from "react-router-dom";
import type { ReactElement } from "react";

import type { AdminRouteConfig } from "./types";

export function renderRouteConfig(
  routes: AdminRouteConfig[],
  parentKey = "route",
): ReactElement[] {
  return routes.map((route, index) => {
    const routeIdentity = route.path ?? (route.index ? "index" : "node");
    const routeKey = `${parentKey}-${routeIdentity}-${index}`;

    const children = route.children
      ? renderRouteConfig(route.children, routeKey)
      : undefined;

    if (route.index) {
      return (
        <Route key={routeKey} index element={route.element} />
      );
    }

    return (
      <Route key={routeKey} path={route.path} element={route.element}>
        {children}
      </Route>
    );
  });
}
