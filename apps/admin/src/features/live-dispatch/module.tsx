import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const LiveDispatchMonitorPage = lazy(() => import("./pages/LiveDispatchMonitorPage"));

export const liveDispatchRoutes: AdminRouteConfig[] = [
  {
    path: "/live-dispatch",
    element: <LazyScreen component={LiveDispatchMonitorPage} />,
  },
];

export const liveDispatchNavItems: AdminNavItem[] = [
  {
    path: "/live-dispatch",
    label: "Live Dispatch",
  },
];

export const liveDispatchRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/live-dispatch",
    title: "Live Dispatch Monitor",
    breadcrumb: "Operations / Live Dispatch",
  },
];
