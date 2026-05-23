import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const PayoutsPage = lazy(() => import("./pages/PayoutsPage"));

export const payoutsRoutes: AdminRouteConfig[] = [
  {
    path: "/payouts",
    element: <LazyScreen component={PayoutsPage} />,
  },
];

export const payoutsNavItems: AdminNavItem[] = [
  {
    path: "/payouts",
    label: "Payouts",
  },
];

export const payoutsRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/payouts",
    title: "Partner Payouts",
    breadcrumb: "Finance / Payouts",
  },
];


