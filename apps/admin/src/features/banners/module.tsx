import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const BannersPage = lazy(() => import("./pages/BannersPage"));

export const bannersRoutes: AdminRouteConfig[] = [
  {
    path: "/banners",
    element: <LazyScreen component={BannersPage} />,
  },
];

export const bannersNavItems: AdminNavItem[] = [
  {
    path: "/banners",
    label: "Banners",
  },
];

export const bannersRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/banners",
    title: "Banners",
    breadcrumb: "banners",
  },
];
