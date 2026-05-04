import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const ApiReadinessPage = lazy(() => import("./pages/ApiReadinessPage"));

export const apiReadinessRoutes: AdminRouteConfig[] = [
  {
    path: "/api-readiness",
    element: <LazyScreen component={ApiReadinessPage} />,
  },
];

export const apiReadinessNavItems: AdminNavItem[] = [
  {
    path: "/api-readiness",
    label: "API Readiness",
  },
];

export const apiReadinessRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/api-readiness",
    title: "API Readiness",
    breadcrumb: "api-readiness",
  },
];
