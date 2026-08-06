import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const SectionsPage = lazy(() => import("./pages/SectionsPage"));

export const sectionsRoutes: AdminRouteConfig[] = [
  {
    path: "/sections",
    element: <LazyScreen component={SectionsPage} />,
  },
];

export const sectionsNavItems: AdminNavItem[] = [];

export const sectionsRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/sections",
    title: "Sections",
    breadcrumb: "sections",
  },
];
