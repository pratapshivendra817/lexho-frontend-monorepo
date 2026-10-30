/* eslint-disable react-refresh/only-export-components */
import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const ScreeningCentrePage = lazy(() => import("./pages/ScreeningCentrePage"));

export const screeningCentreRoutes: AdminRouteConfig[] = [
  {
    path: "/screening-centre",
    element: <LazyScreen component={ScreeningCentrePage} />,
  },
];

export const screeningCentreNavItems: AdminNavItem[] = [
  {
    path: "/screening-centre",
    label: "Screening Centre",
  },
];

export const screeningCentreRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/screening-centre",
    title: "Screening Centre",
    breadcrumb: "Configuration / Screening Centre",
  },
];
