import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));

export const dashboardRoutes: AdminRouteConfig[] = [
  {
    path: "/",
    element: <LazyScreen component={DashboardPage} />,
  },
];

export const dashboardNavItems: AdminNavItem[] = [
  {
    path: "/",
    label: "Dashboard",
  },
];

export const dashboardRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/",
    title: "Dashboard",
    breadcrumb: "dashboard",
  },
];
