/* eslint-disable react-refresh/only-export-components */
import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const CookFamilySizesPage = lazy(() => import("./pages/CookFamilySizesPage"));

export const cookFamilySizesRoutes: AdminRouteConfig[] = [
  {
    path: "/cook-family-sizes",
    element: <LazyScreen component={CookFamilySizesPage} />,
  },
];

export const cookFamilySizesNavItems: AdminNavItem[] = [
  {
    path: "/cook-family-sizes",
    label: "Cook Family Sizes",
  },
];

export const cookFamilySizesRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/cook-family-sizes",
    title: "Cook Family Sizes",
    breadcrumb: "catalog / cook family sizes",
  },
];
