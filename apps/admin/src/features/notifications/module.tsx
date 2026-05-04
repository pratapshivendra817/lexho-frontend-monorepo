import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const NotificationDetailsPage = lazy(() => import("./pages/NotificationDetailsPage"));

export const notificationsRoutes: AdminRouteConfig[] = [
  {
    path: "/notifications",
    children: [
      {
        index: true,
        element: <LazyScreen component={NotificationsPage} />,
      },
      {
        path: ":id",
        element: <LazyScreen component={NotificationDetailsPage} />,
      },
    ],
  },
];

export const notificationsNavItems: AdminNavItem[] = [
  {
    path: "/notifications",
    label: "Notifications",
  },
];

export const notificationsRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/notifications/",
    title: "Notification Details",
    breadcrumb: "Communication / Notifications / Details",
  },
  {
    pathPrefix: "/notifications",
    title: "Notification Center",
    breadcrumb: "Communication / Notifications",
  },
];
