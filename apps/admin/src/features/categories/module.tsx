import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));

export const categoriesRoutes: AdminRouteConfig[] = [
  {
    path: "/categories",
    element: <LazyScreen component={CategoriesPage} />,
  },
];

export const categoriesNavItems: AdminNavItem[] = [
  {
    path: "/categories",
    label: "Categories",
  },
];

export const categoriesRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/categories",
    title: "Categories",
    breadcrumb: "catalog / categories",
  },
];
