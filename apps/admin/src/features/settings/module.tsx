import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const SettingsPage = lazy(() => import("./pages/SettingsPage"));

export const settingsRoutes: AdminRouteConfig[] = [
  {
    path: "/settings",
    element: <LazyScreen component={SettingsPage} />,
  },
];

export const settingsNavItems: AdminNavItem[] = [
  {
    path: "/settings",
    label: "Settings",
  },
];

export const settingsRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/settings",
    title: "Settings",
    breadcrumb: "Configuration / Settings",
  },
];
