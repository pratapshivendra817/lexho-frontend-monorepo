import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const PopularServicesPage = lazy(() => import("./pages/PopularServicesPage"));

export const popularServicesRoutes: AdminRouteConfig[] = [
  {
    path: "/popular-services",
    children: [
      {
        index: true,
        element: <LazyScreen component={PopularServicesPage} />,
      },
    ],
  },
];

export const popularServicesNavItems: AdminNavItem[] = [];

export const popularServicesRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/popular-services",
    title: "Popular Services",
    breadcrumb: "catalog / popular services",
  },
];
