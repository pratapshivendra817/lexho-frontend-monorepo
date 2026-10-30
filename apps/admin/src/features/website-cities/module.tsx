import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const WebsiteCitiesPage = lazy(() => import("./pages/WebsiteCitiesPage"));

export const websiteCitiesRoutes: AdminRouteConfig[] = [
  {
    path: "/website/header-navigation/cities",
    element: <LazyScreen component={WebsiteCitiesPage} />,
  },
];

export const websiteCitiesNavItems: AdminNavItem[] = [
  {
    path: "/website/header-navigation/cities",
    label: "Website Cities",
  },
];

export const websiteCitiesRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/website/header-navigation/cities",
    title: "Website Cities",
    breadcrumb: "Website / Header Navigation / Cities",
  },
];
