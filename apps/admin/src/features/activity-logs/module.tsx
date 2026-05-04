import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const ActivityLogsPage = lazy(() => import("./pages/ActivityLogsPage"));

export const activityLogsRoutes: AdminRouteConfig[] = [
  {
    path: "/activity-logs",
    element: <LazyScreen component={ActivityLogsPage} />,
  },
];

export const activityLogsNavItems: AdminNavItem[] = [
  {
    path: "/activity-logs",
    label: "Activity Logs",
  },
];

export const activityLogsRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/activity-logs",
    title: "Activity Logs",
    breadcrumb: "Audit / Activity Logs",
  },
];
