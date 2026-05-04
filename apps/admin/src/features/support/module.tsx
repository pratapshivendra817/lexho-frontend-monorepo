import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const SupportPage = lazy(() => import("./pages/SupportPage"));

export const supportRoutes: AdminRouteConfig[] = [
  {
    path: "/support",
    element: <LazyScreen component={SupportPage} />,
  },
];

export const supportNavItems: AdminNavItem[] = [
  {
    path: "/support",
    label: "Support",
  },
];

export const supportRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/support",
    title: "Support & Complaints",
    breadcrumb: "Support / Tickets",
  },
];
