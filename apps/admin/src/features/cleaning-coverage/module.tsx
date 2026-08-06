import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const CleaningCoveragePage = lazy(() => import("./pages/CleaningCoveragePage"));

export const cleaningCoverageRoutes: AdminRouteConfig[] = [
  {
    path: "/cleaning-coverage",
    element: <LazyScreen component={CleaningCoveragePage} />,
  },
];

export const cleaningCoverageNavItems: AdminNavItem[] = [
  {
    path: "/cleaning-coverage",
    label: "Cleaning Coverage",
  },
];

export const cleaningCoverageRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/cleaning-coverage",
    title: "Cleaning Coverage",
    breadcrumb: "catalog / cleaning coverage",
  },
];
