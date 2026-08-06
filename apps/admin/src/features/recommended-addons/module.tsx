import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const RecommendedAddonsPage = lazy(() => import("./pages/RecommendedAddonsPage"));

export const recommendedAddonsRoutes: AdminRouteConfig[] = [
  {
    path: "/recommended-addons",
    children: [
      {
        index: true,
        element: <LazyScreen component={RecommendedAddonsPage} />,
      },
    ],
  },
];

export const recommendedAddonsNavItems: AdminNavItem[] = [
  {
    path: "/recommended-addons",
    label: "Recommended Add-ons",
  },
];

export const recommendedAddonsRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/recommended-addons",
    title: "Recommended Add-ons",
    breadcrumb: "catalog / recommended add-ons",
  },
];
