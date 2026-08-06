import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const AdminPaymentsPage = lazy(() => import("./pages/AdminPaymentsPage"));

export const adminPaymentsRoutes: AdminRouteConfig[] = [
  {
    path: "/payments",
    element: <LazyScreen component={AdminPaymentsPage} />,
  },
];

export const adminPaymentsNavItems: AdminNavItem[] = [
  {
    path: "/payments",
    label: "Payments",
  },
];

export const adminPaymentsRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/payments",
    title: "Payments",
    breadcrumb: "Finance / Payments",
  },
];
