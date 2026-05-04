import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const ReviewsPage = lazy(() => import("./pages/ReviewsPage"));

export const reviewsRoutes: AdminRouteConfig[] = [
  {
    path: "/reviews",
    element: <LazyScreen component={ReviewsPage} />,
  },
];

export const reviewsNavItems: AdminNavItem[] = [
  {
    path: "/reviews",
    label: "Reviews",
  },
];

export const reviewsRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/reviews",
    title: "Ratings & Reviews",
    breadcrumb: "Reviews",
  },
];
